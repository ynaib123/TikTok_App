import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { SceneNode } from './agentNodes'

interface NodeRendererProps {
  node: SceneNode
  hovered: boolean
  selected: boolean
  onPointerOver: () => void
  onPointerOut: () => void
  onClick: () => void
}

const ACCENT = '#ffc36f'

/* ───────── Operator (humanoid + hex platform) ───────── */
export function OperatorShape({
  node,
  hovered,
  selected,
  onPointerOver,
  onPointerOut,
  onClick,
}: NodeRendererProps) {
  const groupRef = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.15
  })
  const isActive = hovered || selected
  const ringIntensity = isActive ? 1.4 : 0.45

  return (
    <group
      ref={groupRef}
      position={node.position}
      onPointerOver={(e) => {
        e.stopPropagation()
        onPointerOver()
      }}
      onPointerOut={onPointerOut}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      {/* Hex platform base */}
      <mesh position={[0, -1.65, 0]} castShadow>
        <cylinderGeometry args={[1.1, 1.25, 0.18, 6]} />
        <meshStandardMaterial color="#1b1b1b" roughness={0.45} metalness={0.7} />
      </mesh>
      <mesh position={[0, -1.55, 0]}>
        <cylinderGeometry args={[1.0, 1.02, 0.04, 6]} />
        <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={ringIntensity} />
      </mesh>

      {/* Body cluster */}
      <group position={[0, -0.2, 0]} castShadow>
        {/* Head */}
        <mesh position={[0, 1.25, 0]} castShadow>
          <sphereGeometry args={[0.36, 28, 22]} />
          <meshStandardMaterial
            color="#dcdcdc"
            roughness={0.32}
            metalness={0.6}
            emissive={isActive ? ACCENT : '#000'}
            emissiveIntensity={isActive ? 0.25 : 0}
          />
        </mesh>
        {/* Visor band */}
        <mesh position={[0, 1.28, 0.18]}>
          <boxGeometry args={[0.55, 0.08, 0.22]} />
          <meshStandardMaterial
            color={ACCENT}
            emissive={ACCENT}
            emissiveIntensity={isActive ? 1.5 : 0.6}
          />
        </mesh>
        {/* Neck */}
        <mesh position={[0, 0.85, 0]}>
          <cylinderGeometry args={[0.12, 0.16, 0.18, 16]} />
          <meshStandardMaterial color="#9c9c9c" roughness={0.4} metalness={0.5} />
        </mesh>
        {/* Shoulders */}
        <mesh position={[-0.42, 0.6, 0]}>
          <sphereGeometry args={[0.18, 16, 14]} />
          <meshStandardMaterial color="#bdbdbd" roughness={0.42} metalness={0.55} />
        </mesh>
        <mesh position={[0.42, 0.6, 0]}>
          <sphereGeometry args={[0.18, 16, 14]} />
          <meshStandardMaterial color="#bdbdbd" roughness={0.42} metalness={0.55} />
        </mesh>
        {/* Torso */}
        <mesh position={[0, 0.18, 0]} castShadow>
          <cylinderGeometry args={[0.45, 0.55, 0.85, 18]} />
          <meshStandardMaterial color="#9c9c9c" roughness={0.42} metalness={0.5} />
        </mesh>
        {/* Chest plate */}
        <mesh position={[0, 0.32, 0.32]}>
          <boxGeometry args={[0.4, 0.4, 0.05]} />
          <meshStandardMaterial
            color="#1b1b1b"
            emissive={ACCENT}
            emissiveIntensity={isActive ? 0.6 : 0.18}
            roughness={0.3}
            metalness={0.7}
          />
        </mesh>
        {/* Hips / waist */}
        <mesh position={[0, -0.4, 0]}>
          <cylinderGeometry args={[0.5, 0.42, 0.25, 18]} />
          <meshStandardMaterial color="#7c7c7c" roughness={0.5} metalness={0.45} />
        </mesh>
      </group>

      {/* Floating data ring above head */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 1.85, 0]}>
        <torusGeometry args={[0.5, 0.012, 8, 32]} />
        <meshStandardMaterial
          color={ACCENT}
          emissive={ACCENT}
          emissiveIntensity={isActive ? 1.6 : 0.5}
          transparent
          opacity={0.85}
        />
      </mesh>

      <NodeLabel label={node.label} sub="operator" active={isActive} />
    </group>
  )
}

