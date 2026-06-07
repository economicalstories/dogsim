// =========================================================================
//  Puppy World — game logic module.
//
//  THREE is injected as a parameter so the same code runs in the browser
//  (real three.js via importmap) and can be unit-tested headlessly with a
//  lightweight mock. index.html calls createGame(THREE).startScreen().
// =========================================================================
export function createGame(THREE){

/* =========================================================================
   Puppy World — a cute 3D open-world dog simulator for mobile.
   Collect bones, befriend kittens, then sleep in your house to start again.
   ========================================================================= */

// ---------- Config ----------
const WORLD = 110;          // half-size of the playable ground
const NUM_BONES = 8;
const NUM_CATS = 5;
const NUM_AI_DOGS = 7;
const NUM_TREES = 34;
const NUM_HOUSES = 4;

const DOG_COLORS = [
  { name: 'Goldie',  body: 0xf2b85c, belly: 0xffe2a8 },
  { name: 'Brownie', body: 0x9c6b3f, belly: 0xe8c79c },
  { name: 'Snowy',   body: 0xf7f3ec, belly: 0xffffff },
  { name: 'Pinky',   body: 0xff9ecb, belly: 0xffd6ea },
  { name: 'Spot',    body: 0x5b5b5b, belly: 0xdddddd },
  { name: 'Skye',    body: 0x9ad0ff, belly: 0xd6efff },
];
let chosenColor = 0;

// ---------- Globals ----------
let scene, camera, renderer, clock;
let elapsed = 0;   // total game time, advanced by step(dt); test-friendly
let player, playerHouse;
const bones = [];
const cats = [];
const aiDogs = [];
const houses = [];
const sparkles = [];
const butterflies = [];
let bonesCollected = 0;
let catsCollected = 0;
let score = 0;
let bestScore = loadBest();
let needsSleep = false;
let sleeping = false;
let started = false;

const tmpV = new THREE.Vector3();

// ---------- Audio (simple, gesture-unlocked) ----------
let audioCtx = null;
function unlockAudio(){ if(!audioCtx){ try{ audioCtx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } }
function beep(freq, dur=0.12, type='sine', vol=0.18){
  if(!audioCtx) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = type; osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
  osc.connect(g); g.connect(audioCtx.destination);
  osc.start(t); osc.stop(t+dur);
}
function chime(){ beep(660,0.10,'sine',0.2); setTimeout(()=>beep(880,0.12,'sine',0.2),90); setTimeout(()=>beep(1320,0.16,'sine',0.18),200); }
function bark(){ beep(420,0.09,'square',0.12); setTimeout(()=>beep(300,0.12,'square',0.12),90); }
function meow(){ beep(700,0.14,'triangle',0.14); setTimeout(()=>beep(520,0.18,'triangle',0.12),120); }
function sleepSound(){ beep(300,0.3,'sine',0.15); setTimeout(()=>beep(220,0.5,'sine',0.13),250); }

// =========================================================================
//  Dog model — built from simple shapes so it works everywhere, no assets.
// =========================================================================
function makeMat(color){ return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.0 }); }

