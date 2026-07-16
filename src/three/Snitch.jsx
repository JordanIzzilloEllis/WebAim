import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { DoubleSide } from 'three'

// A tiny golden ball with a pair of fluttering wings, tagged kind:'snitch' so
// the fire raycast scores it as a bonus catch (see Game3D's handleFire). The
// wings carry no userData — shots that clip a wing instead of the body pass
// straight through, same as they would a real miss.
const SNITCH = { kind: 'snitch' }

export default function Snitch({ clockRef }) {
  const wingL = useRef(null)
  const wingR = useRef(null)

  useFrame(() => {
    const t = clockRef.current
    const flap = Math.sin(t * 28) * 0.55 + 0.15
    if (wingL.current) wingL.current.rotation.z = flap
    if (wingR.current) wingR.current.rotation.z = -flap
  })

  return (
    <group>
      <mesh castShadow userData={SNITCH}>
        <sphereGeometry args={[0.1, 16, 14]} />
        <meshStandardMaterial color="#ffd23f" emissive="#e8a800" emissiveIntensity={0.4} metalness={0.75} roughness={0.25} />
      </mesh>
      <group position={[-0.06, 0.02, 0]} ref={wingL}>
        <mesh position={[-0.13, 0, 0]} rotation={[0, 0, 0.15]}>
          <planeGeometry args={[0.28, 0.14]} />
          <meshStandardMaterial color="#f5f7fa" transparent opacity={0.85} side={DoubleSide} roughness={0.4} />
        </mesh>
      </group>
      <group position={[0.06, 0.02, 0]} ref={wingR}>
        <mesh position={[0.13, 0, 0]} rotation={[0, 0, -0.15]}>
          <planeGeometry args={[0.28, 0.14]} />
          <meshStandardMaterial color="#f5f7fa" transparent opacity={0.85} side={DoubleSide} roughness={0.4} />
        </mesh>
      </group>
    </group>
  )
}