/* ───────── Agent (multi-layer crystalline core + halo + 3 orbits) ───────── */
export function AgentBrainShape({
  node,
  hovered,
  selected,
  onPointerOver,
  onPointerOut,
  onClick,
}: NodeRendererProps) {
  const orbRef = useRef<THREE.Mesh>(null)
  const ring1Ref = useRef<THREE.Mesh>(null)
  const ring2Ref = useRef<THREE.Mesh>(null)
  const ring3Ref = useRef<THREE.Mesh>(null)
  const haloRef = useRef<THREE.Mesh>(null)
  useFrame(({ clock }, delta) => {
    if (orbRef.current) orbRef.current.rotation.y += delta * 0.55
    if (ring1Ref.current) ring1Ref.current.rotation.x += delta * 0.6
    if (ring2Ref.current) ring2Ref.current.rotation.z += delta * 0.45
    if (ring3Ref.current) ring3Ref.current.rotation.y += delta * 0.3
    if (haloRef.current) {
      const pulse = 1 + Math.sin(clock.elapsedTime * 1.4) * 0.06
      haloRef.current.scale.setScalar(pulse)
    }
  })
  const isActive = hovered || selected

  return (
    <group
      position={node.position}
      onPointerOver={(e) => {
        e.stopPropagation()
        onPointerOver()
      }}
      onPointerOut={onPointerOut}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      {/* Outer halo sphere */}
      <mesh ref={haloRef}>
        <sphereGeometry args={[1.6, 32, 24]} />
        <meshBasicMaterial color={ACCENT} transparent opacity={isActive ? 0.06 : 0.03} />
      </mesh>

      {/* Crystalline outer shell */}
      <mesh ref={orbRef} castShadow>
        <icosahedronGeometry args={[0.85, 1]} />
        <meshStandardMaterial
          color={ACCENT}
          emissive={ACCENT}
          emissiveIntensity={isActive ? 1.4 : 0.8}
          roughness={0.18}
          metalness={0.78}
          flatShading
        />
      </mesh>

      {/* Inner glowing core */}
      <mesh>
        <sphereGeometry args={[0.42, 28, 20]} />
        <meshStandardMaterial
          color="#fff5e1"
          emissive={ACCENT}
          emissiveIntensity={isActive ? 1.8 : 1.1}
        />
      </mesh>

      {/* Innermost spark */}
      <mesh>
        <sphereGeometry args={[0.16, 16, 12]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* Orbit rings (3 axes) */}
      <mesh ref={ring1Ref} rotation={[Math.PI / 2.2, 0, 0]}>
        <torusGeometry args={[1.18, 0.025, 8, 96]} />
        <meshStandardMaterial
          color={ACCENT}
          emissive={ACCENT}
          emissiveIntensity={1.4}
          transparent
          opacity={0.9}
        />
      </mesh>
      <mesh ref={ring2Ref} rotation={[0, Math.PI / 3, Math.PI / 4]}>
        <torusGeometry args={[1.42, 0.018, 8, 96]} />
        <meshStandardMaterial
          color={ACCENT}
          emissive={ACCENT}
          emissiveIntensity={1.1}
          transparent
          opacity={0.6}
        />
      </mesh>
      <mesh ref={ring3Ref} rotation={[Math.PI / 4, 0, Math.PI / 6]}>
        <torusGeometry args={[1.65, 0.012, 8, 96]} />
        <meshStandardMaterial
          color={ACCENT}
          emissive={ACCENT}
          emissiveIntensity={0.8}
          transparent
          opacity={0.4}
        />
      </mesh>

      {/* Floating sparks */}
      {[0, 1, 2].map((i) => (
        <FloatingSpark
          key={i}
          radius={1.1 + i * 0.18}
          speed={0.6 + i * 0.15}
          offset={(i / 3) * Math.PI * 2}
        />
      ))}

      <NodeLabel label={node.label} sub="claude" active={isActive} />
    </group>
  )
}

function FloatingSpark({
  radius,
  speed,
  offset,
}: {
  radius: number
  speed: number
  offset: number
}) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime * speed + offset
    ref.current.position.set(Math.cos(t) * radius, Math.sin(t * 0.7) * 0.3, Math.sin(t) * radius)
  })
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.04, 8, 8]} />
      <meshStandardMaterial color="#ffffff" emissive={ACCENT} emissiveIntensity={2} />
    </mesh>
  )
}