function buildDog(bodyColor, bellyColor, collarColor){
  const dog = new THREE.Group();
  const body = makeMat(bodyColor);
  const belly = makeMat(bellyColor);
  const dark = makeMat(0x3a2a1a);

  // Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 1.9), body);
  torso.position.y = 1.0; torso.castShadow = true;
  // round it a touch
  const back = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 10), body);
  back.position.set(0, 1.05, -0.85); back.scale.set(1.0,0.95,1.0); back.castShadow = true;
  // belly patch
  const bel = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 1.5), belly);
  bel.position.set(0, 0.72, 0.05);
  dog.add(torso, back, bel);

  // Head group (front of dog faces +Z)
  const head = new THREE.Group();
  head.position.set(0, 1.45, 1.05);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.62, 14, 12), body);
  skull.castShadow = true;
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.42, 0.55), belly);
  snout.position.set(0, -0.12, 0.5);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), dark);
  nose.position.set(0, -0.02, 0.82);
  // eyes
  const eyeGeo = new THREE.SphereGeometry(0.1, 10, 8);
  const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
  const pupil = new THREE.SphereGeometry(0.06, 8, 6);
  const lEye = new THREE.Mesh(eyeGeo, eyeWhite); lEye.position.set(-0.24, 0.16, 0.42);
  const rEye = new THREE.Mesh(eyeGeo, eyeWhite); rEye.position.set(0.24, 0.16, 0.42);
  const lPup = new THREE.Mesh(pupil, dark); lPup.position.set(-0.24, 0.16, 0.50);
  const rPup = new THREE.Mesh(pupil, dark); rPup.position.set(0.24, 0.16, 0.50);
  // ears (floppy)
  const earGeo = new THREE.BoxGeometry(0.22, 0.55, 0.32);
  const lEar = new THREE.Mesh(earGeo, makeMat(new THREE.Color(bodyColor).multiplyScalar(0.8).getHex()));
  lEar.position.set(-0.55, 0.12, -0.05); lEar.rotation.z = 0.4; lEar.castShadow = true;
  const rEar = new THREE.Mesh(earGeo, makeMat(new THREE.Color(bodyColor).multiplyScalar(0.8).getHex()));
  rEar.position.set(0.55, 0.12, -0.05); rEar.rotation.z = -0.4; rEar.castShadow = true;
  head.add(skull, snout, nose, lEye, rEye, lPup, rPup, lEar, rEar);
  dog.add(head);
  dog.userData.head = head;

  // Collar
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.1, 8, 20), makeMat(collarColor));
  collar.position.set(0, 1.25, 0.78); collar.rotation.x = Math.PI/2.2;
  dog.add(collar);

  // Legs
  const legGeo = new THREE.BoxGeometry(0.26, 0.7, 0.26);
  const legMat = makeMat(new THREE.Color(bodyColor).multiplyScalar(0.9).getHex());
  const legs = [];
  const legPos = [[-0.38,0.55,0.62],[0.38,0.55,0.62],[-0.38,0.55,-0.62],[0.38,0.55,-0.62]];
  for(const p of legPos){
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(p[0], p[1], p[2]); leg.castShadow = true;
    leg.userData.baseZ = p[2];
    dog.add(leg); legs.push(leg);
  }
  dog.userData.legs = legs;

  // Tail
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.8), body);
  tail.position.set(0, 1.35, -1.05); tail.castShadow = true;
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 1.35, -0.85);
  tail.position.set(0, 0, -0.4);
  tailPivot.add(tail);
  dog.add(tailPivot);
  dog.userData.tail = tailPivot;

  dog.userData.walkPhase = Math.random()*Math.PI*2;
  return dog;
}

// =========================================================================
//  Cat model
// =========================================================================
function buildCat(color){
  const cat = new THREE.Group();
  const mat = makeMat(color);
  const dark = makeMat(0x222222);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.5, 6, 12), mat);
  body.rotation.x = Math.PI/2; body.position.y = 0.5; body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), mat);
  head.position.set(0, 0.65, 0.5); head.castShadow = true;
  const earGeo = new THREE.ConeGeometry(0.13, 0.26, 4);
  const lEar = new THREE.Mesh(earGeo, mat); lEar.position.set(-0.16,0.92,0.5);
  const rEar = new THREE.Mesh(earGeo, mat); rEar.position.set(0.16,0.92,0.5);
  const eyeGeo = new THREE.SphereGeometry(0.06,8,6);
  const lEye = new THREE.Mesh(eyeGeo, dark); lEye.position.set(-0.12,0.7,0.78);
  const rEye = new THREE.Mesh(eyeGeo, dark); rEye.position.set(0.12,0.7,0.78);
  const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.07,0.6,4,8), mat);
  tail.position.set(0,0.7,-0.6); tail.rotation.x = -0.6;
  const tailPivot = new THREE.Group(); tailPivot.position.set(0,0.55,-0.45); tail.position.set(0,0.15,-0.2);
  tailPivot.add(tail);
  cat.add(body, head, lEar, rEar, lEye, rEye, tailPivot);
  cat.userData.tail = tailPivot;
  cat.userData.walkPhase = Math.random()*6.28;
  cat.scale.setScalar(0.85);
  return cat;
}

// =========================================================================
//  Bone model
// =========================================================================
function buildBone(){
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xfff6e0, roughness: 0.6 });
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,0.7,8), mat);
  bar.rotation.z = Math.PI/2;
  g.add(bar);
  const knobGeo = new THREE.SphereGeometry(0.17,8,6);
  for(const [x,z] of [[-0.38,0.16],[-0.38,-0.16],[0.38,0.16],[0.38,-0.16]]){
    const k = new THREE.Mesh(knobGeo, mat); k.position.set(x,0,z); g.add(k);
  }
  g.traverse(o=>{ if(o.isMesh) o.castShadow = true; });

  // Glowing beacon so bones are easy to spot from across the world.
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.4, 7, 10, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.28, side: THREE.DoubleSide })
  );
  beam.position.y = 3.2;
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.6, 0.07, 8, 20),
    new THREE.MeshBasicMaterial({ color: 0xfff2a0 })
  );
  ring.rotation.x = Math.PI/2; ring.position.y = 1.4;
  g.add(beam, ring);
  g.userData.beam = beam; g.userData.ring = ring;
  g.scale.setScalar(1.0);
  return g;
}

