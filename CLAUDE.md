# CLAUDE.md

Guidance for Claude Code when working in this repo, plus a running record of
why the project looks the way it does.

## What this is

**AimLite** — a Counter-Strike-style 3D browser aim trainer. React +
react-three-fiber (Three.js) + Vite. Peek-and-hide humanoid targets pop out
from behind cover on a sunlit outdoor range; the player has FPS pointer-lock
mouse-look and a fixed crosshair, and flicks onto targets before they duck
back. Headshots score more than body shots, streaks build a combo multiplier,
and best scores per difficulty persist in `localStorage`.

Live build: https://jordanizzilloellis.github.io/AimLite/

## Stack & commands

- React 18, Vite 4, Three.js 0.160, `@react-three/fiber` 8 — pinned versions
  so the app runs on Node 16+.
- `npm install`, `npm run dev`, `npm run build` (outputs `dist/`), `npm run preview`.
- No test suite or linter is configured yet.

## Architecture

```
src/
  main.jsx           React entry point
  App.jsx             top-level screen state machine (menu / playing / over)
  config.js            difficulty, scoring, cover layout, camera settings — the single
                       source of truth for game tuning
  sound.js             synthesized Web Audio sound engine (no audio assets)
  components/
    Menu.jsx            start screen: difficulty + sensitivity
    Game3D.jsx           game loop, scoring, HUD overlay, crosshair, Canvas
    Hud.jsx               in-game heads-up display
    GameOver.jsx          results + grade screen
  three/
    GameScene.jsx        first-person controls (pointer lock) + fire raycast
    Environment.jsx       arena: floor, walls, cover pillars, crates, ledges, facades
    Target3D.jsx           peek-and-hide animation wrapper
    Humanoid.jsx            low-poly figure (capsules/cylinders) with head/body hitboxes
```

Deploy: `.github/workflows/deploy.yml` builds and publishes to GitHub Pages on
every push to `main`. Production `base` in `vite.config.js` is `/AimLite/` to
match the Pages subpath — **must stay in sync with the repo name** if it's
ever renamed again (this bit us once, see the rename decision below).

## Core mechanics (why the code is shaped this way)

- **Real occlusion, not fake hitboxes.** Firing raycasts from the crosshair;
  the nearest hit wins, so crates/pillars/corners physically block shots.
  Cover is not decorative.
- **Line-of-sight spawning.** Before picking a spawn spot, the scene raycasts
  from the eye to the target's *head* and only allows spots with a clear view.
  This is head-based (not full-body) deliberately, so head-only peeks are
  valid spawns while fully-hidden/unseeable targets never occur.
- **Head hitbox scores 2.5x body**, both further scaled by a combo multiplier
  that grows 10%/hit up to a cap — rewards sustained accuracy over lucky
  single shots.
- **Difficulty controls two knobs**: countdown length and exposure window
  (how long a target stays out before ducking back). Both live in
  `DIFFICULTIES` in `config.js`.
- **Verticality is intentional.** Cover spots carry an `elev` (ledge height)
  so aiming isn't purely horizontal — player eye height is tuned so ground
  targets sit slightly below the crosshair and raised targets need an upward
  flick.
- All game tuning (scoring, timing, camera, cover layout) is centralized in
  `config.js` rather than scattered across components.

## Decision history

Chronological, oldest first. Each entry is *why*, not just *what* — see git
log for full diffs.

1. **Initial commit — 2D neon aim trainer.** Started as a flat DOM-based
   "WebAim" trainer: neon-arcade UI, Time Attack mode (hit 20 targets before
   the clock), particle bursts, S–D grading, per-difficulty best scores.
2. **Reworked into 3D CS-style peek-and-hide (`952da09`).** Replaced the 2D
   playfield entirely with a Three.js/`react-three-fiber` scene — this was a
   full genre pivot, not an incremental feature. Added FPS pointer-lock
   look, humanoid targets with head hitboxes, raycast-based firing (real
   cover occlusion), and peek-and-hide AI. Removed the old 2D Game/Target/
   Burst components rather than keeping them behind a mode switch.