/* ───────── Backend (full server rack with LCD + cooling vents) ───────── */
export function ServerRackShape({
  node,
  hovered,
  selected,
  onPointerOver,
  onPointerOut,
  onClick,
}: NodeRendererProps) {
  const groupRef = useRef<THREE.Group>(null)
  const ledRefs = useRef<Array<THREE.Mesh | null>>([])
  useFrame(({ clock }, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.12
    ledRefs.current.forEach((mesh, i) => {
      if (!mesh) return
      const mat = mesh.material as THREE.MeshStandardMaterial
      const blink = (Math.sin(clock.elapsedTime * (1.5 + i * 0.4) + i) + 1) / 2
      mat.emissiveIntensity = (hovered || selected ? 1.5 : 0.8) * (0.4 + blink * 0.6)
    })
  })
  const slots = useMemo(() => [-0.6, -0.18, 0.24, 0.66], [])

  return (
    <group
      ref={groupRef}
      position={node.position}
      onPointerOver={(e) => {
        e.stopPropagation()
        onPointerOver()
      }}
      onPointerOut={onPointerOut}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      {/* Rack feet */}
      <mesh position={[-0.45, -1.55, 0.3]} castShadow>
        <boxGeometry args={[0.18, 0.1, 0.18]} />
        <meshStandardMaterial color="#0c0c0c" />
      </mesh>
      <mesh position={[0.45, -1.55, 0.3]} castShadow>
        <boxGeometry args={[0.18, 0.1, 0.18]} />
        <meshStandardMaterial color="#0c0c0c" />
      </mesh>
      <mesh position={[-0.45, -1.55, -0.3]} castShadow>
        <boxGeometry args={[0.18, 0.1, 0.18]} />
        <meshStandardMaterial color="#0c0c0c" />
      </mesh>
      <mesh position={[0.45, -1.55, -0.3]} castShadow>
        <boxGeometry args={[0.18, 0.1, 0.18]} />
        <meshStandardMaterial color="#0c0c0c" />
      </mesh>

      {/* Chassis */}
      <mesh castShadow>
        <boxGeometry args={[1.4, 2.6, 0.95]} />
        <meshStandardMaterial color="#1b1b1b" roughness={0.45} metalness={0.78} />
      </mesh>
      {/* Chassis edge highlight */}
      <mesh position={[0, 1.28, 0]}>
        <boxGeometry args={[1.42, 0.04, 0.97]} />
        <meshStandardMaterial
          color={ACCENT}
          emissive={ACCENT}
          emissiveIntensity={hovered || selected ? 1.2 : 0.4}
        />
      </mesh>

      {/* Front bezel */}
      <mesh position={[0, 0, 0.48]}>
        <boxGeometry args={[1.32, 2.5, 0.02]} />
        <meshStandardMaterial color="#161616" roughness={0.4} metalness={0.6} />
      </mesh>

      {/* LCD display at top */}
      <mesh position={[0, 0.95, 0.5]}>
        <boxGeometry args={[0.85, 0.32, 0.012]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.2} metalness={0.85} />
      </mesh>
      <mesh position={[0, 0.95, 0.508]}>
        <boxGeometry args={[0.78, 0.24, 0.004]} />
        <meshStandardMaterial
          color="#22d3ee"
          emissive="#22d3ee"
          emissiveIntensity={hovered || selected ? 1.6 : 0.7}
        />
      </mesh>

      {/* Server slots */}
      {slots.map((y, i) => (
        <group key={i} position={[0, y, 0.5]}>
          <mesh>
            <boxGeometry args={[1.2, 0.36, 0.02]} />
            <meshStandardMaterial color="#232323" roughness={0.4} metalness={0.55} />
          </mesh>
          {/* Slot frame */}
          <mesh position={[0, 0, 0.011]}>
            <boxGeometry args={[1.18, 0.34, 0.005]} />
            <meshStandardMaterial color="#0c0c0c" />
          </mesh>
          {/* Vent grid */}
          <mesh position={[-0.36, 0, 0.014]}>
            <boxGeometry args={[0.28, 0.22, 0.006]} />
            <meshStandardMaterial color="#000" />
          </mesh>
          {/* Drive bays */}
          <mesh position={[0.05, 0, 0.014]}>
            <boxGeometry args={[0.35, 0.22, 0.006]} />
            <meshStandardMaterial color="#1f1f1f" roughness={0.3} metalness={0.7} />
          </mesh>
          {/* LEDs */}
          <mesh
            ref={(el) => {
              ledRefs.current[i * 2] = el
            }}
            position={[0.42, 0.06, 0.018]}
          >
            <sphereGeometry args={[0.028, 12, 12]} />
            <meshStandardMaterial color="#12b76a" emissive="#12b76a" emissiveIntensity={1.2} />
          </mesh>
          <mesh
            ref={(el) => {
              ledRefs.current[i * 2 + 1] = el
            }}
            position={[0.42, -0.06, 0.018]}
          >
            <sphereGeometry args={[0.028, 12, 12]} />
            <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={1} />
          </mesh>
          {/* Drive label slit */}
          <mesh position={[0.05, -0.13, 0.014]}>
            <boxGeometry args={[0.32, 0.02, 0.006]} />
            <meshStandardMaterial color="#3a3a3a" />
          </mesh>
        </group>
      ))}

      <NodeLabel label={node.label} sub="spring boot" active={hovered || selected} />
    </group>
  )
}