// =========================================================================
//  Dog house
// =========================================================================
function buildHouse(color){
  const h = new THREE.Group();
  const wallMat = makeMat(color);
  const roofMat = makeMat(new THREE.Color(color).multiplyScalar(0.6).getHex());
  const base = new THREE.Mesh(new THREE.BoxGeometry(3, 2.2, 3), wallMat);
  base.position.y = 1.1; base.castShadow = true; base.receiveShadow = true;
  // doorway
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.5, 0.2), makeMat(0x2a1a10));
  door.position.set(0, 0.85, 1.5);
  // roof
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.6, 4), roofMat);
  roof.position.y = 3.0; roof.rotation.y = Math.PI/4; roof.castShadow = true;
  h.add(base, door, roof);
  return h;
}

// =========================================================================
//  Scenery: trees, flowers, clouds, butterflies
// =========================================================================
function buildTree(){
  const t = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.5,2.2,8), makeMat(0x8a5a2b));
  trunk.position.y = 1.1; trunk.castShadow = true;
  const greens = [0x6fcf6f, 0x57c257, 0x84d984];
  for(let i=0;i<3;i++){
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(1.1+Math.random()*0.4, 10, 8),
      makeMat(greens[i%greens.length]));
    leaf.position.set((Math.random()-0.5)*0.8, 2.6+i*0.5, (Math.random()-0.5)*0.8);
    leaf.castShadow = true; t.add(leaf);
  }
  t.add(trunk);
  return t;
}
function buildFlower(){
  const f = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,0.5,5), makeMat(0x4caf50));
  stem.position.y = 0.25;
  const colors = [0xff6fae,0xffd54f,0xff8a65,0xba68c8,0xffffff];
  const petalMat = makeMat(colors[Math.floor(Math.random()*colors.length)]);
  const center = new THREE.Mesh(new THREE.SphereGeometry(0.12,8,6), makeMat(0xffe082));
  center.position.y = 0.55;
  f.add(stem, center);
  for(let i=0;i<5;i++){
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.1,6,5), petalMat);
    const a = i/5*Math.PI*2;
    p.position.set(Math.cos(a)*0.18, 0.55, Math.sin(a)*0.18);
    f.add(p);
  }
  return f;
}
function buildCloud(){
  const c = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color:0xffffff, roughness:1, transparent:true, opacity:0.95 });
  for(let i=0;i<4;i++){
    const puff = new THREE.Mesh(new THREE.SphereGeometry(1.4+Math.random(),10,8), m);
    puff.position.set(i*1.6-2.4 + (Math.random()-0.5), (Math.random()-0.5)*0.6, (Math.random()-0.5));
    c.add(puff);
  }
  return c;
}
function buildButterfly(){
  const b = new THREE.Group();
  const colors = [0xff7ab6, 0xffd54f, 0x9ad0ff, 0xba68c8, 0xff8a65];
  const m = new THREE.MeshStandardMaterial({ color: colors[Math.floor(Math.random()*colors.length)], side: THREE.DoubleSide, roughness: 0.6 });
  const wingGeo = new THREE.SphereGeometry(0.28, 8, 6);
  const lWing = new THREE.Mesh(wingGeo, m); lWing.scale.set(1, 0.15, 0.7); lWing.position.x = -0.22;
  const rWing = new THREE.Mesh(wingGeo, m); rWing.scale.set(1, 0.15, 0.7); rWing.position.x = 0.22;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,0.4,5), makeMat(0x333333));
  body.rotation.z = Math.PI/2;
  b.add(lWing, rWing, body);
  b.userData.lWing = lWing; b.userData.rWing = rWing;
  b.userData.phase = Math.random()*6.28;
  b.userData.center = randPos(8);
  b.userData.radius = rand(3, 8);
  b.userData.speed = rand(0.4, 1.0);
  b.userData.height = rand(1.5, 3.5);
  return b;
}

// =========================================================================
//  Sparkle / heart particles on collect
// =========================================================================
function spawnSparkles(pos, color=0xfff0a0, count=14){
  for(let i=0;i<count;i++){
    const s = new THREE.Mesh(
      new THREE.SphereGeometry(0.12,6,5),
      new THREE.MeshBasicMaterial({ color })
    );
    s.position.copy(pos);
    s.userData.vel = new THREE.Vector3((Math.random()-0.5)*4, Math.random()*5+2, (Math.random()-0.5)*4);
    s.userData.life = 1.0;
    scene.add(s); sparkles.push(s);
  }
}

// =========================================================================
//  World setup
// =========================================================================
function rand(min,max){ return min + Math.random()*(max-min); }
function randPos(margin=8){ return new THREE.Vector3(rand(-WORLD+margin, WORLD-margin), 0, rand(-WORLD+margin, WORLD-margin)); }