3. **Warm daylight theme, verticality, LOS spawning, compact arena
   (`06101ec`).** One combined commit (kept as one because the changes were
   interwoven across the same files). Dropped the dark cyberpunk look for a
   bright outdoor "Dust"-style range — dark neon reads as generic web-game,
   not CS. Added ledge elevation and the head-based line-of-sight spawn
   check described above. Shrank the arena and added building facades so
   there's always something nearby to peek around.
4. **Added Extreme difficulty (`258bf71`).** 20s / 0.5s exposure, hot-red
   accent — surfaces automatically in the menu once added to
   `DIFFICULTIES`.
5. **Slimmer humanoid targets, scale 0.68 (`0b90df9`).** Rebuilt targets from
   capsules/cylinders instead of boxes — boxy primitives read as
   Minecraft/Roblox rather than a human silhouette, which matters for a CS
   aim-trainer's feel. Kept total height ~1.66 so LOS/elevation math didn't
   need to change. Dropped global scale 0.82 → 0.68 for tighter shots across
   all difficulties.
6. **Renamed WebAim → AimLite, deployed to GitHub Pages (`396ee56`).**
   Renamed across menu title, `package.json`, README, page title, and added
   an SVG crosshair favicon. Added the GitHub Actions deploy workflow with
   `base: '/AimLite/'` — **the base path must be updated if the repo is
   renamed again**, or the production build will 404 on Pages.
7. **End-of-run quip + golden snitch bonus target.** Two gamification
   additions on top of the existing score/grade:
   - `computeMaxScore()` in `config.js` derives the theoretical perfect-run
     score (every target a headshot, combo maxed) from the existing scoring
     constants; `GameOver.jsx` grades the run's score as a percentage of that
     and shows a quip ("Run it back." → "Insane!" → "DAMN! Was that a
     Grayson technology?" at 100%+). Deriving it instead of hardcoding a
     number keeps it correct if scoring constants ever change. The quip
     carries a `tier` that drives escalating CSS (`score-quip[data-tier]`
     in `App.css`) — size, weight and glow ramp up with the tier, and the
     colour climbs a familiar game-rarity ladder (light blue → blue →
     purple → pink → red → gold), topping out in an animated gold shimmer
     for "damn".
   - The golden snitch (`Snitch.jsx` / `Snitch3D.jsx`) is a small fast
     humanoid-independent bonus target — a golden sphere with fluttering
     wings — that flies an erratic random path through open air, tagged
     `kind:'snitch'` for the fire raycast same as head/body hitboxes. Worth a
     flat 1000 (not combo-scaled), appears **at most once per round** at a
     random time (never in the first second). Exposure is a fraction of the
     difficulty's normal peek window, via `SNITCH_EXPOSURE_FACTOR` — tuned
     up from an initial 60% to 90% after playtesting found 60% unfair
     (borderline uncatchable on Hard/Extreme); the small size and erratic
     path are already most of the difficulty, so the window itself only
     needs to be slightly shorter than a normal peek. `SNITCH_MAX_TRAVEL`
     then caps how far one flight can span start-to-end (the open-air bounds
     it spawns within are much wider), and wiggle amplitude/frequency were
     dialed down — the first pass let a flight cross nearly the whole arena
     in under a second, which read as frantic rather than hard; capping
     travel distance and softening the zigzag slows the felt speed without
     touching the exposure window, so it's still just as hard to land, only
     less chaotic to track. Scheduling lives in `Game3D.jsx`'s existing rAF
     loop alongside the peek-target lifecycle, entirely independent of it
     (can appear mid-peek or during a gap); catching it counts toward
     `hits`/accuracy and continues the combo, but not toward `resolved`/
     `TARGET_COUNT` completion, since it's a bonus, not one of the 20.
8. **Snitch line-of-sight guarantee + fastest-hit stat.** Follow-up
   playtesting turned up a real problem: the snitch's random flight path had
   no obstacle awareness, so it could spend its entire exposure window
   flapping behind a tall cover pillar — unlike the peek targets (only ever
   partly hidden, always have *some* valid head peek), a fully-obscured
   snitch is just unplayable. Fixed by moving path generation into
   `GameScene`'s `snitchPathPickerRef` (mirrors the existing cover-spot
   `spotPickerRef`): it samples 20 points along a candidate path — including
   the wiggle offset, not just the start/end endpoints — and raycasts each
   against every `kind:'obstacle'` mesh, scoring how many samples are
   visible from the player's eye. A fully-clear candidate wins immediately;
   otherwise it tries up to 40 random candidates and falls back to whichever
   was least occluded. The snitch **always spawns exactly once per round**
   — an initial version bailed out and skipped the snitch entirely when 24
   attempts found nothing perfectly clear, which undermined the "once per
   round" promise, so it was changed to guarantee an appearance and only
   prefer full visibility rather than require it (in practice a fully-clear
   path is found almost every time given how open the arena is; the
   fallback is a rare-case safety net, not the common path). `Snitch3D` now
   takes the resolved `path` as a prop instead of generating one itself.
   Also added a fastest-hit stat: `Game3D.jsx` tracks the minimum
   `(hit time − target spawn time)` across all successful head/body hits
   (not snitch catches — different dynamics) and `GameOver.jsx` shows it in
   milliseconds. Measured from `spawnAtClock` rather than full exposure
   (post rise-animation) to match the existing `hittable` window check
   elsewhere in the file, so a raw number in the 100–900ms range is a
   reaction-time-plus-rise-time figure, not pure reaction time.
