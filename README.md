# 🐷 TheNicoleT Oink Cannon

> A fun, interactive browser game built for live streams — launch a pig from a cannon and watch it soar across the screen, landing in a randomized reward zone!

![Pink & Blue Aesthetic](https://img.shields.io/badge/aesthetic-pink%20%26%20blue-%23ff66b8?style=for-the-badge)
![Built With](https://img.shields.io/badge/built%20with-Vanilla%20JS-%235ad0ff?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-blueviolet?style=for-the-badge)

---

## 🎮 How It Works

1. Click **🚀 Launch Pig** — the cannon fires and the camera scrolls to follow the pig across the field
2. The pig bounces and rolls until it settles in a **landing zone**
3. A **big flashy result** pops up on screen showing what reward was won
4. Celebrate! 🎉

---

## ✨ Features

- **Scrolling camera** — the pig launches from far off-screen and the view follows it all the way to the landing zone
- **Big animated result text** — the winning zone name and reward animate front-and-center when the pig lands
- **Fully customizable zones** — edit zone names, reward labels, and sub-amounts live in the panel
- **Add / remove zones** — dynamically create as many landing zones as you want
- **Default zones: 5 Subs / 10 Subs / 25 Subs** — stream-ready out of the box
- **Persistent zones** — all customizations are saved to `localStorage` so they survive page refreshes
- **Sound effects** — cannon boom, pig oinks, bounce thuds, and a win fanfare (toggle on/off)
- **Pink & blue aesthetic** — glowing gradients, animated launch button, color-coded zones
- **Mobile responsive** — works on phones and tablets too

---

## 🚀 Getting Started

No build tools needed — it's pure HTML, CSS, and JavaScript.

```bash
# Clone the repo
git clone https://github.com/MarvelShock/oinkcannon.git
cd oinkcannon

# Open directly in your browser
open index.html
```

Or serve it locally:

```bash
npx serve .
# then visit http://localhost:3000
```

---

## 🎨 Customizing Zones

Click **Hide/Show Customize** to open the zone panel:

| Action | How |
|---|---|
| Rename a zone | Edit the **Name** field and click Save |
| Change the reward label | Edit the **Amount** field and click Save |
| Edit sub-amounts | Click ⚙️ to expand, then edit Sub 1/2/3 |
| Add a zone | Click **+ Add Zone** at the bottom of the panel |
| Remove a zone | Click 🗑 on any zone card (minimum 1 zone required) |

All changes save automatically to your browser's local storage.

---

## 📁 File Structure

```
oinkcannon/
├── index.html   # App shell, layout, and overlay elements
├── style.css    # All styling — dark theme, pink/blue gradients, animations
├── game.js      # Game loop, physics, scrolling camera, zone logic, audio
└── README.md    # You are here!
```

---

## 🛠 Built With

- **Vanilla JavaScript** — no frameworks or dependencies
- **HTML5 Canvas** — for all game rendering
- **Web Audio API** — for procedurally generated sound effects
- **CSS animations** — for the result pop, launch button pulse, and background shimmer

---

## 💜 Made for TheNicoleT

Built to bring some oink-powered excitement to live streams. Feel free to fork and customize for your own channel!
