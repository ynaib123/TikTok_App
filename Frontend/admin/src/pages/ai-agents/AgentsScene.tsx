import { useFrame } from '@react-three/fiber'
import { Canvas } from '@react-three/fiber'
import { Environment, Grid, Html, OrbitControls } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { AgentEvent } from '../AIAgentsPage'
import { AgentBrainShape, OperatorShape, PostgresStackShape, ServerRackShape } from './AgentShapes'
import { SCENE_NODES, type NodeId, type SceneNode } from './agentNodes'

interface ParticleState {
  id: number
  edgeKey: string
  color: string
  startTs: number
  durationMs: number
}

interface AmbientFlow {
  edgeKey: string
  offset: number
}

interface EdgeDef {
  id: string
  from: NodeId
  to: NodeId
  label: string
  curve: THREE.CatmullRomCurve3
  midPoint: THREE.Vector3
}

const EDGE_FLOW_COLOR = '#ffc36f'

function buildEdges(): EdgeDef[] {
  const defs: Array<{ id: string; from: NodeId; to: NodeId; label: string; arc: number }> = [
    { id: 'user-agent', from: 'user', to: 'agent', label: 'prompt · HTTPS', arc: 1.4 },
    { id: 'agent-backend', from: 'agent', to: 'backend', label: 'tool_use · /api/ai', arc: 1.8 },
    {
      id: 'backend-postgres',
      from: 'backend',
      to: 'postgres',
      label: 'JDBC · pool HikariCP',
      arc: 1.4,
    },
  ]
  return defs.map((d) => {
    const fromNode = SCENE_NODES.find((n) => n.id === d.from)!
    const toNode = SCENE_NODES.find((n) => n.id === d.to)!
    const start = new THREE.Vector3(...fromNode.position)
    const end = new THREE.Vector3(...toNode.position)
    const mid = start
      .clone()
      .lerp(end, 0.5)
      .add(new THREE.Vector3(0, d.arc, 0))
    const curve = new THREE.CatmullRomCurve3([start, mid, end], false, 'catmullrom', 0.5)
    return {
      id: d.id,
      from: d.from,
      to: d.to,
      label: d.label,
      curve,
      midPoint: curve.getPoint(0.5),
    }
  })
}

function eventColor(type: AgentEvent['type']): string {
  if (type === 'agent_tool_call') return '#22d3ee'
  if (type === 'agent_run_finished') return '#12b76a'
  return '#ffc36f'
}

function eventEdgeKey(type: AgentEvent['type']): string {
  if (type === 'agent_tool_call') return 'agent-backend'
  return 'user-agent'
}

interface AgentsSceneProps {
  events: AgentEvent[]
  onSelectNode: (node: SceneNode | null) => void
  selectedNodeId: NodeId | null
}

export default function AgentsScene({ events, onSelectNode, selectedNodeId }: AgentsSceneProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 5.5, 17], fov: 38 }}
      dpr={[1, 1.8]}
      gl={{ antialias: true, alpha: false }}
      onPointerMissed={() => onSelectNode(null)}
    >
      <fog attach="fog" args={['#070707', 16, 38]} />
      <color attach="background" args={[0x070707]} />

      <ambientLight intensity={0.35} />
      <directionalLight
        position={[10, 14, 8]}
        intensity={1.4}
        color="#ffd9a8"
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight position={[-10, 6, 6]} intensity={0.5} color="#9c9c9c" />
      <pointLight position={[0, 8, -6]} intensity={0.6} color="#22d3ee" />
      <pointLight position={[6, -2, 4]} intensity={0.4} color="#12b76a" />

      <Environment preset="city" environmentIntensity={0.18} />
      <PlatformFloor />
      <Edges />
      <Nodes onSelectNode={onSelectNode} selectedNodeId={selectedNodeId} />
      <ParticleFlow events={events} />

      <OrbitControls
        enablePan={false}
        maxDistance={28}
        minDistance={10}
        maxPolarAngle={Math.PI / 2.05}
        autoRotate
        autoRotateSpeed={0.18}
      />
    </Canvas>
  )
}

/* ───────── Floor ───────── */
function PlatformFloor() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.42, 0]} receiveShadow>
        <ringGeometry args={[0, 14, 64]} />
        <meshStandardMaterial color="#101010" roughness={0.95} metalness={0.2} />
      </mesh>
      <Grid
        position={[0, -2.4, 0]}
        args={[40, 40]}
        cellSize={0.8}
        cellThickness={0.6}
        cellColor="#262626"
        sectionSize={4}
        sectionThickness={1.1}
        sectionColor="#ffc36f"
        fadeDistance={26}
        fadeStrength={1.4}
        infiniteGrid={false}
      />
    </>
  )
}

/* ───────── Edges (curved tubes + animated flow + label) ───────── */
function Edges() {
  const edges = useMemo(() => buildEdges(), [])
  return (
    <group>
      {edges.map((edge) => (
        <SingleEdge key={edge.id} edge={edge} />
      ))}
    </group>
  )
}

