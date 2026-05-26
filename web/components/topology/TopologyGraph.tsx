'use client';
import { memo, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useOnyx } from '@/lib/store';
import { NODE_COLOR, EDGE_COLOR, STATUS_COLOR } from '@/lib/colors';
import type { TopologyEdge, TopologyNode, TopologyGraph } from '@/lib/types';
import { shallow } from 'zustand/shallow';

// Deterministic 3D placement: group nodes onto concentric rings by `group`,
// hash-spread within each ring. Adding/removing nodes does not jitter neighbours.
function hash(id: string): number {
  let h = 5381;
  for (let i = 0; i < id.length; i += 1) h = ((h << 5) + h + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const GROUP_RADIUS: Record<string, number> = {
  core: 0,
  agent: 4.2,
  cockpit: 4.2,
  coral: 4.2,
  workspace: 7.4,
  inference: 6.2,
  outbound: 9.6,
  localhost: 5.5,
  dependency: 9.6,
  external: 12,
  dns: 11,
};

const GROUP_ELEV: Record<string, number> = {
  core: 0,
  agent: 1.2,
  cockpit: -1.2,
  coral: 0.4,
  workspace: 0,
  inference: 2.4,
  outbound: -1,
  localhost: 0.6,
  dependency: -0.6,
  external: 0.2,
  dns: 1,
};

function positionFor(node: TopologyNode): [number, number, number] {
  const r = GROUP_RADIUS[node.group] ?? 8;
  const y = GROUP_ELEV[node.group] ?? 0;
  if (r === 0) {
    // tight central cluster — spread by hash so core nodes don't overlap
    const h = hash(node.id);
    const ang = (h % 360) * (Math.PI / 180);
    return [Math.cos(ang) * 1.3, (h % 7) * 0.18 - 0.6, Math.sin(ang) * 1.3];
  }
  const h = hash(node.id);
  const ang = (h % 1000) / 1000 * Math.PI * 2;
  const wobble = ((h >> 5) % 100) / 100 * 0.8 - 0.4;
  return [Math.cos(ang) * r, y + wobble, Math.sin(ang) * r];
}

function colorForNode(node: TopologyNode): string {
  if (node.health === 'critical') return STATUS_COLOR.critical;
  if (node.health === 'warn')     return STATUS_COLOR.warn;
  return NODE_COLOR[node.kind] ?? '#22e8ff';
}

interface NodeProps {
  node: TopologyNode;
  position: [number, number, number];
}

const GraphNode = memo(function GraphNode({ node, position }: NodeProps) {
  const ref = useRef<THREE.Mesh>(null!);
  const ringRef = useRef<THREE.Mesh>(null!);
  const color = useMemo(() => new THREE.Color(colorForNode(node)), [node.health, node.kind]);
  const baseScale = node.kind === 'service' ? 0.42 : node.kind === 'inference' ? 0.38 : 0.26;

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const pulseAmt = 0.85 + node.pulse * 0.45 + Math.sin(t * 2.4 + hash(node.id) % 7) * 0.06;
    ref.current.scale.setScalar(baseScale * pulseAmt);
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 0.4 + hash(node.id) % 6;
      const ringScale = baseScale * (1.8 + Math.sin(t * 1.8 + hash(node.id) % 5) * 0.1 + node.pulse * 0.4);
      ringRef.current.scale.setScalar(ringScale);
    }
  });

  return (
    <group position={position}>
      <mesh ref={ref}>
        <sphereGeometry args={[1, 22, 22]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[baseScale * 1.6, 22, 22]} />
        <meshBasicMaterial color={color} transparent opacity={0.08} toneMapped={false} />
      </mesh>
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.95, 1, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.55} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      {node.kind !== 'file' && (
        <Html
          center
          distanceFactor={14}
          position={[0, baseScale * 2.6, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div
            className="text-[10.5px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap"
            style={{
              color: '#111827',
              background: 'rgba(255, 255, 255, 0.92)',
              border: '1px solid rgba(17, 24, 39, 0.08)',
              backdropFilter: 'blur(4px)',
              boxShadow: '0 1px 2px rgba(17, 24, 39, 0.06)',
            }}
          >
            {node.label}
          </div>
        </Html>
      )}
    </group>
  );
});

interface EdgeProps {
  edge: TopologyEdge;
  from: [number, number, number];
  to: [number, number, number];
}

