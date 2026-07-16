// Central game configuration for the CS-style 3D aim trainer.
// Default mode: peek-and-hide — targets pop out from behind cover; you flick
// onto them and fire before they duck back. Hit 20 before the clock runs out.

export const TARGET_COUNT = 20

// Scoring
export const BODY_POINTS = 100
export const HEAD_POINTS = 250
// Each consecutive hit adds 10% up to a cap, rewarding streaks.
export const COMBO_STEP = 0.1
export const COMBO_MAX_MULT = 2.5

// Peek animation timing (seconds).
export const RISE_TIME = 0.16 // sliding out from cover
export const HIDE_TIME = 0.16 // ducking back
export const SPAWN_GAP = 0.28 // pause between one target resolving and the next

// Difficulty sets the countdown length and how long a target stays exposed.
// snitchSolo: below Extreme, the snitch waits for a gap between cover
// targets so it's never fighting a peek target for attention; at Extreme
// there's no time to spare for that courtesy, so it can overlap a peek.
// snitchExposureFactor overrides the global SNITCH_EXPOSURE_FACTOR — Extreme
// runs it at the same window as a normal peek (no further reduction), since
// solo mode already isn't cutting it any slack elsewhere.
export const DIFFICULTIES = {
  easy: { key: 'easy', label: 'Easy', time: 45, exposure: 1.5, accent: '#3f9b52', snitchSolo: true },
  medium: { key: 'medium', label: 'Medium', time: 35, exposure: 1.05, accent: '#2f7fc4', snitchSolo: true },
  hard: { key: 'hard', label: 'Hard', time: 25, exposure: 0.75, accent: '#e0552b', snitchSolo: true },
  extreme: {
    key: 'extreme',
    label: 'Extreme',
    time: 20,
    exposure: 0.5,
    accent: '#d61f3a',
    snitchSolo: false,
    snitchExposureFactor: 1,
  },
}

export const DEFAULT_DIFFICULTY = 'medium'

// The best-case score for a perfect run: every target a headshot, combo
// climbing every hit. Used to grade the end-of-run score relative to what
// was actually achievable (the golden snitch is a bonus on top of this, not
// counted toward it, so a great snitch catch can push you past 100%).
export function computeMaxScore() {
  let total = 0
  for (let i = 1; i <= TARGET_COUNT; i++) {
    const mult = Math.min(COMBO_MAX_MULT, 1 + (i - 1) * COMBO_STEP)
    total += Math.round(HEAD_POINTS * mult)
  }
  return total
}

// Golden snitch — a rare, small, fast-moving bonus target that flies through
// open space independent of the peek-and-hide cover targets. Worth a flat
// bonus and gone fast: exposure is a fraction of the difficulty's normal
// peek window (see DIFFICULTIES.snitchExposureFactor for per-difficulty
// overrides). Its small size and erratic flight path are already most of
// the difficulty, so the window only needs to be slightly shorter than a
// normal peek — 60% made it feel unfair (borderline uncatchable on Hard/
// Extreme), 90% is tight but fair. Appears at most once per round, timed off
// the number of peek targets resolved rather than the wall clock — a
// clock-based time could be scheduled after a fast/accurate player had
// already resolved all TARGET_COUNT targets and ended the round, so the
// snitch would silently never show up. Resolved count only ever increases
// (targets always resolve, by hit or by escaping unhit), so a threshold
// comfortably below TARGET_COUNT is guaranteed to be reached before the
// round can end via target-count completion.
export const SNITCH_POINTS = 1000
export const SNITCH_EXPOSURE_FACTOR = 0.9
export const SNITCH_MIN_DELAY = 1 // real-time floor, so it can't appear in the opening instant
// The resolved-target threshold that triggers the snitch is drawn randomly
// from [SNITCH_RESOLVED_MARGIN, TARGET_COUNT - 1] — a margin at the start
// only (so it can't fire on the very first target), no margin needed at the
// end since the threshold can never reach TARGET_COUNT itself.
export const SNITCH_RESOLVED_MARGIN = 2
// Volume of open space (in front of the player, above head height so it
// reads against the sky) the snitch picks a random flight path through.
export const SNITCH_BOUNDS = { xMin: -5.8, xMax: 5.8, yMin: 1.3, yMax: 3.1, zMin: -7.6, zMax: -1.8 }
// Caps how far a single flight can span (start to end, before the zigzag
// wiggle) so the snitch stays hard to track without feeling frantic — the
// bounds above are much wider than this on their own.
export const SNITCH_MAX_TRAVEL = 4.0

// Mouse-look sensitivity. The slider picks a multiplier; this is the base
// radians-per-pixel applied to raw mouse movement.
export const BASE_SENSITIVITY = 0.0022
export const DEFAULT_SENS_MULT = 1.0
export const SENS_MIN = 0.3
export const SENS_MAX = 2.5

// Camera / player. Eye is a bit above a standing target's head height so that
// ground-level targets sit slightly below the crosshair (aim down) while raised
// targets need an upward flick.
export const PLAYER_POS = [0, 1.7, 6.8]
export const CAMERA_FOV = 75
export const MAX_YAW = 1.15 // ~66° left/right
export const MAX_PITCH = 0.6 // ~34° up/down

// Peek distance a target slides out sideways from behind its cover.
export const PEEK_DISTANCE = 0.9

// Humanoid targets are scaled down for a tighter arena / harder shots.
export const TARGET_SCALE = 0.68
// Head-height of a target (local model head y * scale), used for line-of-sight.
export const TARGET_HEAD_Y = 1.66 * TARGET_SCALE

// Cover spots: each is a corner/pillar a target peeks around.
// pos = [x, z] of the cover; side = which way (+1 right / -1 left) it peeks;
// elev = height of the ledge/platform the target stands on (0 = ground level).
// Spread across the (smaller) arena in loose rows with room to breathe, and an
// elevation gradient rising toward the back so every round mixes vertical aim.
export const COVER_SPOTS = [
  // front row (nearest)
  { pos: [-5, -1.5], side: 1, elev: 0 },
  { pos: [-1.8, -0.8], side: 1, elev: 0 },
  { pos: [2.4, -1.2], side: -1, elev: 0 },
  { pos: [5, -1.6], side: -1, elev: 0.6 },
  // mid row
  { pos: [-6, -4], side: 1, elev: 1.2 },
  { pos: [-2.8, -4.4], side: -1, elev: 0 },
  { pos: [0.4, -4], side: 1, elev: 0.8 },
  { pos: [3.4, -4.3], side: -1, elev: 1.0 },
  { pos: [6, -4], side: -1, elev: 1.5 },
  // back row (farthest, highest)
  { pos: [-4.4, -7], side: 1, elev: 1.8 },
  { pos: [0, -7.8], side: -1, elev: 2.2 },
  { pos: [4.4, -7], side: -1, elev: 1.6 },
]

// Free-standing crates (pure obstacles that can block your shots). Spread into
// the gaps between cover so shots get blocked from some angles and partial
// (head/shoulder) peeks emerge naturally. [x, y, z, size]
export const CRATES = [
  [-3.4, 0.45, -2.6, 0.9],
  [3.8, 0.45, -2.8, 0.9],
  [-0.6, 0.45, -1.9, 0.9],
  [1.4, 0.45, -5.6, 0.9],
  [-1.4, 0.45, -5.8, 0.9],
  [5.4, 0.4, -5.2, 0.8],
]