function init(){
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8fd6ff);
  scene.fog = new THREE.Fog(0x8fd6ff, 70, 180);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 400);
  camera.position.set(0, 8, -10);

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('game').appendChild(renderer.domElement);

  // Lights
  const hemi = new THREE.HemisphereLight(0xbfe9ff, 0x6fae5a, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff4d6, 1.1);
  sun.position.set(40, 60, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left=-60; sc.right=60; sc.top=60; sc.bottom=-60; sc.near=1; sc.far=200;
  scene.add(sun);

  // Sun ball in sky
  const sunBall = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xfff2a0 }));
  sunBall.position.set(60, 70, -80);
  scene.add(sunBall);

  // Ground
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x84d36a, roughness: 1 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD*2, WORLD*2, 1, 1), groundMat);
  ground.rotation.x = -Math.PI/2; ground.receiveShadow = true;
  scene.add(ground);

  // A few patches of lighter grass for variety
  for(let i=0;i<10;i++){
    const patch = new THREE.Mesh(new THREE.CircleGeometry(rand(5,12), 18),
      new THREE.MeshStandardMaterial({ color: 0x9adf78, roughness:1 }));
    patch.rotation.x = -Math.PI/2;
    const p = randPos(6); patch.position.set(p.x, 0.02, p.z);
    scene.add(patch);
  }

  // Fence-ish border (simple posts) so the edge feels intentional
  const postMat = makeMat(0xcc9a5a);
  for(let x=-WORLD; x<=WORLD; x+=10){
    for(const z of [-WORLD, WORLD]){
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.25,0.25,2.4,6), postMat);
      post.position.set(x, 1.2, z); post.castShadow = true; scene.add(post);
    }
  }
  for(let z=-WORLD; z<=WORLD; z+=10){
    for(const x of [-WORLD, WORLD]){
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.25,0.25,2.4,6), postMat);
      post.position.set(x, 1.2, z); post.castShadow = true; scene.add(post);
    }
  }

  // Trees
  for(let i=0;i<NUM_TREES;i++){
    const t = buildTree();
    const p = randPos(6); t.position.set(p.x, 0, p.z);
    t.scale.setScalar(rand(0.8,1.4));
    scene.add(t);
  }
  // Flowers
  for(let i=0;i<120;i++){
    const f = buildFlower();
    const p = randPos(4); f.position.set(p.x, 0, p.z);
    f.scale.setScalar(rand(0.7,1.3));
    scene.add(f);
  }
  // Clouds
  for(let i=0;i<8;i++){
    const c = buildCloud();
    c.position.set(rand(-WORLD,WORLD), rand(28,42), rand(-WORLD,WORLD));
    c.userData.drift = rand(0.5,1.5);
    scene.add(c);
  }
  // Butterflies
  for(let i=0;i<14;i++){
    const bf = buildButterfly();
    scene.add(bf); butterflies.push(bf);
  }

  // Houses (one per dog vibe; first is the player's)
  const houseColors = [0xff9ecb, 0x9ad0ff, 0xffd36b, 0xb39ddb];
  for(let i=0;i<NUM_HOUSES;i++){
    const h = buildHouse(houseColors[i%houseColors.length]);
    const angle = i/NUM_HOUSES * Math.PI*2;
    h.position.set(Math.cos(angle)*WORLD*0.55, 0, Math.sin(angle)*WORLD*0.55);
    h.rotation.y = -angle + Math.PI/2;
    scene.add(h); houses.push(h);
  }
  playerHouse = houses[0];
  // marker arrow over player's house
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.6,1.2,4),
    new THREE.MeshStandardMaterial({ color:0xff4081, emissive:0x661133 }));
  arrow.rotation.x = Math.PI; arrow.position.y = 5.4;
  arrow.userData.spin = true;
  playerHouse.add(arrow);
  playerHouse.userData.arrow = arrow;

  // Player dog
  const dc = DOG_COLORS[chosenColor];
  player = buildDog(dc.body, dc.belly, 0xff3d7f);
  player.position.copy(playerHouse.position);
  player.position.z += 4;
  scene.add(player);

  // AI dogs
  for(let i=0;i<NUM_AI_DOGS;i++){
    const c = DOG_COLORS[(i+1)%DOG_COLORS.length];
    const d = buildDog(c.body, c.belly, [0x66bb6a,0x42a5f5,0xffa726,0xab47bc][i%4]);
    const p = randPos(10); d.position.set(p.x,0,p.z);
    d.userData.target = randPos(10);
    d.userData.speed = rand(4,7);
    d.userData.wait = 0;
    scene.add(d); aiDogs.push(d);
  }

  // Cats
  const catColors = [0xff8a65, 0x9e9e9e, 0xfff3e0, 0x4e342e, 0xffcc80];
  for(let i=0;i<NUM_CATS;i++){
    const cat = buildCat(catColors[i%catColors.length]);
    const p = randPos(12); cat.position.set(p.x,0,p.z);
    cat.userData.target = randPos(10);
    cat.userData.speed = rand(3,5);
    cat.userData.following = false;
    cat.userData.followIndex = 0;
    scene.add(cat); cats.push(cat);
  }

  spawnBones();
  updateHUD();

  clock = new THREE.Clock();
  window.addEventListener('resize', onResize);
  setupControls();
  animate();
}