9. **Snitch exclusivity below Extreme; full-length window on Extreme.**
   `DIFFICULTIES` gained two per-difficulty snitch knobs: `snitchSolo`
   (true on Easy/Medium/Hard, false on Extreme) and `snitchExposureFactor`
   (Extreme sets it to `1`, overriding the global `SNITCH_EXPOSURE_FACTOR`
   default of 0.9). On solo difficulties, `Game3D.jsx`'s spawn conditions
   for the peek target and the snitch each gained a mutual-exclusion guard
   — a new peek target won't spawn while the snitch is up, and the snitch
   won't spawn while a peek target is up — so the snitch waits for a
   natural gap between peek targets rather than a currently-visible one
   being pulled out from under the player. On Extreme there's no time to
   spare for that courtesy, so the snitch can overlap a peek same as
   before, and its window is no longer shortened at all — Extreme's peek
   window is already the tightest in the game, so cutting it further felt
   like double-punishing the hardest difficulty rather than adding
   distinct bonus-target skill.
10. **Snitch scheduling moved off the wall clock, onto resolved-target
    count.** The user reported not seeing the snitch at all on a Medium
    run. Root cause: `snitchAt` was a random point on the game clock (e.g.
    "17.5s into a 35s round"), but the round can end the instant the 20th
    peek target resolves — a fast/accurate player can clear all 20 well
    before that random time is reached, and the snitch, having never had
    its turn, silently never appears. This predates entry 9's solo-mode
    wait (which only made it slightly more likely to lose its slot, not the
    root cause). Fixed by rebasing the trigger on `s.resolved` instead of
    `s.clock`: `snitchAtResolved` is a random integer in
    `[SNITCH_RESOLVED_MARGIN, TARGET_COUNT - 1]` (config.js), and the
    snitch becomes eligible once that many peek targets have resolved.
    `resolved` increments on *every* target resolution, hit or escaped, so
    it climbs steadily even against a struggling player — unlike the clock,
    a threshold that can never reach `TARGET_COUNT` is structurally
    guaranteed to be reached before the round can end via target-count
    completion. `SNITCH_MIN_DELAY` stays on as a real-time floor (paired
    with `&&`) so it still can't fire in the opening instant.
