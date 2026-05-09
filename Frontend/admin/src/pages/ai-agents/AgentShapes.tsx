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

/* ───────── Operator (humanoid) ───────── */
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
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.18
  })
  const emissive = selected ? '#ffc36f' : node.color
  const emissiveIntensity = hovered || selected ? 0.55 : 0.18

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
      {/* Head */}
      <mesh position={[0, 1.0, 0]}>
        <sphereGeometry args={[0.32, 24, 18]} />
        <meshStandardMaterial
          color={node.color}
          roughness={0.32}
          metalness={0.55}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>
      {/* Neck */}
      <mesh position={[0, 0.62, 0]}>
        <cylinderGeometry args={[0.1, 0.13, 0.18, 12]} />
        <meshStandardMaterial color={node.color} roughness={0.4} metalness={0.5} />
      </mesh>
      {/* Torso */}
      <mesh position={[0, 0.06, 0]}>
        <coneGeometry args={[0.55, 1.05, 16]} />
        <meshStandardMaterial
          color={node.color}
          roughness={0.45}
          metalness={0.4}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity * 0.6}
        />
      </mesh>
      {/* Base ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.55, 0]}>
        <torusGeometry args={[0.7, 0.04, 12, 32]} />
        <meshStandardMaterial
          color="#ffc36f"
          emissive="#ffc36f"
          emissiveIntensity={hovered ? 0.9 : 0.35}
        />
      </mesh>
      <NodeLabel label={node.label} sub="user" />
    </group>
  )
}

/* ───────── Agent (crystalline brain orb) ───────── */
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
  useFrame((_, delta) => {
    if (orbRef.current) orbRef.current.rotation.y += delta * 0.6
    if (ring1Ref.current) ring1Ref.current.rotation.x += delta * 0.5
    if (ring2Ref.current) ring2Ref.current.rotation.z += delta * 0.4
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
      <mesh ref={orbRef}>
        <icosahedronGeometry args={[0.8, 1]} />
        <meshStandardMaterial
          color={node.color}
          emissive={node.color}
          emissiveIntensity={isActive ? 1.2 : 0.7}
          roughness={0.2}
          metalness={0.7}
          flatShading
        />
      </mesh>
      {/* Inner core */}
      <mesh>
        <sphereGeometry args={[0.45, 24, 18]} />
        <meshStandardMaterial
          color="#ffe7c0"
          emissive="#ffc36f"
          emissiveIntensity={isActive ? 1.6 : 0.9}
        />
      </mesh>
      {/* Orbit rings */}
      <mesh ref={ring1Ref} rotation={[Math.PI / 2.2, 0, 0]}>
        <torusGeometry args={[1.15, 0.025, 8, 64]} />
        <meshStandardMaterial
          color="#ffc36f"
          emissive="#ffc36f"
          emissiveIntensity={1.2}
          transparent
          opacity={0.85}
        />
      </mesh>
      <mesh ref={ring2Ref} rotation={[0, Math.PI / 3, Math.PI / 4]}>
        <torusGeometry args={[1.35, 0.018, 8, 64]} />
        <meshStandardMaterial
          color="#ffc36f"
          emissive="#ffc36f"
          emissiveIntensity={1}
          transparent
          opacity={0.6}
        />
      </mesh>
      <NodeLabel label={node.label} sub="agent" />
    </group>
  )
}

/* ───────── Backend (server rack stack) ───────── */
export function ServerRackShape({
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
  const slots = useMemo(() => [-0.55, -0.12, 0.31], [])
  const ledOn = hovered || selected

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
      {/* Chassis */}
      <mesh>
        <boxGeometry args={[1.3, 1.55, 0.85]} />
        <meshStandardMaterial color="#1b1b1b" roughness={0.5} metalness={0.7} />
      </mesh>
      {/* Front bezel */}
      <mesh position={[0, 0, 0.43]}>
        <boxGeometry args={[1.22, 1.45, 0.02]} />
        <meshStandardMaterial color="#161616" roughness={0.4} metalness={0.6} />
      </mesh>
      {/* Server slots with LED strips */}
      {slots.map((y, i) => (
        <group key={i} position={[0, y, 0.45]}>
          <mesh>
            <boxGeometry args={[1.1, 0.32, 0.02]} />
            <meshStandardMaterial color="#232323" roughness={0.4} metalness={0.5} />
          </mesh>
          {/* Vent grid */}
          <mesh position={[-0.32, 0, 0.012]}>
            <boxGeometry args={[0.2, 0.18, 0.006]} />
            <meshStandardMaterial color="#0c0c0c" />
          </mesh>
          {/* LED */}
          <mesh position={[0.42, 0, 0.014]}>
            <sphereGeometry args={[0.035, 12, 12]} />
            <meshStandardMaterial
              color={ledOn ? '#12b76a' : '#0a3a1f'}
              emissive={ledOn ? '#12b76a' : '#000'}
              emissiveIntensity={ledOn ? 1.4 : 0}
            />
          </mesh>
          <mesh position={[0.32, 0, 0.014]}>
            <sphereGeometry args={[0.035, 12, 12]} />
            <meshStandardMaterial
              color={ledOn ? '#ffc36f' : '#3a2a0a'}
              emissive={ledOn ? '#ffc36f' : '#000'}
              emissiveIntensity={ledOn ? 1.2 : 0}
            />
          </mesh>
        </group>
      ))}
      <NodeLabel label={node.label} sub="backend" />
    </group>
  )
}

/* ───────── Postgres (DB cylinder stack) ───────── */
export function PostgresStackShape({
  node,
  hovered,
  selected,
  onPointerOver,
  onPointerOut,
  onClick,
}: NodeRendererProps) {
  const groupRef = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.22
  })
  const isActive = hovered || selected
  const tiers = useMemo(() => [-0.45, 0, 0.45], [])

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
      {tiers.map((y, i) => (
        <group key={i} position={[0, y, 0]}>
          {/* Disk body */}
          <mesh>
            <cylinderGeometry args={[0.85, 0.85, 0.32, 32]} />
            <meshStandardMaterial
              color={node.color}
              emissive={node.color}
              emissiveIntensity={isActive ? 0.6 : 0.25}
              roughness={0.35}
              metalness={0.6}
            />
          </mesh>
          {/* Top rim highlight */}
          <mesh position={[0, 0.165, 0]}>
            <torusGeometry args={[0.85, 0.015, 8, 32]} />
            <meshStandardMaterial
              color="#a7f3d0"
              emissive="#a7f3d0"
              emissiveIntensity={isActive ? 1 : 0.4}
            />
          </mesh>
        </group>
      ))}
      {/* Pulsing core glow */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial
          color="#a7f3d0"
          emissive="#12b76a"
          emissiveIntensity={isActive ? 2 : 1}
        />
      </mesh>
      <NodeLabel label={node.label} sub="postgres" />
    </group>
  )
}

function NodeLabel({ label, sub }: { label: string; sub: string }) {
  return (
    <Html position={[0, -1.15, 0]} center distanceFactor={9} style={{ pointerEvents: 'none' }}>
      <div
        style={{
          padding: '4px 12px',
          background: 'rgba(17, 17, 17, 0.92)',
          border: '1px solid rgba(255, 195, 111, 0.32)',
          borderRadius: 999,
          color: '#f3f3f3',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          whiteSpace: 'nowrap',
          textAlign: 'center',
        }}
      >
        <div>{label}</div>
        <div style={{ fontSize: 9, opacity: 0.5, fontWeight: 500, letterSpacing: 0.4 }}>{sub}</div>
      </div>
    </Html>
  )
}
