// =========================================================================
//  Headless gameplay tests for Puppy World.
//  Runs the real game.js logic against a mock three.js + DOM and verifies
//  the core rules: collect bones -> sleep in house -> respawn, cats follow,
//  movement & bounds, and long-run stability (no exceptions).
//
//  Run:  node test/game.test.mjs
// =========================================================================
import assert from 'node:assert';
import { installDom } from './dom-mock.mjs';
import { THREE } from './three-mock.mjs';

installDom();
const { createGame } = await import('../game.js');

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); console.log('  ✅ ' + name); pass++; }
  catch (e) { console.log('  ❌ ' + name + '\n      ' + (e && e.message)); fail++; }
}

// Advance the simulation by N frames of dt seconds.
function run(game, frames, dt = 0.016) { for (let i = 0; i < frames; i++) game.step(dt); }

// Teleport player onto a target's x/z so the next step triggers a pickup.
function teleportTo(game, target) {
  const { player } = game.refs();
  player.position.x = target.position.x;
  player.position.z = target.position.z;
}

// ---------------------------------------------------------------------------
console.log('\nPuppy World — gameplay tests\n');

const game = createGame(THREE);
game.setColor(2);
game.init();
const { NUM_BONES, NUM_CATS, NUM_AI_DOGS } = game.config;

test('exposes a version string', () => {
  assert.ok(typeof game.config.VERSION === 'string' && game.config.VERSION.length > 0, 'has a version');
});

test('world builds with the right number of things', () => {
  const r = game.refs();
  assert.strictEqual(r.bones.length, NUM_BONES, 'bones');
  assert.strictEqual(r.cats.length, NUM_CATS, 'cats');
  assert.strictEqual(r.aiDogs.length, NUM_AI_DOGS, 'ai dogs');
  assert.ok(r.player, 'player exists');
  assert.ok(r.playerHouse, 'player house exists');
});

test('game starts with zero bones collected', () => {
  assert.strictEqual(game.state().bonesCollected, 0);
  assert.strictEqual(game.state().needsSleep, false);
});

test('walking onto a bone collects it (+10 score)', () => {
  const r = game.refs();
  const bone = r.bones.find(b => !b.userData.collected);
  const before = game.state();
  teleportTo(game, bone);
  game.step(0.016);
  const after = game.state();
  assert.strictEqual(after.bonesCollected, before.bonesCollected + 1, 'bone count up by 1');
  assert.strictEqual(after.score, before.score + 10, 'score up by 10');
  assert.strictEqual(bone.userData.collected, true, 'bone marked collected');
  assert.strictEqual(bone.visible, false, 'bone hidden');
});

test('collecting ALL bones triggers "go to sleep"', () => {
  const r = game.refs();
  // sweep up every remaining bone
  for (const bone of r.bones) {
    if (bone.userData.collected) continue;
    teleportTo(game, bone);
    game.step(0.016);
  }
  assert.strictEqual(game.state().bonesCollected, game.state().boneTarget, 'all bones collected');
  assert.strictEqual(game.state().needsSleep, true, 'needsSleep flag set');
});

test('reaching the house while needing sleep starts sleeping', () => {
  const r = game.refs();
  r.player.position.copy(r.playerHouse.position);
  game.step(0.016);
  assert.strictEqual(game.state().sleeping, true, 'puppy is now sleeping');
  assert.strictEqual(game.state().needsSleep, false, 'needsSleep cleared');
});

test('sleeping LEVELS UP, respawns bones, and grows the goal', () => {
  const before = game.state();
  game.wakeUp();
  const after = game.state();
  const r = game.refs();
  assert.strictEqual(after.sleeping, false, 'awake again');
  assert.strictEqual(after.level, before.level + 1, 'level went up');
  assert.strictEqual(after.bonesCollected, 0, 'bone counter reset');
  assert.ok(after.boneTarget >= before.boneTarget, 'goal grew (or held) with level');
  assert.strictEqual(r.bones.length, after.boneTarget, 'bones respawned to new target');
  assert.ok(r.bones.every(b => !b.userData.collected && b.visible), 'all bones fresh');
  assert.strictEqual(after.score, before.score + 50 * after.level, 'level-scaled bonus');
});