11. **Widened the resolved-count range to 2–19; added a "Missed" snitch
    result.** The random range was originally symmetric —
    `[SNITCH_RESOLVED_MARGIN, TARGET_COUNT - SNITCH_RESOLVED_MARGIN - 1]`,
    i.e. 2–17 — leaving margin at both ends. The user wanted it able to fire
    as late as target 19, and there was never a structural need for an
    end-margin (the threshold already can't reach `TARGET_COUNT`, so it
    can't need protecting from it); changed the formula to
    `SNITCH_RESOLVED_MARGIN + random(0, TARGET_COUNT - SNITCH_RESOLVED_MARGIN)`,
    i.e. `[2, 19]`. Also added a distinct "Missed 😔" result on the
    end-screen's Snitch stat for when it spawned but wasn't caught,
    alongside the existing "⚡ Caught!" and "—" (never appeared this round —
    rare, but possible if the round times out before the resolved threshold
    is reached). This needed a `snitchSpawned` flag threaded through to the
    results payload; moved the flag's assignment in `spawnSnitch()` to
    *after* a flight path is confirmed (previously set unconditionally up
    front), so a round can't be misreported as "snitch appeared" if the
    scene ref somehow wasn't ready yet.
12. **Spacebar quick-restart.** Wipes the current round and starts it over
    instantly, same difficulty, no trip through the menu or results screen —
    for when a round's gone sideways and the player just wants a clean
    retry. The tricky part: `Game3D`'s game state lives in a `useRef`
    (`g.current`), which survives re-renders by design (that's how the rAF
    loop mutates it without fighting React) — so a restart can't just be a
    state update inside `Game3D`, since nothing about a normal re-render
    would reset that ref. Instead `App.jsx` owns a `restartSeq` counter and
    passes `key={`${difficulty}-${restartSeq}`}` to `<Game3D>`; bumping it
    forces React to unmount and remount the component, which is what
    already happens for free on the menu's "Play Again" (screen leaves
    'playing' then returns), just triggered without leaving the screen.
    `Game3D` listens for `Space` via a `keydown` effect scoped to its own
    mount lifetime, skips `e.repeat` so holding the key doesn't rapid-fire
    restarts, and runs the same cleanup as Quit (stop the rAF loop, exit
    pointer lock) before calling `onRestart`.
13. **Average time-to-hit stat + grade now shares the quip's rarity-ladder
    styling.** `Game3D.jsx` gained `reactionSumMs`/`reactionCount`
    alongside the existing `fastestHitMs`, updated at the same call site
    (the head/body hit branch in `handleFire`, so it's peek-target-only,
    same as fastest); `GameOver.jsx` shows the average in ms next to
    Fastest Hit. Separately, the S/A/B/C/D grade previously only had custom
    colours for S (gold) and D (a leftover reddish accent), with A/B/C all
    sharing one flat size and the difficulty's accent colour — so unlike
    the quip, it didn't visually escalate at all. Restyled `.grade` in
    `App.css` to reuse the quip's exact rarity colours (light blue → blue →
    purple → pink → gold, skipping the quip's red "insane" step since grade
    only has 5 levels to the quip's 6) with size climbing D→S and the same
    glow/shimmer treatment kicking in at the top (A gets a glow, S gets the
    full `quip-shine` animation) — same visual language, deliberately
    reusing the quip's hex values rather than re-deriving a parallel palette
    so the two stay in sync if the ladder ever changes.
