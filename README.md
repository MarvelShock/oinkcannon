# 🐷 TheNicoleT Oink Cannon

> A fun, interactive browser game built for live streams — launch a pig from a cannon and watch it soar across the screen, landing in a randomized reward zone!

![Pink & Blue Aesthetic](https://img.shields.io/badge/aesthetic-pink%20%26%20blue-%23ff66b8?style=for-the-badge)
![Built With](https://img.shields.io/badge/built%20with-Vanilla%20JS-%235ad0ff?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-blueviolet?style=for-the-badge)

---

## 🎮 How It Works

1. Click **🚀 Launch Pig** — the camera starts on the cannon, then scrolls to follow the pig across the field
2. The pig flies, bounces, and rolls until it settles into a **landing zone**
3. A **big flashy result** pops up above the landing zone showing what reward was won
4. Celebrate with sparkles! 🎉

---

## ✨ Features

- **Scrolling camera** — the cannon is far off-screen; the view follows the pig all the way to the landing zone
- **Big animated result text** — floats above the winning zone with a glowing pink & blue gradient
- **6 stream-ready default zones** — 5 Subs, 10 Subs, 15 Subs, 25 Subs, Gift Your Age, Gift as Many Pushups as You Can Do
- **Fully customizable zones** — edit names, reward labels, and sub-amounts live
- **Add / remove zones dynamically** — as many or as few as you want
- **🔄 Reset to Defaults button** — instantly restore the original 6 zones at any time
- **Persistent zones** — all customizations saved to `localStorage`
- **Sound effects** — cannon boom, pig oinks, bounce thuds, win fanfare (toggle on/off)
- **Pink & blue aesthetic** — glowing gradients, pulsing launch button, colour-coded zones
- **Mobile responsive** — works on phones and tablets

---

## 🚀 Getting Started

No build tools needed — pure HTML, CSS, and JavaScript.

```bash
git clone https://github.com/MarvelShock/oinkcannon.git
cd oinkcannon
open index.html
```

Or serve locally:

```bash
npx serve .
# visit http://localhost:3000
```

---

## 🎨 Customizing Zones

| Action | How |
|---|---|
| Rename a zone | Edit the **Name** field → Save |
| Change the reward | Edit the **Amount** field → Save |
| Edit sub-amounts | Click ⚙️ to expand |
| Add a zone | **+ Add Zone** at the bottom |
| Remove a zone | 🗑 on any zone card (min 1 required) |
| Reset everything | **🔄 Reset to Defaults** |

---

## 📁 File Structure

```
oinkcannon/
├── index.html   # App shell & overlay elements
├── style.css    # Dark theme, pink/blue gradients, animations
├── game.js      # Game loop, physics, camera, zones, audio
└── README.md    # You are here!
```

---

## 💜 Made for TheNicoleT

Built to bring oink-powered excitement to live streams. Fork and customise for your own channel!
