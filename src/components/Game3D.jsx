import { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import GameScene from '../three/GameScene.jsx'
import Hud from './Hud.jsx'
import { sound } from '../sound.js'
import {
  DIFFICULTIES,
  TARGET_COUNT,
  BODY_POINTS,
  HEAD_POINTS,
  COMBO_STEP,
  COMBO_MAX_MULT,
  RISE_TIME,
  HIDE_TIME,
  SPAWN_GAP,
  CAMERA_FOV,
  PLAYER_POS,
  COVER_SPOTS,
  SNITCH_POINTS,
  SNITCH_EXPOSURE_FACTOR,
  SNITCH_MIN_DELAY,
  SNITCH_RESOLVED_MARGIN,
} from '../config.js'

const INITIAL_DELAY = 0.35

export default function Game3D({ difficulty, sensMult, onEnd, onQuit, onRestart }) {
  const diff = DIFFICULTIES[difficulty]
  const life = RISE_TIME + diff.exposure + HIDE_TIME // full peek lifetime
  const snitchLife = diff.exposure * (diff.snitchExposureFactor ?? SNITCH_EXPOSURE_FACTOR)

  const clockRef = useRef(0)
  const lockedRef = useRef(false)
  const rafRef = useRef(0)
  const lastSpotRef = useRef(-1)
  const targetSeq = useRef(0)
  const spotPickerRef = useRef(null)
  const snitchPathPickerRef = useRef(null)

  // Authoritative mutable game state (the rAF loop mutates this directly).
  const g = useRef(null)
  if (g.current === null) {
    g.current = {
      clock: 0,
      score: 0,
      hits: 0,
      headshots: 0,
      misses: 0,
      shots: 0,
      combo: 0,
      bestCombo: 0,
      resolved: 0,
      escaped: 0,
      fastestHitMs: null,
      reactionSumMs: 0,
      reactionCount: 0,
      target: null,
      nextSpawnAt: INITIAL_DELAY,
      snitch: null,
      snitchHits: 0,
      snitchSpawned: false,
      // Triggers once this many peek targets have resolved (see
      // SNITCH_RESOLVED_MARGIN) — tied to game progress, not the clock, so
      // it's guaranteed a turn even against a player who clears all
      // TARGET_COUNT targets well before the round's time limit.
      snitchAtResolved:
        SNITCH_RESOLVED_MARGIN + Math.floor(Math.random() * (TARGET_COUNT - SNITCH_RESOLVED_MARGIN)),
      ended: false,
    }
  }

  const [display, setDisplay] = useState({
    timeLeft: diff.time,
    score: 0,
    hits: 0,
    headshots: 0,
    combo: 0,
    resolved: 0,
  })
  const [target, setTarget] = useState(null)
  const [snitch, setSnitch] = useState(null)
  const [locked, setLocked] = useState(false)
  const [popups, setPopups] = useState([])

  const snapshot = useCallback(() => {
    const s = g.current
    setDisplay({
      timeLeft: Math.max(0, diff.time - s.clock),
      score: s.score,
      hits: s.hits,
      headshots: s.headshots,
      combo: s.combo,
      resolved: s.resolved,
    })
  }, [diff.time])

  const spawn = useCallback(() => {
    const s = g.current
    // Prefer the scene's line-of-sight-aware picker so targets are never fully
    // hidden behind cover; fall back to random if the scene isn't ready yet.
    let idx
    if (spotPickerRef.current) {
      idx = spotPickerRef.current(lastSpotRef.current)
    } else {
      idx = Math.floor(Math.random() * COVER_SPOTS.length)
      if (COVER_SPOTS.length > 1 && idx === lastSpotRef.current) {
        idx = (idx + 1 + Math.floor(Math.random() * (COVER_SPOTS.length - 1))) % COVER_SPOTS.length
      }
    }
    lastSpotRef.current = idx
    const t = {
      id: ++targetSeq.current,
      spot: COVER_SPOTS[idx],
      spawnAtClock: s.clock,
    }
    s.target = t
    setTarget(t)
  }, [])

  const spawnSnitch = useCallback(() => {
    const s = g.current
    // The scene picks a flight path that stays in line of sight the whole
    // way (see snitchPathPickerRef in GameScene). Only mark it spawned once
    // a path actually comes back, so a still-unmounted scene (the ref isn't
    // set yet) just retries next frame instead of quietly writing the round
    // off as "snitch appeared" when it didn't.
    const path = snitchPathPickerRef.current ? snitchPathPickerRef.current() : null
    if (!path) return
    s.snitchSpawned = true
    const sn = { id: ++targetSeq.current, spawnAtClock: s.clock, life: snitchLife, path }
    s.snitch = sn
    setSnitch(sn)
    sound.snitchAppear()
  }, [snitchLife])

  const endGame = useCallback(() => {
    const s = g.current
    if (s.ended) return
    s.ended = true
    cancelAnimationFrame(rafRef.current)
    if (document.pointerLockElement) document.exitPointerLock()
    const shots = s.shots
    onEnd({
      difficulty,
      completed: s.resolved >= TARGET_COUNT,
      score: s.score,
      hits: s.hits,
      headshots: s.headshots,
      misses: s.misses,
      shots,
      escaped: s.escaped,
      bestCombo: s.bestCombo,
      snitchHits: s.snitchHits,
      snitchSpawned: s.snitchSpawned,
      fastestHitMs: s.fastestHitMs,
      avgHitMs: s.reactionCount > 0 ? s.reactionSumMs / s.reactionCount : null,
      accuracy: shots > 0 ? s.hits / shots : 0,
      headshotRate: s.hits > 0 ? s.headshots / s.hits : 0,
      timeUsed: +Math.min(diff.time, s.clock).toFixed(1),
      totalTime: diff.time,
    })
  }, [difficulty, diff.time, onEnd])

  const addPopup = useCallback((text, color) => {
    const id = ++targetSeq.current + '-p'
    setPopups((p) => [...p.slice(-4), { id, text, color }])
    setTimeout(() => setPopups((p) => p.filter((it) => it.id !== id)), 700)
  }, [])

  // Fire handler — called by the scene's crosshair raycast.
  const handleFire = useCallback(
    (kind) => {
      const s = g.current
      if (s.ended) return
      sound.gunshot()
      s.shots += 1

      const sn = s.snitch
      const snitchHittable = sn && s.clock - sn.spawnAtClock < sn.life
      if (kind === 'snitch' && snitchHittable) {
        s.combo += 1
        s.bestCombo = Math.max(s.bestCombo, s.combo)
        s.score += SNITCH_POINTS
        s.hits += 1
        s.snitchHits += 1
        s.snitch = null
        setSnitch(null)
        sound.snitchCatch()
        addPopup(`+${SNITCH_POINTS} SNITCH!`, '#ffd23f')
        snapshot()
        return
      }

      const t = s.target
      const hittable = t && s.clock - t.spawnAtClock < life
      if ((kind === 'head' || kind === 'body') && hittable) {
        s.combo += 1
        s.bestCombo = Math.max(s.bestCombo, s.combo)
        const mult = Math.min(COMBO_MAX_MULT, 1 + (s.combo - 1) * COMBO_STEP)
        const base = kind === 'head' ? HEAD_POINTS : BODY_POINTS
        const pts = Math.round(base * mult)
        s.score += pts
        s.hits += 1
        s.resolved += 1
        // Reaction time: spawn (cover starts sliding open) to a landed shot.
        const reactionMs = (s.clock - t.spawnAtClock) * 1000
        if (s.fastestHitMs === null || reactionMs < s.fastestHitMs) s.fastestHitMs = reactionMs
        s.reactionSumMs += reactionMs
        s.reactionCount += 1
        if (kind === 'head') {
          s.headshots += 1
          sound.headshot(s.combo)
          addPopup(`+${pts} HEADSHOT`, '#ffd93b')
        } else {
          sound.hit(s.combo)
          addPopup(`+${pts}`, diff.accent)
        }
        // Resolve this target; schedule the next.
        s.target = null
        setTarget(null)
        s.nextSpawnAt = s.clock + SPAWN_GAP
        if (s.resolved >= TARGET_COUNT) {
          snapshot()
          endGame()
          return
        }
      } else {
        // Whiff or blocked by cover.
        s.combo = 0
        s.misses += 1
        sound.miss()
      }
      snapshot()
    },
    [life, diff.accent, addPopup, snapshot, endGame],
  )

  const handleLockChange = useCallback((isLocked) => {
    lockedRef.current = isLocked
    setLocked(isLocked)
  }, [])

  // Main game loop.
  useEffect(() => {
    let last = performance.now()
    const frame = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const s = g.current
      if (s.ended) return

      // Only advance while the pointer is locked (i.e. actively playing).
      if (lockedRef.current) {
        s.clock += dt
        clockRef.current = s.clock

        if (s.target) {
          if (s.clock - s.target.spawnAtClock >= life) {
            // Target ducked back untouched.
            s.escaped += 1
            s.resolved += 1
            s.combo = 0
            s.target = null
            setTarget(null)
            s.nextSpawnAt = s.clock + SPAWN_GAP
            sound.escape()
          }
          // Below Extreme, hold off on the next peek target while the
          // snitch has the floor so it's never sharing attention with cover.
        } else if (s.clock >= s.nextSpawnAt && s.resolved < TARGET_COUNT && !(diff.snitchSolo && s.snitch)) {
          spawn()
        }

        if (s.snitch) {
          if (s.clock - s.snitch.spawnAtClock >= s.snitch.life) {
            // Flew off untouched — one shot at it per round, gone for good.
            s.snitch = null
            setSnitch(null)
          }
          // Below Extreme, wait for a gap between peek targets before
          // spawning the snitch so it's genuinely the only thing on the map.
        } else if (
          !s.snitchSpawned &&
          s.clock >= SNITCH_MIN_DELAY &&
          s.resolved >= s.snitchAtResolved &&
          !(diff.snitchSolo && s.target)
        ) {
          spawnSnitch()
        }

        if (diff.time - s.clock <= 0 || s.resolved >= TARGET_COUNT) {
          snapshot()
          endGame()
          return
        }
        snapshot()
      }
      rafRef.current = requestAnimationFrame(frame)
    }
    rafRef.current = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafRef.current)
  }, [life, diff.time, spawn, spawnSnitch, snapshot, endGame])

  const handleQuit = useCallback(() => {
    g.current.ended = true
    cancelAnimationFrame(rafRef.current)
    if (document.pointerLockElement) document.exitPointerLock()
    onQuit()
  }, [onQuit])

  const handleRestart = useCallback(() => {
    g.current.ended = true
    cancelAnimationFrame(rafRef.current)
    if (document.pointerLockElement) document.exitPointerLock()
    onRestart()
  }, [onRestart])

  // Spacebar quick-restart — wipes the round and starts it over (App.jsx
  // remounts this component with fresh state). Skip key-repeat so holding
  // the key down doesn't fire it over and over.
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.repeat) return
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault()
        handleRestart()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleRestart])

  return (
    <div className="screen game3d">
      <Canvas
        shadows
        camera={{ position: PLAYER_POS, fov: CAMERA_FOV }}
        gl={{ antialias: true }}
        style={{ background: '#bcd9ec' }}
      >
        <color attach="background" args={['#bcd9ec']} />
        <fog attach="fog" args={['#cddfeb', 18, 42]} />
        <GameScene
          target={target}
          exposure={diff.exposure}
          accent={diff.accent}
          snitch={snitch}
          sensMult={sensMult}
          clockRef={clockRef}
          onFire={handleFire}
          onLockChange={handleLockChange}
          spotPickerRef={spotPickerRef}
          snitchPathPickerRef={snitchPathPickerRef}
        />
      </Canvas>

      {/* Crosshair */}
      <div className={`crosshair ${locked ? '' : 'idle'}`} style={{ '--accent': diff.accent }}>
        <span className="ch-dot" />
        <span className="ch-line ch-top" />
        <span className="ch-line ch-bottom" />
        <span className="ch-line ch-left" />
        <span className="ch-line ch-right" />
      </div>

      {/* Floating score popups */}
      <div className="popup-layer">
        {popups.map((p) => (
          <span key={p.id} className="score-popup" style={{ color: p.color }}>
            {p.text}
          </span>
        ))}
      </div>

      <Hud
        timeLeft={display.timeLeft}
        totalTime={diff.time}
        score={display.score}
        resolved={display.resolved}
        headshots={display.headshots}
        combo={display.combo}
        accent={diff.accent}
        onQuit={handleQuit}
      />

      {!locked && (
        <div className="lock-overlay" onClick={() => {}}>
          <div className="lock-card">
            <h2>{g.current.clock > 0 ? 'PAUSED' : 'READY'}</h2>
            <p>{g.current.clock > 0 ? 'Click to resume aiming' : 'Click to lock your aim and start'}</p>
            <div className="lock-hints">
              <span>🖱️ Move mouse to look · Left-click to fire</span>
              <span>⎋ Esc releases the mouse</span>
              <span>🎯 Headshots score big — mind the cover</span>
              <span>⌴ Space restarts the round</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
