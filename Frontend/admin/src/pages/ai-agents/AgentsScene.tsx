import { useFrame } from '@react-three/fiber'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { AgentEvent } from '../AIAgentsPage'
import { AgentBrainShape, OperatorShape, PostgresStackShape, ServerRackShape } from './AgentShapes'
import { SCENE_NODES, type NodeId, type SceneNode } from './agentNodes'

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
  if (type === 'agent_run_finished') return '#12b76a'
  return '#ffc36f'
}

function eventEdge(type: AgentEvent['type']): [NodeId, NodeId] {
  if (type === 'agent_tool_call') return ['agent', 'backend']
  if (type === 'agent_run_finished') return ['agent', 'user']
  return ['user', 'agent']
}

interface AgentsSceneProps {
  events: AgentEvent[]
  onSelectNode: (node: SceneNode | null) => void
  selectedNodeId: NodeId | null
}

export default function AgentsScene({ events, onSelectNode, selectedNodeId }: AgentsSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 4, 16], fov: 42 }}
      dpr={[1, 1.6]}
      onPointerMissed={() => onSelectNode(null)}
    >
      <color attach="background" args={[0x0b0b0b]} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[8, 12, 6]} intensity={1.1} color="#ffc36f" />
      <pointLight position={[-10, 6, 4]} intensity={0.7} color="#9c9c9c" />
      <pointLight position={[10, -6, -4]} intensity={0.5} color="#12b76a" />
      <Stars radius={120} depth={70} count={1800} factor={2.4} saturation={0} fade speed={0.4} />
      <Floor />
      <Edges />
      <Nodes onSelectNode={onSelectNode} selectedNodeId={selectedNodeId} />
      <ParticleFlow events={events} />
      <OrbitControls
        enablePan={false}
        maxDistance={26}
        minDistance={9}
        maxPolarAngle={Math.PI / 2.05}
      />
    </Canvas>
  )
}

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.4, 0]} receiveShadow>
      <planeGeometry args={[60, 60, 1, 1]} />
      <meshStandardMaterial color="#161616" roughness={0.9} metalness={0.2} emissive="#000000" />
    </mesh>
  )
}

function Edges() {
  const segments: Array<[NodeId, NodeId]> = useMemo(
    () => [
      ['user', 'agent'],
      ['agent', 'backend'],
      ['backend', 'postgres'],
    ],
    [],
  )

  const lines = useMemo(() => {
    return segments.map(([fromId, toId]) => {
      const from = SCENE_NODES.find((n) => n.id === fromId)!
      const to = SCENE_NODES.find((n) => n.id === toId)!
      return new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(...from.position),
        new THREE.Vector3(...to.position),
      ])
    })
  }, [segments])

  return (
    <>
      {lines.map((geom, i) => (
        <line key={i}>
          <primitive attach="geometry" object={geom} />
          <lineBasicMaterial attach="material" color="#3a3a3a" transparent opacity={0.6} />
        </line>
      ))}
    </>
  )
}

function Nodes({
  onSelectNode,
  selectedNodeId,
}: {
  onSelectNode: (node: SceneNode | null) => void
  selectedNodeId: NodeId | null
}) {
  const [hoveredId, setHoveredId] = useState<NodeId | null>(null)

  useEffect(() => {
    document.body.style.cursor = hoveredId ? 'pointer' : 'auto'
    return () => {
      document.body.style.cursor = 'auto'
    }
  }, [hoveredId])

  return (
    <>
      {SCENE_NODES.map((node) => {
        const props = {
          node,
          hovered: hoveredId === node.id,
          selected: selectedNodeId === node.id,
          onPointerOver: () => setHoveredId(node.id),
          onPointerOut: () => setHoveredId((prev) => (prev === node.id ? null : prev)),
          onClick: () => onSelectNode(node),
        }
        if (node.id === 'user') return <OperatorShape key={node.id} {...props} />
        if (node.id === 'agent') return <AgentBrainShape key={node.id} {...props} />
        if (node.id === 'backend') return <ServerRackShape key={node.id} {...props} />
        return <PostgresStackShape key={node.id} {...props} />
      })}
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
      const from = SCENE_NODES.find((n) => n.id === fromId)!.position
      const to = SCENE_NODES.find((n) => n.id === toId)!.position
      particlesRef.current.push({
        id: e.id,
        from,
        to,
        color: eventColor(e.type),
        startTs: performance.now(),
        durationMs: 1500,
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
      const scale = 0.16 + Math.sin(t * Math.PI) * 0.18
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
      <meshStandardMaterial emissiveIntensity={1.6} toneMapped={false} />
    </instancedMesh>
  )
}
