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
export const DIFFICULTIES = {
  easy: { key: 'easy', label: 'Easy', time: 45, exposure: 1.5, accent: '#3f9b52' },
  medium: { key: 'medium', label: 'Medium', time: 35, exposure: 1.05, accent: '#2f7fc4' },
  hard: { key: 'hard', label: 'Hard', time: 25, exposure: 0.75, accent: '#e0552b' },
  extreme: { key: 'extreme', label: 'Extreme', time: 20, exposure: 0.5, accent: '#d61f3a' },
}

export const DEFAULT_DIFFICULTY = 'medium'

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
export const TARGET_SCALE = 0.82
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
