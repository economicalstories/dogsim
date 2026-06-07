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
  assert.strictEqual(game.state().bonesCollected, NUM_BONES, 'all bones collected');
  assert.strictEqual(game.state().needsSleep, true, 'needsSleep flag set');
});

test('reaching the house while needing sleep starts sleeping', () => {
  const r = game.refs();
  r.player.position.copy(r.playerHouse.position);
  game.step(0.016);
  assert.strictEqual(game.state().sleeping, true, 'puppy is now sleeping');
  assert.strictEqual(game.state().needsSleep, false, 'needsSleep cleared');
});

test('waking up respawns all bones and gives +50 bonus', () => {
  const before = game.state();
  game.wakeUp();
  const after = game.state();
  const r = game.refs();
  assert.strictEqual(after.sleeping, false, 'awake again');
  assert.strictEqual(after.bonesCollected, 0, 'bone counter reset');
  assert.strictEqual(r.bones.length, NUM_BONES, 'bones respawned');
  assert.ok(r.bones.every(b => !b.userData.collected && b.visible), 'all bones fresh');
  assert.strictEqual(after.score, before.score + 50, '+50 sleep bonus');
});

test('touching a kitten makes it follow you', () => {
  const r = game.refs();
  const cat = r.cats.find(c => !c.userData.following);
  assert.ok(cat, 'a free kitten exists');
  const before = game.state().catsCollected;
  cat.userData.following = false;
  cat.position.copy(r.player.position);
  cat.position.x += 1.0; // within the 2.2 collect radius
  game.step(0.016);
  assert.strictEqual(cat.userData.following, true, 'kitten now following');
  assert.strictEqual(game.state().catsCollected, before + 1, 'cat counter up');
});

test('joystick input moves the puppy and bounds keep it in the yard', () => {
  const r = game.refs();
  r.player.position.set(0, 0, 0);
  const start = r.player.position.clone();
  game.setInput(0, -1); // push "up" = forward
  run(game, 30);
  const moved = r.player.position.distanceTo(start);
  assert.ok(moved > 1, 'puppy actually moved (' + moved.toFixed(2) + ')');
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

test('runs 600 frames with AI dogs & cats without throwing', () => {
  run(game, 600);
  assert.ok(true);
});

// ---------------------------------------------------------------------------
console.log('\n' + (fail === 0
  ? `\u{1F389} All ${pass} tests passed!`
  : `${pass} passed, ${fail} failed`) + '\n');
process.exit(fail === 0 ? 0 : 1);
