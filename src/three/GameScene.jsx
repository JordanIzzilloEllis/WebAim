import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector2, Vector3, Raycaster } from 'three'
import Environment from './Environment.jsx'
import Target3D from './Target3D.jsx'
import Snitch3D from './Snitch3D.jsx'
import {
  MAX_YAW,
  MAX_PITCH,
  CAMERA_FOV,
  PLAYER_POS,
  PEEK_DISTANCE,
  COVER_SPOTS,
  TARGET_HEAD_Y,
  SNITCH_BOUNDS,
  SNITCH_MAX_TRAVEL,
} from '../config.js'

// Lives inside <Canvas>. Owns the first-person camera (pointer-lock mouse-look),
// the fire raycast from the crosshair, and renders the arena + active target.
export default function GameScene({
  target,
  exposure,
  accent,
  snitch,
  sensRadPerPixel,
  clockRef,
  onFire,
  onLockChange,
  spotPickerRef,
  snitchPathPickerRef,
}) {
  const { camera, gl, scene, raycaster } = useThree()
  const yaw = useRef(0)
  const pitch = useRef(0)
  const locked = useRef(false)
  const losRay = useRef(new Raycaster())

  // Expose a spot picker to the game loop that only returns spawn spots the
  // player has a clear line of sight to the target's HEAD (so head-only peeks
  // are valid, but nothing spawns fully hidden behind cover and escapes unseen).
  spotPickerRef.current = (excludeIndex) => {
    const obstacles = []
    scene.traverse((o) => {
      if (o.isMesh && o.userData && o.userData.kind === 'obstacle') obstacles.push(o)
    })

    const hasLineOfSight = (point) => {
      const dir = point.clone().sub(camera.position)
      const dist = dir.length()
      dir.normalize()
      losRay.current.set(camera.position, dir)
      losRay.current.far = dist - 0.2 // stop just short of the target
      return losRay.current.intersectObjects(obstacles, false).length === 0
    }

    // Random order so visible spots still vary between rounds.
    const order = [...COVER_SPOTS.keys()]
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[order[i], order[j]] = [order[j], order[i]]
    }

    let fallback = -1
    for (const i of order) {
      const spot = COVER_SPOTS[i]
      const ex = spot.pos[0] + spot.side * PEEK_DISTANCE
      const head = new Vector3(ex, (spot.elev || 0) + TARGET_HEAD_Y, spot.pos[1] - 0.2)
      if (hasLineOfSight(head)) {
        if (i !== excludeIndex) return i
        if (fallback === -1) fallback = i
      }
    }
    // Only the just-used spot is visible (or somehow none) — take what we can.
    return fallback !== -1 ? fallback : order[0]
  }

  // Expose a flight-path picker for the golden snitch. Unlike the cover
  // targets (which are only ever partly hidden and always have a valid
  // head-only peek), the snitch's whole flight has to clear line of sight —
  // it can fly close to a tall cover pillar and get swallowed for its entire
  // exposure window otherwise. Sample points along a candidate path
  // (including the wiggle) and score how many are visible from the player's
  // eye; a fully-clear path wins immediately, but the snitch always spawns —
  // if nothing comes back perfectly clear after every attempt, the least-
  // occluded candidate is used rather than skipping the round.
  snitchPathPickerRef.current = () => {
    const obstacles = []
    scene.traverse((o) => {
      if (o.isMesh && o.userData && o.userData.kind === 'obstacle') obstacles.push(o)
    })

    const hasLineOfSight = (point) => {
      const dir = point.clone().sub(camera.position)
      const dist = dir.length()
      dir.normalize()
      losRay.current.set(camera.position, dir)
      losRay.current.far = dist - 0.05
      return losRay.current.intersectObjects(obstacles, false).length === 0
    }

    const { xMin, xMax, yMin, yMax, zMin, zMax } = SNITCH_BOUNDS
    const SAMPLES = 20 // fine enough that a thin pillar edge can't slip between checks

    let best = null
    let bestVisible = -1

    for (let attempt = 0; attempt < 40; attempt++) {
      const start = new Vector3(rand(xMin, xMax), rand(yMin, yMax), rand(zMin, zMax))

      const dir = new Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1))
      if (dir.lengthSq() < 1e-6) dir.set(1, 0, 0)
      dir.normalize()
      const travel = rand(SNITCH_MAX_TRAVEL * 0.5, SNITCH_MAX_TRAVEL)
      const end = start.clone().addScaledVector(dir, travel)
      end.x = clamp(end.x, xMin, xMax)
      end.y = clamp(end.y, yMin, yMax)
      end.z = clamp(end.z, zMin, zMax)

      const pathDir = end.clone().sub(start)
      const perp = new Vector3(-pathDir.z, 0, pathDir.x)
      if (perp.lengthSq() < 1e-6) perp.set(1, 0, 0)
      perp.normalize()

      const wiggleAmp = rand(0.35, 0.75)
      const wiggleFreq = rand(2, 3.5)
      const phase = Math.random() * Math.PI * 2
      const candidate = { start, end, perp, wiggleAmp, wiggleFreq, phase }

      let visibleCount = 0
      for (let i = 0; i <= SAMPLES; i++) {
        const e = i / SAMPLES
        const p = start.clone().lerp(end, e)
        const wiggle = Math.sin(e * Math.PI * wiggleFreq + phase) * wiggleAmp * Math.sin(e * Math.PI)
        p.addScaledVector(perp, wiggle)
        if (hasLineOfSight(p)) visibleCount += 1
      }
      if (visibleCount > SAMPLES) return candidate // every sample clear
      if (visibleCount > bestVisible) {
        bestVisible = visibleCount
        best = candidate
      }
    }
    return best
  }

  // Keep the latest fire handler without re-binding listeners every render.
  const onFireRef = useRef(onFire)
  onFireRef.current = onFire
  const onLockRef = useRef(onLockChange)
  onLockRef.current = onLockChange

  // One-time camera setup.
  useEffect(() => {
    camera.position.set(...PLAYER_POS)
    camera.fov = CAMERA_FOV
    camera.rotation.order = 'YXZ'
    camera.updateProjectionMatrix()
  }, [camera])

  // Pointer lock + mouse-look + fire wiring.
  useEffect(() => {
    const canvas = gl.domElement
    const center = new Vector2(0, 0)

    const doFire = () => {
      raycaster.setFromCamera(center, camera)
      const hits = raycaster.intersectObjects(scene.children, true)
      let kind = 'none'
      for (const h of hits) {
        const k = h.object?.userData?.kind
        if (k) {
          kind = k
          break
        }
      }
      onFireRef.current(kind)
    }

    const onMouseDown = (e) => {
      if (e.button !== 0) return
      if (document.pointerLockElement !== canvas) {
        canvas.requestPointerLock()
      } else {
        doFire()
      }
    }

    const onMouseMove = (e) => {
      if (document.pointerLockElement !== canvas) return
      yaw.current = clamp(yaw.current - e.movementX * sensRadPerPixel, -MAX_YAW, MAX_YAW)
      pitch.current = clamp(pitch.current - e.movementY * sensRadPerPixel, -MAX_PITCH, MAX_PITCH)
    }

    const onLockChange = () => {
      locked.current = document.pointerLockElement === canvas
      onLockRef.current(locked.current)
    }

    canvas.addEventListener('mousedown', onMouseDown)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('pointerlockchange', onLockChange)

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('pointerlockchange', onLockChange)
      if (document.pointerLockElement === canvas) document.exitPointerLock()
    }
  }, [gl, camera, scene, raycaster, sensRadPerPixel])

  useFrame(() => {
    camera.rotation.set(pitch.current, yaw.current, 0)
  })

  return (
    <>
      <Environment />
      {target && (
        <Target3D
          key={target.id}
          spot={target.spot}
          exposure={exposure}
          accent={accent}
          spawnAtClock={target.spawnAtClock}
          clockRef={clockRef}
        />
      )}
      {snitch && (
        <Snitch3D
          key={snitch.id}
          path={snitch.path}
          spawnAtClock={snitch.spawnAtClock}
          life={snitch.life}
          clockRef={clockRef}
        />
      )}
    </>
  )
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}

function rand(a, b) {
  return a + Math.random() * (b - a)
}