test('touching a kitten makes it follow you', () => {
  const r = game.refs();
  // park every other kitten far away so exactly one is in range
  for (const c of r.cats) { c.userData.following = false; c.position.set(500, 0, 500); }
  const cat = r.cats[0];
  const before = game.state().catsCollected;
  cat.position.copy(r.player.position);
  cat.position.x += 1.0; // within the 2.2 collect radius
  game.step(0.016);
  assert.strictEqual(cat.userData.following, true, 'kitten now following');
  assert.strictEqual(game.state().catsCollected, before + 1, 'cat counter up by exactly 1');
});

test('a helper arrow points toward the nearest bone (or the house at bedtime)', () => {
  const r = game.refs();
  r.player.position.set(0, 0, 0);
  game.setInput(0, 0);
  game.step(0.016);
  assert.ok(r.pointer, 'pointer exists');
  assert.strictEqual(r.pointer.visible, true, 'pointer is visible');
  // figure out what it SHOULD point at, given current state
  let target;
  if (game.state().needsSleep) {
    target = r.playerHouse.position;
  } else {
    let best = Infinity;
    for (const b of r.bones) {
      if (b.userData.collected) continue;
      const d = Math.hypot(b.position.x, b.position.z);
      if (d < best) { best = d; target = b.position; }
    }
  }
  const expected = Math.atan2(target.x, target.z);
  assert.ok(Math.abs(r.pointer.rotation.y - expected) < 1e-6, 'arrow aims at the target');
});

test('friendly dogs form a ring and never crowd/overlap the player', () => {
  const r = game.refs();
  r.player.position.set(0, 0, 0);
  game.setInput(0, 0);
  // drop a couple of dogs right on top of the player to test the bubble
  r.aiDogs[0].position.set(0.2, 0, 0);
  r.aiDogs[1].position.set(-0.1, 0, 0.1);
  run(game, 120);
  const gap = game.config.MIN_PLAYER_GAP - 0.1;
  for (const d of r.aiDogs) {
    const dist = Math.hypot(d.position.x - r.player.position.x, d.position.z - r.player.position.z);
    assert.ok(dist >= gap, `${d.userData.name} kept its distance (${dist.toFixed(2)})`);
  }
});

test('steering right turns the puppy toward camera-right (not inverted)', () => {
  const r = game.refs();
  r.player.position.set(0, 0, 0);
  game.setInput(0, 0);
  run(game, 25); // let the camera settle behind the puppy
  const start = r.player.position.clone();
  // camera forward (horizontal) = from camera toward the puppy
  const fwd = { x: r.player.position.x - r.camera.position.x, z: r.player.position.z - r.camera.position.z };
  const fl = Math.hypot(fwd.x, fwd.z); fwd.x /= fl; fwd.z /= fl;
  const camRight = { x: -fwd.z, z: fwd.x }; // cross(fwd, up)
  game.setInput(1, 0); // hold joystick right
  run(game, 50);       // dog leans into the turn and runs that way
  const dx = r.player.position.x - start.x, dz = r.player.position.z - start.z;
  const dot = dx * camRight.x + dz * camRight.z;
  assert.ok(dot > 0, 'puppy went to camera-right, not the wrong way (dot=' + dot.toFixed(2) + ')');
  game.setInput(0, 0);
});

test('steering is smooth: a tiny stick wiggle barely turns the puppy', () => {
  const r = game.refs();
  r.player.position.set(0, 0, 0);
  game.setInput(0, -1); // settle running straight forward
  run(game, 40);
  const before = r.player.rotation.y;
  // a tiny nudge inside the deadzone should NOT swing the heading around
  game.setInput(0.1, -0.02);
  run(game, 1);
  let d = Math.abs(r.player.rotation.y - before);
  while (d > Math.PI) d = Math.abs(d - 2 * Math.PI);
  assert.ok(d < 0.05, 'heading barely moved from a tiny wiggle (' + d.toFixed(3) + ' rad)');
  game.setInput(0, 0);
});