function spawnBones(){
  // remove existing
  for(const b of bones){ scene.remove(b); }
  bones.length = 0;
  for(let i=0;i<NUM_BONES;i++){
    const b = buildBone();
    const p = randPos(10); b.position.set(p.x, 1.2, p.z);
    b.userData.spin = rand(0.5,1.5);
    b.userData.bob = Math.random()*6.28;
    b.userData.collected = false;
    scene.add(b); bones.push(b);
  }
  bonesCollected = 0;
  needsSleep = false;
}

function onResize(){
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// =========================================================================
//  Controls — virtual joystick + buttons + keyboard
// =========================================================================
const input = { x: 0, y: 0, active: false };
const keys = {};

function setupControls(){
  const zone = document.getElementById('joyZone');
  const base = document.getElementById('joyBase');
  const knob = document.getElementById('joyKnob');
  let joyId = null, cx=0, cy=0;
  const R = 60;

  function start(e){
    const t = e.changedTouches ? e.changedTouches[0] : e;
    joyId = e.changedTouches ? t.identifier : 'mouse';
    cx = t.clientX; cy = t.clientY;
    base.style.left = cx+'px'; base.style.top = cy+'px';
    knob.style.left = cx+'px'; knob.style.top = cy+'px';
    base.style.display = 'block'; knob.style.display='block';
    input.active = true;
    unlockAudio();
    e.preventDefault();
  }
  function move(e){
    if(!input.active) return;
    let t = null;
    if(e.changedTouches){
      for(const tt of e.changedTouches){ if(tt.identifier===joyId){ t=tt; break; } }
      if(!t) return;
    } else { t = e; }
    let dx = t.clientX - cx, dy = t.clientY - cy;
    const d = Math.hypot(dx,dy);
    if(d > R){ dx = dx/d*R; dy = dy/d*R; }
    knob.style.left = (cx+dx)+'px'; knob.style.top = (cy+dy)+'px';
    input.x = dx/R; input.y = dy/R;
    e.preventDefault();
  }
  function end(e){
    if(e.changedTouches){
      let found=false;
      for(const tt of e.changedTouches){ if(tt.identifier===joyId){ found=true; break; } }
      if(!found) return;
    }
    input.active=false; input.x=0; input.y=0;
    base.style.display='none'; knob.style.display='none';
  }

  zone.addEventListener('touchstart', start, {passive:false});
  zone.addEventListener('touchmove', move, {passive:false});
  zone.addEventListener('touchend', end);
  zone.addEventListener('touchcancel', end);
  zone.addEventListener('mousedown', start);
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', end);

  // Buttons
  const jumpBtn = document.getElementById('jumpBtn');
  const barkBtn = document.getElementById('barkBtn');
  const doJump = (e)=>{ e.preventDefault(); unlockAudio(); playerJump(); };
  const doBark = (e)=>{ e.preventDefault(); unlockAudio(); bark(); player.userData.barkTime = 0.3; spawnSparkles(tmpV.copy(player.position).add(new THREE.Vector3(0,2,1)), 0xffffff, 6); };
  jumpBtn.addEventListener('touchstart', doJump, {passive:false});
  jumpBtn.addEventListener('mousedown', doJump);
  barkBtn.addEventListener('touchstart', doBark, {passive:false});
  barkBtn.addEventListener('mousedown', doBark);

  // Keyboard (desktop testing)
  window.addEventListener('keydown', e=>{
    keys[e.key.toLowerCase()] = true;
    if(e.key===' ') { playerJump(); }
    if(e.key.toLowerCase()==='b'){ unlockAudio(); bark(); }
  });
  window.addEventListener('keyup', e=>{ keys[e.key.toLowerCase()] = false; });
}

let playerVelY = 0;
let playerY = 0;
function playerJump(){
  if(playerY <= 0.01){ playerVelY = 9; bark(); }
}

// =========================================================================
//  HUD + banners
// =========================================================================
function updateHUD(){
  document.getElementById('boneText').textContent = bonesCollected + ' / ' + NUM_BONES;
  document.getElementById('catText').textContent = catsCollected;
  document.getElementById('scoreText').textContent = score;
  saveBest();
  const bt = document.getElementById('bestText');
  if(bt) bt.textContent = bestScore;
}

// ---- High score (persists in the browser between visits) ----
function loadBest(){
  try { return parseInt(window.localStorage.getItem('puppyWorldBest')) || 0; }
  catch(e){ return 0; }
}
function saveBest(){
  if(score > bestScore){
    bestScore = score;
    try { window.localStorage.setItem('puppyWorldBest', String(bestScore)); } catch(e){}
  }
}
let bannerTimer = 0;
function showBanner(text, time=2.2){
  const b = document.getElementById('banner');
  b.innerHTML = text; b.classList.add('show'); bannerTimer = time;
}

// =========================================================================
//  Animation loop
// =========================================================================
const camTarget = new THREE.Vector3();
const camPos = new THREE.Vector3();

function animate(){
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  step(dt);
  renderer.render(scene, camera);
}

// One simulation step. Separated from animate() so headless tests can drive
// the game forward without a render loop or a real clock.
function step(dt){
  elapsed += dt;
  const t = elapsed;

  if(bannerTimer > 0){ bannerTimer -= dt; if(bannerTimer<=0) document.getElementById('banner').classList.remove('show'); }

  if(!sleeping) updatePlayer(dt);
  updateAIDogs(dt, t);
  updateCats(dt, t);
  updateBones(dt, t);
  updateSparkles(dt);
  updateClouds(dt);
  updateButterflies(dt, t);

  // spin house arrow when player needs to sleep
  if(playerHouse.userData.arrow){
    playerHouse.userData.arrow.visible = needsSleep;
    if(needsSleep){
      playerHouse.userData.arrow.rotation.y += dt*3;
      playerHouse.userData.arrow.position.y = 5.2 + Math.sin(t*4)*0.3;
    }
  }

  updateCamera(dt);
}

function updatePlayer(dt){
  // direction from joystick relative to camera facing
  let ix = input.x, iy = input.y;
  if(keys['arrowup']||keys['w']) iy = -1;
  if(keys['arrowdown']||keys['s']) iy = 1;
  if(keys['arrowleft']||keys['a']) ix = -1;
  if(keys['arrowright']||keys['d']) ix = 1;

  const mag = Math.hypot(ix, iy);
  const moving = mag > 0.12;

  // camera-relative movement: forward is where camera looks (xz)
  if(moving){
    // camera forward on ground
    camera.getWorldDirection(tmpV);
    tmpV.y = 0; tmpV.normalize();
    const right = new THREE.Vector3().crossVectors(tmpV, new THREE.Vector3(0,1,0)).normalize();
    const moveDir = new THREE.Vector3();
    moveDir.addScaledVector(tmpV, -iy);   // push up = forward
    moveDir.addScaledVector(right, ix);
    moveDir.y = 0;
    if(moveDir.lengthSq() > 0.0001){
      moveDir.normalize();
      const speed = 11 * Math.min(mag,1);
      player.position.addScaledVector(moveDir, speed*dt);
      // face movement
      const targetRot = Math.atan2(moveDir.x, moveDir.z);
      player.rotation.y = lerpAngle(player.rotation.y, targetRot, 0.2);
    }
  }

  // bounds
  const lim = WORLD - 3;
  player.position.x = Math.max(-lim, Math.min(lim, player.position.x));
  player.position.z = Math.max(-lim, Math.min(lim, player.position.z));

  // jump / gravity
  playerVelY -= 26*dt;
  playerY += playerVelY*dt;
  if(playerY < 0){ playerY = 0; playerVelY = 0; }
  player.position.y = playerY;

  // walk animation
  animateDogLegs(player, moving, dt);

  // tail wag (faster when moving / happy)
  const wag = moving ? 14 : 6;
  player.userData.tail.rotation.y = Math.sin(elapsed*wag)*0.5;
  // bark head bob
  if(player.userData.barkTime>0){ player.userData.barkTime-=dt; player.userData.head.rotation.x = -0.2; }
  else player.userData.head.rotation.x = lerpVal(player.userData.head.rotation.x, 0, 0.2);

  checkCollect();
}

function animateDogLegs(dog, moving, dt){
  const legs = dog.userData.legs;
  if(!legs) return;
  if(moving){
    dog.userData.walkPhase += dt*14;
    const ph = dog.userData.walkPhase;
    legs[0].rotation.x = Math.sin(ph)*0.6;
    legs[1].rotation.x = Math.sin(ph+Math.PI)*0.6;
    legs[2].rotation.x = Math.sin(ph+Math.PI)*0.6;
    legs[3].rotation.x = Math.sin(ph)*0.6;
    // little bounce
    dog.position.y = (dog===player? playerY:0) + Math.abs(Math.sin(ph))*0.08;
  } else {
    for(const l of legs) l.rotation.x = lerpVal(l.rotation.x, 0, 0.2);
  }
}

function updateAIDogs(dt, t){
  for(const d of aiDogs){
    let moving = true;
    if(d.userData.wait>0){ d.userData.wait-=dt; moving=false; }
    else {
      tmpV.copy(d.userData.target).sub(d.position); tmpV.y=0;
      const dist = tmpV.length();
      if(dist < 1.5){
        d.userData.target = randPos(10);
        if(Math.random()<0.4) d.userData.wait = rand(0.5,2);
      } else {
        tmpV.normalize();
        d.position.addScaledVector(tmpV, d.userData.speed*dt);
        d.rotation.y = lerpAngle(d.rotation.y, Math.atan2(tmpV.x,tmpV.z), 0.15);
      }
    }
    animateDogLegs(d, moving, dt);
    d.userData.tail.rotation.y = Math.sin(t*10 + d.userData.walkPhase)*0.5;
  }
}

function updateCats(dt, t){
  let followOrder = 0;
  for(const cat of cats){
    if(cat.userData.following){
      followOrder++;
      // follow behind player in a conga line
      const behind = new THREE.Vector3(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0), player.rotation.y);
      const targetPos = tmpV.copy(player.position).addScaledVector(behind, 2.2 + followOrder*1.6);
      const to = targetPos.clone().sub(cat.position); to.y=0;
      const dist = to.length();
      if(dist > 0.4){
        to.normalize();
        cat.position.addScaledVector(to, Math.min(13, dist*4)*dt);
        cat.rotation.y = lerpAngle(cat.rotation.y, Math.atan2(to.x,to.z), 0.2);
      }
      cat.userData.tail.rotation.z = Math.sin(t*12)*0.4;
      cat.position.y = Math.abs(Math.sin(t*10+followOrder))*0.12;
    } else {
      // wander
      tmpV.copy(cat.userData.target).sub(cat.position); tmpV.y=0;
      if(tmpV.length() < 1.2){ cat.userData.target = randPos(10); }
      else {
        tmpV.normalize();
        cat.position.addScaledVector(tmpV, cat.userData.speed*dt);
        cat.rotation.y = lerpAngle(cat.rotation.y, Math.atan2(tmpV.x,tmpV.z), 0.15);
      }
      cat.userData.tail.rotation.z = Math.sin(t*6)*0.3;
      // collect on touch
      if(!sleeping && cat.position.distanceTo(player.position) < 2.2){
        cat.userData.following = true;
        catsCollected++;
        updateHUD();
        meow();
        spawnSparkles(tmpV.copy(cat.position).setY(1.2), 0xff8ac2, 12);
        showBanner('🐱 A kitten joined you! 💕', 1.6);
      }
    }
  }
}

