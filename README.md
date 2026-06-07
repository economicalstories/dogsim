# 🐕 Puppy World — 3D Dog Simulator

A cute, open-world 3D dog game built with [Three.js](https://threejs.org/),
designed to be played on a phone or tablet. 🐾

## 🎮 How to play

- **Move:** touch and drag anywhere on the **left side** of the screen — a joystick
  appears under your finger and your puppy runs that way.
- **Jump:** tap the green ⬆️ button.
- **Bark:** tap the yellow 🐶 button.
- **Collect all the 🦴 bones** scattered around the world.
- **Find 🐱 kittens** — touch one and it joins your puppy and follows you in a line! 💕
- When you've collected **all the bones**, a pink arrow points to your **🏠 house** —
  run home to **go to sleep**. 😴
- After a little sleep you **wake up**, the bones **respawn**, and you play again —
  your ⭐ score keeps growing!

There are lots of other **friendly dogs** running around the world to play near. 🐶🐶🐶

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

> Note: the game loads the Three.js library from a CDN (unpkg.com), so the first
> load needs an internet connection.

## 🎨 Features
- Pick your puppy's color on the start screen (6 cute colors).
- Wagging tails, floppy ears, and a little run animation.
- Open grassy world with trees, flowers, clouds, sunshine, and doghouses.
- Friendly AI dogs wandering everywhere.
- Bones to collect, kittens to befriend, and sparkly happy effects.
- Gentle sounds: happy chimes, barks, and meows.
- Touch controls made for small hands; also works with a keyboard
  (arrow keys / WASD, **Space** to jump, **B** to bark) for testing on a computer.

Made with 💖 for a puppy-loving 8-year-old.