const GraphEdge = memo(function GraphEdge({ edge, from, to }: EdgeProps) {
  const color = edge.status === 'offline' ? STATUS_COLOR.offline
    : edge.status === 'degraded' || edge.status === 'retry' ? STATUS_COLOR.degraded
    : EDGE_COLOR[edge.kind] ?? '#22e8ff';

  const curve = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const dist = a.distanceTo(b);
    mid.y += dist * 0.18 + 0.15;
    const c = new THREE.QuadraticBezierCurve3(a, mid, b);
    return c.getPoints(28).map((p) => [p.x, p.y, p.z] as [number, number, number]);
  }, [from[0], from[1], from[2], to[0], to[1], to[2]]);

  return (
    <Line
      points={curve}
      color={color}
      lineWidth={edge.weight > 0.8 ? 1.6 : 1.1}
      transparent
      opacity={edge.status === 'offline' ? 0.5 : 0.72}
      dashed={edge.kind === 'replay' || edge.status === 'retry'}
      dashSize={0.25}
      gapSize={0.18}
    />
  );
});

function TraversalParticles({ edges, positions }: { edges: TopologyEdge[]; positions: Map<string, [number, number, number]> }) {
  // a subtle particle drift along edges — adds 'movement' even when the graph
  // is static. We pick the top-N hottest edges (highest weight) and animate.
  const particles = useMemo(() => {
    return edges
      .filter((e) => positions.has(e.source) && positions.has(e.target))
      .slice(0, 30)
      .map((e, i) => ({ e, phase: i / 30 }));
  }, [edges, positions]);

  const refs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    particles.forEach(({ e, phase }, i) => {
      const m = refs.current[i];
      if (!m) return;
      const src = positions.get(e.source)!;
      const dst = positions.get(e.target)!;
      const u = (t * 0.3 + phase) % 1;
      const a = new THREE.Vector3(...src);
      const b = new THREE.Vector3(...dst);
      const mid = a.clone().add(b).multiplyScalar(0.5);
      const dist = a.distanceTo(b);
      mid.y += dist * 0.18 + 0.15;
      const x = (1 - u) * (1 - u) * a.x + 2 * (1 - u) * u * mid.x + u * u * b.x;
      const y = (1 - u) * (1 - u) * a.y + 2 * (1 - u) * u * mid.y + u * u * b.y;
      const z = (1 - u) * (1 - u) * a.z + 2 * (1 - u) * u * mid.z + u * u * b.z;
      m.position.set(x, y, z);
    });
  });

  return (
    <>
      {particles.map(({ e }, i) => (
        <mesh ref={(el) => { refs.current[i] = el; }} key={`${e.source}-${e.target}-${i}`}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial color={EDGE_COLOR[e.kind] ?? '#22e8ff'} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}

function Scene({ graph, version }: { graph: TopologyGraph; version: number }) {
  const positions = useMemo(() => {
    const m = new Map<string, [number, number, number]>();
    for (const n of graph.nodes) m.set(n.id, positionFor(n));
    return m;
  }, [version]);

  return (
    <>
      <color attach="background" args={['#F7F8FA']} />
      <ambientLight intensity={0.85} />
      <pointLight position={[10, 10, 10]} intensity={0.35} color="#4F46E5" />
      <pointLight position={[-10, -8, -10]} intensity={0.25} color="#7C3AED" />

      {/* concentric reference rings */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.8, 3.83, 96]} />
        <meshBasicMaterial color="#D9DEE6" transparent opacity={0.55} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[6, 6.03, 96]} />
        <meshBasicMaterial color="#D9DEE6" transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[9.2, 9.23, 96]} />
        <meshBasicMaterial color="#D9DEE6" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[12.2, 12.23, 96]} />
        <meshBasicMaterial color="#D9DEE6" transparent opacity={0.22} side={THREE.DoubleSide} />
      </mesh>

      {/* edges */}
      {graph.edges.map((e) => {
        const f = positions.get(e.source);
        const t = positions.get(e.target);
        if (!f || !t) return null;
        return <GraphEdge key={e.id} edge={e} from={f} to={t} />;
      })}

      {/* traversal particles */}
      <TraversalParticles edges={graph.edges} positions={positions} />

      {/* nodes */}
      {graph.nodes.map((n) => (
        <GraphNode key={n.id} node={n} position={positions.get(n.id)!} />
      ))}

      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        autoRotate
        autoRotateSpeed={0.35}
        minDistance={6}
        maxDistance={26}
      />
    </>
  );
}

export function TopologyGraphView() {
  const { graph, version } = useOnyx(
    (s) => ({ graph: s.topology, version: s.topologyVersion }),
    shallow,
  );
  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{ position: [14, 7, 14], fov: 50 }}
        dpr={[1, 1.7]}
        gl={{ antialias: true, alpha: true }}
      >
        <Scene graph={graph} version={version} />
      </Canvas>
      <TopologyOverlay />
    </div>
  );
}

function TopologyOverlay() {
  // The Graph page now renders its own filter + inspector panels above the
  // canvas — keep this overlay minimal so we don't double up.
  return null;
}