function updateBones(dt, t){
  for(const b of bones){
    if(b.userData.collected) continue;
    b.rotation.y += b.userData.spin*dt*2;
    b.position.y = 1.2 + Math.sin(t*3 + b.userData.bob)*0.2;
    if(b.userData.beam) b.userData.beam.material.opacity = 0.22 + Math.sin(t*4 + b.userData.bob)*0.12;
    if(b.userData.ring) b.userData.ring.scale.setScalar(1 + Math.sin(t*4 + b.userData.bob)*0.12);
  }
}

function checkCollect(){
  if(sleeping) return;
  for(const b of bones){
    if(b.userData.collected) continue;
    if(b.position.distanceTo(player.position) < 2.0){
      b.userData.collected = true;
      b.visible = false;
      bonesCollected++;
      score += 10;
      chime();
      spawnSparkles(tmpV.copy(b.position), 0xffe066, 16);
      updateHUD();
      if(bonesCollected >= NUM_BONES){
        needsSleep = true;
        showBanner('🎉 You got ALL the bones!<br>Go sleep in your 🏠 house!', 3.2);
      } else {
        showBanner('🦴 +10! Yummy!', 1.0);
      }
    }
  }
  // sleeping in house
  if(needsSleep && !sleeping){
    if(player.position.distanceTo(playerHouse.position) < 4.5){
      goToSleep();
    }
  }
}