test('joystick input moves the puppy and bounds keep it in the yard', () => {
  const r = game.refs();
  r.player.position.set(0, 0, 0);
  // let the follow-camera settle behind the puppy first (it was elsewhere)
  game.setInput(0, 0);
  run(game, 25);
  const start = r.player.position.clone();
  game.setInput(0, -1); // push "up" = forward
  run(game, 90);
  const moved = r.player.position.distanceTo(start);
  assert.ok(moved > 3, 'puppy actually moved (' + moved.toFixed(2) + ')');
  game.setInput(0, 0);

  // Slam toward a corner for a long time; must stay inside the world.
  const W = game.config.WORLD;
  r.player.position.set(W, 0, W);
  game.setInput(1, -1);
  run(game, 200);
  game.setInput(0, 0);
  assert.ok(Math.abs(r.player.position.x) <= W, 'inside x bound');
  assert.ok(Math.abs(r.player.position.z) <= W, 'inside z bound');
});

test('best score tracks the highest score reached', () => {
  assert.ok(game.state().bestScore >= game.state().score, 'best >= current');
  assert.ok(game.state().bestScore > 0, 'best score recorded after collecting');
});

test('the world has fluttering butterflies', () => {
  const r = game.refs();
  assert.ok(r.butterflies.length >= 10, 'butterflies spawned');
  const bf = r.butterflies[0];
  const y0 = bf.position.y;
  run(game, 20);
  // wings flap & it moves along its path
  assert.ok(bf.position.y !== y0 || bf.userData.lWing.rotation.y !== 0, 'butterfly is animating');
});

test('every AI dog has a name and a personality', () => {
  const r = game.refs();
  for (const d of r.aiDogs) {
    assert.ok(typeof d.userData.name === 'string' && d.userData.name.length, 'has a name');
    assert.ok(['playful','bouncy','friendly','shy'].includes(d.userData.personality), 'valid personality');
  }
});

test('a friendly dog runs up to the player to play', () => {
  const r = game.refs();
  const dog = r.aiDogs.find(d => d.userData.personality !== 'shy');
  assert.ok(dog, 'a friendly dog exists');
  // place the player right next to it, dog idle, then run a few frames
  r.player.position.set(0, 0, 0);
  dog.position.set(8, 0, 0);
  const startDist = dog.position.distanceTo(r.player.position);
  game.setInput(0, 0);
  run(game, 60);
  const endDist = dog.position.distanceTo(r.player.position);
  assert.ok(endDist < startDist, 'dog moved closer (' + startDist.toFixed(1) + ' -> ' + endDist.toFixed(1) + ')');
  assert.ok(['approach','play'].includes(dog.userData.aiState), 'dog is approaching/playing, not ignoring you');
});

test('a shy dog keeps its distance', () => {
  const r = game.refs();
  const shy = r.aiDogs.find(d => d.userData.personality === 'shy');
  if (!shy) { assert.ok(true, 'no shy dog in this lineup'); return; }
  r.player.position.set(0, 0, 0);
  shy.position.set(5, 0, 0);
  const startDist = shy.position.distanceTo(r.player.position);
  run(game, 60);
  const endDist = shy.position.distanceTo(r.player.position);
  assert.ok(endDist >= startDist - 0.5, 'shy dog did not run into your arms');
});

test('runs 600 frames with AI dogs & cats without throwing', () => {
  run(game, 600);
  assert.ok(true);
});

// ---------------------------------------------------------------------------
console.log('\n' + (fail === 0
  ? `\u{1F389} All ${pass} tests passed!`
  : `${pass} passed, ${fail} failed`) + '\n');
process.exit(fail === 0 ? 0 : 1);