function SingleEdge({ edge }: { edge: EdgeDef }) {
  const baseGeom = useMemo(
    () => new THREE.TubeGeometry(edge.curve, 64, 0.018, 12, false),
    [edge.curve],
  )
  const flowGeom = useMemo(
    () => new THREE.TubeGeometry(edge.curve, 96, 0.034, 12, false),
    [edge.curve],
  )
  const flowMatRef = useRef<THREE.ShaderMaterial>(null)

  useFrame((_, delta) => {
    if (flowMatRef.current) {
      flowMatRef.current.uniforms.uTime.value += delta
    }
  })

  return (
    <group>
      <mesh geometry={baseGeom}>
        <meshBasicMaterial color="#3a3a3a" transparent opacity={0.55} />
      </mesh>
      <mesh geometry={flowGeom}>
        <shaderMaterial
          ref={flowMatRef}
          transparent
          depthWrite={false}
          uniforms={{
            uTime: { value: 0 },
            uColor: { value: new THREE.Color(EDGE_FLOW_COLOR) },
          }}
          vertexShader={`
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            uniform float uTime;
            uniform vec3 uColor;
            varying vec2 vUv;
            void main() {
              float scroll = fract(vUv.x * 4.0 - uTime * 0.55);
              float pulse = smoothstep(0.0, 0.18, scroll) - smoothstep(0.18, 0.36, scroll);
              float fade = sin(vUv.y * 3.14159);
              gl_FragColor = vec4(uColor, pulse * fade * 0.65);
            }
          `}
        />
      </mesh>
      <Html
        position={[edge.midPoint.x, edge.midPoint.y + 0.15, edge.midPoint.z]}
        center
        distanceFactor={9}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            padding: '3px 9px',
            background: 'rgba(11, 11, 11, 0.88)',
            border: '1px solid rgba(255, 195, 111, 0.28)',
            borderRadius: 4,
            color: '#ffc36f',
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: 0.7,
            textTransform: 'uppercase',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            whiteSpace: 'nowrap',
            backdropFilter: 'blur(4px)',
          }}
        >
          {edge.label}
        </div>
      </Html>
    </group>
  )
}

/* ───────── Nodes ───────── */
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

/* ───────── Particles : ambient drift + event highlights along curves ───────── */
function ParticleFlow({ events }: { events: AgentEvent[] }) {
  const edges = useMemo(() => buildEdges(), [])
  const ambientRef = useRef<AmbientFlow[]>(
    edges.flatMap((e) => Array.from({ length: 3 }, (_, i) => ({ edgeKey: e.id, offset: i / 3 }))),
  )
  const particlesRef = useRef<ParticleState[]>([])
  const meshRef = useRef<THREE.InstancedMesh | null>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const colorObj = useMemo(() => new THREE.Color(), [])
  const lastEventIdRef = useRef<number>(0)
  const edgeMap = useMemo(() => new Map(edges.map((e) => [e.id, e])), [edges])

  useEffect(() => {
    if (events.length === 0) return
    const fresh = events.filter((e) => e.id > lastEventIdRef.current)
    if (fresh.length === 0) return
    lastEventIdRef.current = events[events.length - 1].id
    for (const e of fresh) {
      particlesRef.current.push({
        id: e.id,
        edgeKey: eventEdgeKey(e.type),
        color: eventColor(e.type),
        startTs: performance.now(),
        durationMs: 1700,
      })
    }
    if (particlesRef.current.length > 64) {
      particlesRef.current = particlesRef.current.slice(-64)
    }
  }, [events])

  useFrame((_, delta) => {
    const mesh = meshRef.current
    if (!mesh) return
    const now = performance.now()
    let visibleIndex = 0

    for (const flow of ambientRef.current) {
      flow.offset = (flow.offset + delta * 0.18) % 1
      const edge = edgeMap.get(flow.edgeKey)
      if (!edge) continue
      const point = edge.curve.getPoint(flow.offset)
      dummy.position.copy(point)
      dummy.scale.setScalar(0.06)
      dummy.updateMatrix()
      mesh.setMatrixAt(visibleIndex, dummy.matrix)
      colorObj.set(EDGE_FLOW_COLOR).multiplyScalar(0.7)
      mesh.setColorAt(visibleIndex, colorObj)
      visibleIndex += 1
      if (visibleIndex >= 96) break
    }

    for (const p of particlesRef.current) {
      if (visibleIndex >= 96) break
      const t = (now - p.startTs) / p.durationMs
      if (t < 0 || t > 1) continue
      const edge = edgeMap.get(p.edgeKey)
      if (!edge) continue
      const point = edge.curve.getPoint(t)
      dummy.position.copy(point)
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
      <meshStandardMaterial emissiveIntensity={1.8} toneMapped={false} />
    </instancedMesh>
  )
}
