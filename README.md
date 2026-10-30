# Rally Club - Stick Badminton

**[Play Rally Club](https://mohammadhamza-cpu.github.io/rally-club/)**

A colorful, playable, side-view badminton arcade game. Animated stick figures,
visible strung rackets, gravity/drag shuttle physics, contact-limited swings,
three AI difficulties, local two-player matches and generated sound effects.
Built with HTML, CSS, JavaScript and Canvas. No dependencies, backend, ads or
external assets. The game also works offline: download this repository and open
[index.html](index.html) in a browser. No build step is needed.

## Controls

| Action | Player 1 | Player 2 (local mode) |
| --- | --- | --- |
| Move | A / D | Left / Right arrows |
| Jump | W | Up arrow |
| Charge / swing / serve | Hold Space, release to swing | Hold Enter, release to swing |
| Clear shortcut | Hold W at swing release | Hold Up at swing release |
| Net-shot shortcut | Hold S at swing release | Hold Down at swing release |
| Smash | Jump, release W, release swing high | Jump, release Up, release swing high |
| Pause / resume | P or Escape | P or Escape |

Either keyboard layout controls Player 1 in solo mode. A tap gives 25% power;
0.85 seconds fills the power bar. Full charge waits for release. Extra power
changes pace, depth and clear height, not hitting range. Each player has an
independent visible power meter. The AI charges through the same player state.

Backhands follow contact position. Six automatic trick shots depend on position,
timing and power: **Net Brush, Reverse Slice, Flick Lift, Reverse Flick, Slice
Drive and Thunder Smash**. Successful strokes display their name and intensity;
no additional trick-shot keys. A distant swing always misses.

Touch controls: hold/release Hit to charge/swing. Keep Jump held at release for a
clear, or Drop held for a net shot. Release Jump before Hit for a smash. Landscape
provides a larger playing field. Local mode requires a keyboard.

## Rules

- First to 11, win by two, capped at 15; the point winner serves next.
- Lines count as in. Landing on your side loses the point. Hitting out faults the
  last hitter. Low shots physically deflect from the net.
- Serve positions are fixed, then movement unlocks after contact.
- Pause, focus loss, cancellation and new points discard stored charge safely.
- Restart or change modes from the pause menu; choose a rematch at game over.

This is an arcade interpretation rather than a regulation BWF simulation, with
shortened scoring, assisted shot depth and simplified service positioning.

## Architecture

The simulation uses 120 Hz fixed steps inside one requestAnimationFrame loop.
Long stalls have a bounded catch-up window. Rendering size never changes physics.

- [physics.js](js/physics.js): movement, jumps, drag/gravity, racket pose and flight prediction.
- [shots.js](js/shots.js): charge-dependent trajectories and automatic strokes.
- [collisions.js](js/collisions.js): swept racket-head and net collisions.
- [scoring.js](js/scoring.js): in/out, rally awards and match rules.
- [ai.js](js/ai.js): difficulty, movement, interception, charge and release.
- [engine.js](js/engine.js): DOM-free match lifecycle.
- [controls.js](js/controls.js): keyboard and touch, duration and release edges.
- [audio.js](js/audio.js): nine original generated Web Audio cues.
- [renderer.js](js/renderer.js): court, animated figures/rackets and effects.
- [game.js](js/game.js): UI, power meters, callouts and animation loop.
- [styles.css](styles.css): responsive layout.

## Testing

The local charge/trick-shot release passed **88 engine tests, 99 Chrome browser
checks and six full seeded simulation matches** (1,860 contacts, 99 points).
Those are automated tests, not six manually played matches. Both control modes,
all four shot families, tricks, charge/release, scoring, service, pause/restart,
focus handling, audio lifecycle and emulated multi-touch were exercised. The
local run had zero page JavaScript/console errors and zero HTTP/HTTPS requests.
Audio was checked programmatically, not listened to; touch used Chrome emulation.
This is not a claim of testing every browser or physical mobile device.

The GitHub Pages version also passed **99 hosted Chrome checks, 88 hosted engine
tests and six complete simulations**. All 12 served runtime files were matched
byte-for-byte with the local release. The successful hosted run reported no page
JavaScript/console errors and requested only its own static site files. The touch
modifier test places its contact fixture immediately before release so browser
latency cannot accidentally turn that modifier check into a missed shot.

Open [the engine test page](tests/index.html) to run its 88 checks. To run the full
suite, use Python 3 and a Chromium-family browser from the repository root:

```sh
python3 tests/browser_test.py
python3 tests/browser_test.py --base-url https://mohammadhamza-cpu.github.io/rally-club/
# Optional: append --browser /path/to/chrome
```

The standard-library harness creates its own temporary browser profile and does
not touch your personal tabs. Evidence is written locally, not committed here.

## Hosting and updates

GitHub Pages publishes the `main` branch at the repository root. Update the game
files and commit to `main`; Pages rebuilds the static site automatically. Keep
all runtime files together. The `.nojekyll` marker disables Jekyll processing.

This repository contains only the game, test sources and this guide. No access
tokens, other workspace projects, deployment scripts or local test artifacts
are included.