function goToSleep(){
  sleeping = true;
  needsSleep = false;
  sleepSound();
  showBanner('😴 Goodnight puppy… Zzz', 2.8);
  // Zzz particles
  let zc = 0;
  const zzz = setInterval(()=>{
    const z = new THREE.Mesh(
      new THREE.SphereGeometry(0.18,6,5),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    z.position.copy(playerHouse.position).add(new THREE.Vector3(0.5,3.4,0));
    z.userData.vel = new THREE.Vector3(0.4, 1.6, 0);
    z.userData.life = 1.5;
    scene.add(z); sparkles.push(z);
    zc++; if(zc>5) clearInterval(zzz);
  }, 300);

  setTimeout(wakeUp, 2800);
}

// Wake up after sleeping: new round, bones respawn, bonus points.
function wakeUp(){
  if(!sleeping) return;
  sleeping = false;
  score += 50;
  spawnBones();
  // move player out of house
  player.position.copy(playerHouse.position); player.position.z += 5;
  updateHUD();
  showBanner('🌞 Good morning!<br>New bones to find! 🦴', 2.6);
  chime();
}

function updateSparkles(dt){
  for(let i=sparkles.length-1;i>=0;i--){
    const s = sparkles[i];
    s.userData.life -= dt;
    s.userData.vel.y -= 9*dt;
    s.position.addScaledVector(s.userData.vel, dt);
    s.scale.setScalar(Math.max(0.01, s.userData.life));
    if(s.userData.life <= 0){ scene.remove(s); sparkles.splice(i,1); }
  }
}

function updateClouds(dt){
  scene.traverse(o=>{
    if(o.userData && o.userData.drift){
      o.position.x += o.userData.drift*dt;
      if(o.position.x > WORLD+20) o.position.x = -WORLD-20;
    }
  });
}

function updateButterflies(dt, t){
  for(const bf of butterflies){
    const u = bf.userData;
    const a = t*u.speed + u.phase;
    bf.position.set(
      u.center.x + Math.cos(a)*u.radius,
      u.height + Math.sin(t*3 + u.phase)*0.5,
      u.center.z + Math.sin(a)*u.radius
    );
    bf.rotation.y = -a + Math.PI/2;
    const flap = Math.sin(t*18 + u.phase)*0.9;
    u.lWing.rotation.y = flap; u.rWing.rotation.y = -flap;
  }
}

function updateCamera(dt){
  // third-person follow camera, behind the dog
  const back = new THREE.Vector3(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0), player.rotation.y);
  camPos.copy(player.position).addScaledVector(back, -10).add(new THREE.Vector3(0, 7, 0));
  camera.position.lerp(camPos, 1 - Math.pow(0.001, dt));
  camTarget.copy(player.position).add(new THREE.Vector3(0, 2, 0));
  camera.lookAt(camTarget);
}

