import { useFrame } from '@react-three/fiber'
import { Canvas } from '@react-three/fiber'
import { Html, OrbitControls, Stars } from '@react-three/drei'
import { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import type { AgentEvent } from '../AIAgentsPage'

interface NodeDef {
  id: 'user' | 'agent' | 'backend' | 'postgres'
  label: string
  position: [number, number, number]
  color: string
}

const NODES: NodeDef[] = [
  { id: 'user',     label: 'User',     position: [-6, 0,  0], color: '#22d3ee' },
  { id: 'agent',    label: 'Agent',    position: [-2, 1.5, 0], color: '#a855f7' },
  { id: 'backend',  label: 'Backend',  position: [ 2, 1.5, 0], color: '#f59e0b' },
  { id: 'postgres', label: 'Postgres', position: [ 6, 0,  0], color: '#22c55e' },
]

const EDGES: Array<[NodeDef['id'], NodeDef['id']]> = [
  ['user', 'agent'],
  ['agent', 'backend'],
  ['backend', 'postgres'],
]

interface ParticleState {
  id: number
  from: [number, number, number]
  to: [number, number, number]
  color: string
  startTs: number
  durationMs: number
}

function eventColor(type: AgentEvent['type']): string {
  if (type === 'agent_tool_call') return '#22d3ee'
  if (type === 'agent_run_finished') return '#22c55e'
  return '#a855f7'
}

function eventEdge(type: AgentEvent['type']): [NodeDef['id'], NodeDef['id']] {
  if (type === 'agent_tool_call') return ['agent', 'backend']
  if (type === 'agent_run_finished') return ['agent', 'user']
  return ['user', 'agent']
}

interface AgentsSceneProps {
  events: AgentEvent[]
}

export default function AgentsScene({ events }: AgentsSceneProps) {
  return (
    <Canvas camera={{ position: [0, 4, 14], fov: 45 }} dpr={[1, 1.6]}>
      <color attach="background" args={[0x000005]} />
      <ambientLight intensity={0.4} />
      <pointLight position={[8, 10, 8]} intensity={1.2} color="#a855f7" />
      <pointLight position={[-8, 6, 4]} intensity={0.8} color="#22d3ee" />
      <Stars radius={80} depth={50} count={2200} factor={3} saturation={0} fade speed={0.6} />
      <Edges />
      {NODES.map((n) => <Node key={n.id} node={n} />)}
      <ParticleFlow events={events} />
      <OrbitControls enablePan={false} maxDistance={22} minDistance={8} />
    </Canvas>
  )
}

function Node({ node }: { node: NodeDef }) {
  const meshRef = useRef<THREE.Mesh | null>(null)
  useFrame((_, delta) => {
    if (!meshRef.current) return
    meshRef.current.rotation.y += delta * 0.4
  })
  return (
    <group position={node.position}>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[0.7, 1]} />
        <meshStandardMaterial color={node.color} emissive={node.color} emissiveIntensity={0.5} roughness={0.4} />
      </mesh>
      <Html distanceFactor={10} center>
        <div style={{
          padding: '4px 10px',
          background: 'rgba(0, 0, 0, 0.7)',
          color: '#fff',
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: 1,
          textTransform: 'uppercase',
          pointerEvents: 'none',
        }}>{node.label}</div>
      </Html>
    </group>
  )
}

function Edges() {
  const lines = useMemo(() => {
    return EDGES.map(([fromId, toId]) => {
      const from = NODES.find((n) => n.id === fromId)!
      const to = NODES.find((n) => n.id === toId)!
      return new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(...from.position),
        new THREE.Vector3(...to.position),
      ])
    })
  }, [])
  return (
    <>
      {lines.map((geom, i) => (
        <line key={i}>
          <primitive attach="geometry" object={geom} />
          <lineBasicMaterial attach="material" color="#334155" transparent opacity={0.55} />
        </line>
      ))}
    </>
  )
}

function ParticleFlow({ events }: { events: AgentEvent[] }) {
  const particlesRef = useRef<ParticleState[]>([])
  const meshRef = useRef<THREE.InstancedMesh | null>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const colorObj = useMemo(() => new THREE.Color(), [])
  const lastEventIdRef = useRef<number>(0)

  useEffect(() => {
    if (events.length === 0) return
    const fresh = events.filter((e) => e.id > lastEventIdRef.current)
    if (fresh.length === 0) return
    lastEventIdRef.current = events[events.length - 1].id
    for (const e of fresh) {
      const [fromId, toId] = eventEdge(e.type)
      const from = NODES.find((n) => n.id === fromId)!.position
      const to = NODES.find((n) => n.id === toId)!.position
      particlesRef.current.push({
        id: e.id,
        from,
        to,
        color: eventColor(e.type),
        startTs: performance.now(),
        durationMs: 1400,
      })
    }
    if (particlesRef.current.length > 96) {
      particlesRef.current = particlesRef.current.slice(-96)
    }
  }, [events])

  useFrame(() => {
    const mesh = meshRef.current
    if (!mesh) return
    const now = performance.now()
    let visibleIndex = 0
    for (const p of particlesRef.current) {
      const t = (now - p.startTs) / p.durationMs
      if (t < 0 || t > 1) continue
      const x = THREE.MathUtils.lerp(p.from[0], p.to[0], t)
      const y = THREE.MathUtils.lerp(p.from[1], p.to[1], t) + Math.sin(t * Math.PI) * 0.6
      const z = THREE.MathUtils.lerp(p.from[2], p.to[2], t)
      dummy.position.set(x, y, z)
      const scale = 0.12 + Math.sin(t * Math.PI) * 0.18
      dummy.scale.setScalar(scale)
      dummy.updateMatrix()
      mesh.setMatrixAt(visibleIndex, dummy.matrix)
      colorObj.set(p.color)
      mesh.setColorAt(visibleIndex, colorObj)
      visibleIndex += 1
    }
    mesh.count = visibleIndex
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, 96]}>
      <sphereGeometry args={[1, 12, 12]} />
      <meshStandardMaterial emissiveIntensity={1.2} toneMapped={false} />
    </instancedMesh>
  )
}
