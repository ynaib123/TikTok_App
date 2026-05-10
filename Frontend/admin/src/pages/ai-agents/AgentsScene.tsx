import { Canvas, useFrame } from '@react-three/fiber'
import {
  ContactShadows,
  Environment,
  Float,
  Grid,
  Html,
  MeshReflectorMaterial,
  OrbitControls,
  Sparkles,
} from '@react-three/drei'
import { Bloom, ChromaticAberration, EffectComposer, Vignette } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
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
const FLOOR_Y = -2.4

function buildEdges(): EdgeDef[] {
  const defs: Array<{ id: string; from: NodeId; to: NodeId; label: string; arc: number }> = [
    { id: 'user-agent', from: 'user', to: 'agent', label: 'prompt · HTTPS', arc: 1.6 },
    { id: 'agent-backend', from: 'agent', to: 'backend', label: 'tool_use · /api/ai', arc: 2.2 },
    { id: 'backend-postgres', from: 'backend', to: 'postgres', label: 'JDBC · HikariCP', arc: 1.6 },
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
      camera={{ position: [0, 4.5, 18], fov: 36 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false, toneMapping: THREE.ACESFilmicToneMapping }}
      onPointerMissed={() => onSelectNode(null)}
    >
      <fog attach="fog" args={['#050505', 18, 42]} />
      <color attach="background" args={[0x050505]} />

      {/* Studio lighting rig */}
      <ambientLight intensity={0.25} />
      <directionalLight
        position={[10, 14, 8]}
        intensity={1.6}
        color="#ffd9a8"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0008}
      />
      <directionalLight position={[-10, 8, 4]} intensity={0.45} color="#a8c8ff" />
      <pointLight position={[0, 9, -8]} intensity={0.9} color="#22d3ee" distance={20} />
      <pointLight position={[7, -1.5, 3]} intensity={0.6} color="#12b76a" distance={14} />
      <spotLight
        position={[-2, 8, 3]}
        intensity={0.6}
        angle={0.6}
        penumbra={0.8}
        color="#ffc36f"
        castShadow
      />

      {/* Realistic IBL */}
      <Environment preset="warehouse" environmentIntensity={0.35} />

      <ReflectiveFloor />
      <Edges />
      <Nodes onSelectNode={onSelectNode} selectedNodeId={selectedNodeId} />
      <ParticleFlow events={events} />

      {/* Ambient atmosphere */}
      <Sparkles
        count={60}
        size={2.4}
        scale={[20, 8, 20]}
        speed={0.18}
        color="#ffc36f"
        opacity={0.55}
      />

      <OrbitControls
        enablePan={false}
        maxDistance={28}
        minDistance={11}
        maxPolarAngle={Math.PI / 2.05}
        minPolarAngle={Math.PI / 4}
        autoRotate
        autoRotateSpeed={0.18}
        target={[0, 0.3, 0]}
      />

      {/* Cinematic post-processing */}
      <EffectComposer multisampling={4}>
        <Bloom
          intensity={0.85}
          luminanceThreshold={0.18}
          luminanceSmoothing={0.4}
          mipmapBlur
          radius={0.85}
        />
        <ChromaticAberration
          blendFunction={BlendFunction.NORMAL}
          offset={[0.0006, 0.0006]}
          radialModulation={false}
          modulationOffset={0}
        />
        <Vignette eskil={false} offset={0.18} darkness={0.78} />
      </EffectComposer>
    </Canvas>
  )
}

/* ───────── Reflective floor ───────── */
function ReflectiveFloor() {
  return (
    <group position={[0, FLOOR_Y, 0]}>
      {/* True reflective surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <MeshReflectorMaterial
          blur={[400, 100]}
          mixBlur={1.2}
          mixStrength={1.4}
          mixContrast={1.2}
          resolution={1024}
          mirror={0.55}
          depthScale={0.9}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#0a0a0a"
          metalness={0.92}
          roughness={0.45}
          envMapIntensity={0.5}
        />
      </mesh>
      {/* Tech grid overlay (slightly above floor to avoid z-fighting) */}
      <Grid
        position={[0, 0.005, 0]}
        args={[44, 44]}
        cellSize={0.85}
        cellThickness={0.5}
        cellColor="#1f1f1f"
        sectionSize={4.25}
        sectionThickness={1.1}
        sectionColor="#ffc36f"
        fadeDistance={28}
        fadeStrength={1.5}
        infiniteGrid={false}
      />
    </group>
  )
}

/* ───────── Edges ───────── */
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
    () => new THREE.TubeGeometry(edge.curve, 80, 0.022, 14, false),
    [edge.curve],
  )
  const flowGeom = useMemo(
    () => new THREE.TubeGeometry(edge.curve, 128, 0.04, 16, false),
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
        <meshStandardMaterial
          color="#3a3a3a"
          emissive="#2a2a2a"
          emissiveIntensity={0.4}
          roughness={0.4}
          metalness={0.7}
          transparent
          opacity={0.7}
        />
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
              gl_FragColor = vec4(uColor, pulse * fade * 0.85);
            }
          `}
        />
      </mesh>
      <Html
        position={[edge.midPoint.x, edge.midPoint.y + 0.18, edge.midPoint.z]}
        center
        distanceFactor={9}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            padding: '4px 10px',
            background: 'rgba(11, 11, 11, 0.92)',
            border: '1px solid rgba(255, 195, 111, 0.35)',
            borderRadius: 6,
            color: '#ffc36f',
            fontSize: 9.5,
            fontWeight: 600,
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            whiteSpace: 'nowrap',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 2px 12px rgba(255, 195, 111, 0.18)',
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
        const shape =
          node.id === 'user' ? (
            <OperatorShape key={node.id} {...props} />
          ) : node.id === 'agent' ? (
            <Float key={node.id} speed={1.4} rotationIntensity={0.18} floatIntensity={0.35}>
              <AgentBrainShape {...props} />
            </Float>
          ) : node.id === 'backend' ? (
            <ServerRackShape key={node.id} {...props} />
          ) : (
            <PostgresStackShape key={node.id} {...props} />
          )
        return (
          <group key={node.id}>
            {shape}
            <ContactShadows
              position={[node.position[0], FLOOR_Y + 0.005, node.position[2]]}
              opacity={0.55}
              scale={3.6}
              blur={2.8}
              far={3}
              resolution={512}
              color="#000000"
            />
          </group>
        )
      })}
    </>
  )
}

/* ───────── Particles ───────── */
function ParticleFlow({ events }: { events: AgentEvent[] }) {
  const edges = useMemo(() => buildEdges(), [])
  const ambientRef = useRef<AmbientFlow[]>(
    edges.flatMap((e) => Array.from({ length: 4 }, (_, i) => ({ edgeKey: e.id, offset: i / 4 }))),
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
      dummy.scale.setScalar(0.07)
      dummy.updateMatrix()
      mesh.setMatrixAt(visibleIndex, dummy.matrix)
      colorObj.set(EDGE_FLOW_COLOR).multiplyScalar(0.85)
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
      const scale = 0.14 + Math.sin(t * Math.PI) * 0.2
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
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial emissiveIntensity={2.5} toneMapped={false} />
    </instancedMesh>
  )
}
