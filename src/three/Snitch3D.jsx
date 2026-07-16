import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import Snitch from './Snitch.jsx'

const FADE = 0.12 // seconds to pop in/out at each end of the flight, not a snap

// Flies the golden snitch along a precomputed flight path (start/end/wiggle —
// see GameScene's snitchPathPickerRef, which only ever hands out paths that
// stay in the player's line of sight the whole way), timed off the shared
// game clock like Target3D so it pauses exactly when the game pauses.
export default function Snitch3D({ path, spawnAtClock, life, clockRef }) {
  const groupRef = useRef(null)

  useFrame(() => {
    const g = groupRef.current
    if (!g) return
    const elapsed = clockRef.current - spawnAtClock
    const e = Math.max(0, Math.min(1, elapsed / life))

    const pos = path.start.clone().lerp(path.end, e)
    const wiggle = Math.sin(e * Math.PI * path.wiggleFreq + path.phase) * path.wiggleAmp * Math.sin(e * Math.PI)
    pos.addScaledVector(path.perp, wiggle)
    g.position.copy(pos)

    const fadeIn = Math.min(1, elapsed / FADE)
    const fadeOut = Math.min(1, (life - elapsed) / FADE)
    g.scale.setScalar(Math.max(0, Math.min(fadeIn, fadeOut)))
  })

  return (
    <group ref={groupRef}>
      <Snitch clockRef={clockRef} />
    </group>
  )
}