14. **Grade and quip unified onto one score-based scale (supersedes most of
    #13's grade approach).** The user got an A but a lukewarm quip in the
    same run — because even after #13's shared *palette*, the grade and the
    quip were still computed from two independent formulas (grade from hit
    ratio/accuracy/headshot rate; quip from score-vs-perfect-run), so they
    could legitimately disagree. Fixed at the source in `GameOver.jsx`:
    replaced both separate functions with one `SCORE_TIERS` table and a
    single `scoreResultFor(score)` lookup, keyed purely on score percentage
    of `computeMaxScore()`. Each tier now carries its `grade` letter, `tier`
    slug, and quip `text` together, so grade and quip are two renderings of
    the exact same computed value and can never contradict each other
    again. The old hits/accuracy/headshot-rate-gated grade formula is gone
    entirely — those stats are still shown in the results grid, just no
    longer used to gate the letter. `.grade` now keys its CSS off
    `data-tier` (the same attribute the quip uses) instead of `data-grade`,
    so a shared score percentage always produces a matching colour on both;
    "insane" and "damn" both render the letter S but stay visually distinct
    via `data-tier` (S grows further and picks up the full gold shimmer
    only at "damn").
15. **CS2-accurate sensitivity (advanced setting) + a real Settings screen.**
    A user reported being unable to train comfortably because they couldn't
    dial in their exact CS2 sensitivity, risking their muscle memory. Added
    `config.js` constants/helpers (`CS_M_YAW = 0.022`, `cs2SensToRadPerPixel`,
    `effectiveSensRadPerPixel`) implementing the Source-engine turn formula:
    degrees-per-count = sensitivity × m_yaw (a fixed client constant CS2
    inherited from CS:GO/Source, essentially never changed by players).
    Deliberately DPI-free — the same physical mouse produces the same raw
    counts whether CS2 or this page reads them, so DPI cancels out of the
    turn-rate math entirely; DPI is collected only to show the eDPI
    reference number (eDPI = DPI × sensitivity) players may recognize from
    their own setup, not because it's needed for the conversion. Documented
    the one real caveat inline: this only matches exactly with the OS mouse
    in its neutral/no-acceleration mode (Windows: pointer speed at the
    default 6/11, "Enhance pointer precision" off) — the same setup
    competitive players already run so raw input isn't altered by OS
    pointer accel, so it's not an extra ask.
    Setting a CS2 sensitivity value overrides the basic 0.3–2.5× slider
    entirely (checked via `cs2Sens != null`, not a separate toggle — typing
    a value *is* the override, matching how the user described the
    behavior). Introduced a proper Settings screen (`Settings.jsx`, new
    `screen === 'settings'` state in `App.jsx`) as a deliberate home for
    this and future player-config options, replacing the sensitivity
    slider that used to live inline on the main menu; `Menu.jsx` now just
    has a "⚙ Settings" button. All settings (basic multiplier, CS2
    sensitivity, DPI) persist as one object under a new
    `aimlite.settings.v1` localStorage key (replacing the old standalone
    `webaim.sens` key — not migrated, since this is a low-stakes solo
    project and the old key is harmless to leave orphaned) with a "Reset to
    Defaults" button. `Game3D`/`GameScene` now take a single precomputed
    `sensRadPerPixel` prop instead of a raw `sensMult`, so there's exactly
    one place (`effectiveSensRadPerPixel`) that decides which sensitivity
    mode is active.
16. **CS2 sensitivity override became an explicit toggle, not an implicit
    one.** #15 shipped with "entering a CS2 sensitivity value automatically
    overrides the slider" — but the user's actual ask was to be able to
    *have* a CS2 sensitivity saved without being locked out of the basic
    slider, i.e. pick which one is active. The implicit "value present ⇒
    active" rule couldn't express "I've saved a CS2 value but want to use
    Basic right now." Added `sensMode` (`SENS_MODE_BASIC` / `SENS_MODE_CS2`)
    to config.js and the settings object as the explicit source of truth;
    `effectiveSensRadPerPixel` now checks `sensMode`, only falling back to
    the basic slider if CS2 mode is selected but no value has been entered
    yet. `Settings.jsx` gained a Basic/CS2 segmented toggle; the CS2
    fields stay fully editable regardless of which mode is selected (typing
    into them no longer flips the mode), just dimmed (`.settings-advanced
    .inactive`, opacity only — never `pointer-events: none`) when not the
    active source.
17. **Settings reachable from the results screen too.** `GameOver.jsx`
    gained a third action button (⚙ Settings) alongside Play Again/Menu.
    Since Settings can now be opened from two different screens, "Back"
    needed to return to whichever one it was opened from rather than always
    landing on the main menu — `App.jsx` added a `settingsReturnTo` state,
    set to the current `screen` whenever `openSettings` fires, and
    `closeSettings` returns to it. `results` state isn't touched by this
    navigation (only `startGame`/quick-restart clear it), so returning to
    'over' after a Settings detour still shows the same round's results.

## Working conventions

- This project has no CLAUDE.md history prior to this file (created
  2026-07-16) — earlier context lives only in commit messages above.
- Commits so far were authored solo by Claude (Opus 4.8) with the user
  directing at a fairly high level ("rework into 3D", "add a difficulty",
  "rename the project") — expect similar latitude on implementation details
  unless told otherwise.
- Game tuning changes (scoring, timing, difficulty, layout) belong in
  `config.js`, not hardcoded in components.