/* ───────── Postgres (DB stack with vertical data lines + glow base) ───────── */
export function PostgresStackShape({
  node,
  hovered,
  selected,
  onPointerOver,
  onPointerOut,
  onClick,
}: NodeRendererProps) {
  const groupRef = useRef<THREE.Group>(null)
  const coreRef = useRef<THREE.Mesh>(null)
  useFrame(({ clock }, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.2
    if (coreRef.current) {
      const pulse = (Math.sin(clock.elapsedTime * 2.2) + 1) / 2
      ;(coreRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        1.2 + pulse * 1.5
    }
  })
  const isActive = hovered || selected
  const tiers = useMemo(() => [-0.5, 0, 0.5], [])
  const dataLines = useMemo(() => Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2), [])

  return (
    <group
      ref={groupRef}
      position={node.position}
      onPointerOver={(e) => {
        e.stopPropagation()
        onPointerOver()
      }}
      onPointerOut={onPointerOut}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      {/* Base platform */}
      <mesh position={[0, -1.0, 0]} castShadow>
        <cylinderGeometry args={[1.05, 1.15, 0.1, 32]} />
        <meshStandardMaterial color="#1b1b1b" roughness={0.5} metalness={0.7} />
      </mesh>
      <mesh position={[0, -0.94, 0]}>
        <ringGeometry args={[0.85, 1.0, 32]} />
        <meshStandardMaterial
          color="#12b76a"
          emissive="#12b76a"
          emissiveIntensity={isActive ? 1.3 : 0.5}
        />
      </mesh>

      {/* Disk tiers */}
      {tiers.map((y, i) => (
        <group key={i} position={[0, y, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.9, 0.9, 0.32, 36]} />
            <meshStandardMaterial
              color="#12b76a"
              emissive="#12b76a"
              emissiveIntensity={isActive ? 0.55 : 0.22}
              roughness={0.32}
              metalness={0.65}
            />
          </mesh>
          {/* Top rim */}
          <mesh position={[0, 0.165, 0]}>
            <torusGeometry args={[0.9, 0.018, 8, 36]} />
            <meshStandardMaterial
              color="#a7f3d0"
              emissive="#a7f3d0"
              emissiveIntensity={isActive ? 1.4 : 0.55}
            />
          </mesh>
          {/* Bottom rim */}
          <mesh position={[0, -0.165, 0]}>
            <torusGeometry args={[0.9, 0.012, 8, 36]} />
            <meshStandardMaterial
              color="#0a4a25"
              emissive="#0a4a25"
              emissiveIntensity={isActive ? 0.8 : 0.3}
            />
          </mesh>
        </group>
      ))}

      {/* Vertical data flow lines around the stack */}
      {dataLines.map((angle, i) => (
        <mesh key={i} position={[Math.cos(angle) * 0.95, 0, Math.sin(angle) * 0.95]}>
          <boxGeometry args={[0.018, 1.55, 0.018]} />
          <meshStandardMaterial
            color="#a7f3d0"
            emissive="#a7f3d0"
            emissiveIntensity={isActive ? 1 : 0.3}
            transparent
            opacity={0.45}
          />
        </mesh>
      ))}

      {/* Pulsing core */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.16, 18, 18]} />
        <meshStandardMaterial color="#a7f3d0" emissive="#12b76a" emissiveIntensity={1.4} />
      </mesh>

      <NodeLabel label={node.label} sub="postgres 16" active={isActive} />
    </group>
  )
}

/* ───────── Shared label ───────── */
function NodeLabel({ label, sub, active }: { label: string; sub: string; active: boolean }) {
  return (
    <Html position={[0, -1.95, 0]} center distanceFactor={9} style={{ pointerEvents: 'none' }}>
      <div
        style={{
          padding: '5px 14px',
          background: active ? 'rgba(255, 195, 111, 0.14)' : 'rgba(11, 11, 11, 0.92)',
          border: `1px solid ${active ? 'rgba(255, 195, 111, 0.6)' : 'rgba(255, 195, 111, 0.32)'}`,
          borderRadius: 999,
          color: '#f3f3f3',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 0.7,
          textTransform: 'uppercase',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          whiteSpace: 'nowrap',
          textAlign: 'center',
          backdropFilter: 'blur(4px)',
          transition: 'background 180ms ease, border-color 180ms ease',
        }}
      >
        <div>{label}</div>
        <div style={{ fontSize: 9, opacity: 0.55, fontWeight: 500, letterSpacing: 0.5 }}>{sub}</div>
      </div>
    </Html>
  )
}
