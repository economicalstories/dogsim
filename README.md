# 🐕 Puppy World — 3D Dog Simulator

A cute, open-world 3D dog game built with [Three.js](https://threejs.org/),
designed to be played on a phone or tablet. 🐾

## 🎮 How to play

- **Move:** touch and drag anywhere on the **left side** of the screen — a joystick
  appears under your finger and your puppy runs that way.
- **Jump:** tap the green ⬆️ button.
- **Bark:** tap the yellow 🐶 button.
- **Collect all the 🦴 bones** scattered around the world. A **floating arrow above
  your puppy points to the nearest bone**, and each bone has a glowing beacon, so
  they're easy to find.
- **Find 🐱 kittens** — touch one and it joins your puppy and follows you in a line! 💕
- When you've collected **all the bones**, a pink arrow points to your **🏠 house** —
  run home to **go to sleep**. 😴
- After a little sleep you **wake up**, the bones **respawn**, and you play again —
  your ⭐ score keeps growing!

The world is full of **other puppies with names and personalities** 🐶 — the playful
and bouncy ones notice you, run over, bounce around, and bark to play; the shy ones
keep their distance. Look for their floating name tags!

**Level up!** 🌟 Every time you collect all the bones and sleep, you reach a **new
level** — there are more bones to find and a bigger ⭐ reward each time, so you keep
making progress. How high can you get?

Each bone has a **glowing beacon** so it's easy to spot, **butterflies** flutter around
the meadow, and your **🏆 best score** is saved so you can try to beat it next time.

## ▶ Play it

It's a single `index.html` file — no installation needed.

### Easiest: GitHub Pages (free)
1. In this repo go to **Settings → Pages**.
2. Under **Build and deployment**, set **Source = Deploy from a branch**.
3. Pick the branch and the `/ (root)` folder, then **Save**.
4. After a minute, your game is live at:
   `https://economicalstories.github.io/dogsim/`
5. Open that link on the phone — add it to the home screen for a full-screen,
   app-like experience.

### Or run locally on a computer
```bash
# from the project folder
python3 -m http.server 8000
# then open http://localhost:8000 in a browser
```

> Three.js is bundled in the repo (`vendor/three.module.js`), so the game has **no
> external dependencies** and works offline after the first load.

## 🧪 Tests

The game's rules (collecting bones, sleeping, respawning, cats following, movement,
and bounds) are covered by headless tests that run the real game logic against a
lightweight mock — no browser needed:

```bash
npm test
# or: node test/game.test.mjs
```

## 🎨 Features
- Pick your puppy's color on the start screen (6 cute colors).
- Wagging tails, floppy ears, and a little run animation.
- Open grassy world with trees, flowers, clouds, sunshine, butterflies, and doghouses.
- Friendly AI dogs with names & personalities (playful, bouncy, friendly, shy) that
  react to you — running over to play, bouncing, and barking.
- Level-up progression: each sleep starts a new, slightly bigger level with a confetti
  celebration and a level-scaled score bonus.
- Bones to collect (with glowing beacons), kittens to befriend, and sparkly happy effects.
- Saved 🏆 best score between visits.
- Gentle sounds: happy chimes, barks, and meows.
- Touch controls made for small hands; also works with a keyboard
  (arrow keys / WASD, **Space** to jump, **B** to bark) for testing on a computer.

Made with 💖 for a puppy-loving 8-year-old.