// ---------- math helpers ----------
function lerpVal(a,b,t){ return a + (b-a)*t; }
function lerpAngle(a,b,t){
  let d = b - a;
  while(d > Math.PI) d -= Math.PI*2;
  while(d < -Math.PI) d += Math.PI*2;
  return a + d*t;
}

// =========================================================================
//  Start screen
// =========================================================================
function buildStartScreen(){
  const bestStart = document.getElementById('bestStart');
  if(bestStart) bestStart.textContent = bestScore > 0 ? ('🏆 Best score: ' + bestScore) : '';
  const pick = document.getElementById('dogPick');
  DOG_COLORS.forEach((c, i)=>{
    const sw = document.createElement('div');
    sw.className = 'dogSwatch' + (i===chosenColor?' sel':'');
    sw.style.background = '#' + c.body.toString(16).padStart(6,'0');
    sw.title = c.name;
    sw.addEventListener('click', ()=>{
      chosenColor = i;
      document.querySelectorAll('.dogSwatch').forEach(s=>s.classList.remove('sel'));
      sw.classList.add('sel');
    });
    pick.appendChild(sw);
  });

  document.getElementById('playBtn').addEventListener('click', ()=>{
    if(started) return;
    started = true;
    unlockAudio();
    document.getElementById('playBtn').classList.add('hidden');
    document.getElementById('loading').classList.remove('hidden');
    setTimeout(()=>{
      document.getElementById('start').classList.add('hidden');
      init();
      showBanner('🐾 Go collect all the bones! 🦴', 2.6);
    }, 60);
  });
}


  // ---- Public API (browser bootstrap + headless tests) ----
  return {
    startScreen: buildStartScreen,
    init,
    step,
    wakeUp,
    spawnBones,
    state: () => ({ bonesCollected, catsCollected, score, bestScore, needsSleep, sleeping, started }),
    refs:  () => ({ scene, camera, player, playerHouse, bones, cats, aiDogs, houses, sparkles, butterflies }),
    setInput: (x, y) => { input.x = x; input.y = y; input.active = !!(x || y); },
    setColor: (i) => { chosenColor = i; },
    config: { NUM_BONES, NUM_CATS, NUM_AI_DOGS, WORLD },
  };
}
