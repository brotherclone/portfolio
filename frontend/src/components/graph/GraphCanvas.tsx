'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import * as THREE from 'three'
import {
  transformGraphData,
  getNodeSize,
  getNodeOpacity,
  inferPathEdges,
  type GraphData,
  type GraphNode,
  type GraphLink,
} from '@/lib/graphTransform'
import { DetailPanel } from '@/components/detail/DetailPanel'
import { withAgui, type WithAguiProps } from '@/components/agent/withAgui'

// Dynamically loaded graph renderers (both are browser-only / WebGL)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ForceGraph3D = dynamic<any>(() => import('react-force-graph-3d'), { ssr: false })
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ForceGraph2D = dynamic<any>(() => import('react-force-graph') as any, { ssr: false })

// ---------------------------------------------------------------------------
// Color helpers — read CSS custom properties once at mount
// ---------------------------------------------------------------------------

interface ColorPalette {
  warm: string
  cool: string
  neutral: string
  gold: string
  muted: string
  edgeLedTo: string
  edgeEvidencedBy: string
  edgePartOfEra: string
  edgeDefault: string
}

function readColors(): ColorPalette {
  const s = getComputedStyle(document.documentElement)
  const get = (v: string, fallback: string) => s.getPropertyValue(v).trim() || fallback
  return {
    warm: get('--color-warm', '#E8845A'),
    cool: get('--color-cool', '#5A8FE8'),
    neutral: get('--color-neutral', '#A0A0B0'),
    gold: get('--color-gold', '#D4AF37'),
    muted: get('--color-muted', '#888888'),
    edgeLedTo: get('--color-edge-led-to', '#E8845A'),
    edgeEvidencedBy: get('--color-edge-evidenced-by', '#5A8FE8'),
    edgePartOfEra: get('--color-edge-part-of-era', '#A0A0B0'),
    edgeDefault: get('--color-edge-default', '#555566'),
  }
}

// ---------------------------------------------------------------------------
// Three.js geometry factory
// ---------------------------------------------------------------------------

function makeGeometry(type: string): THREE.BufferGeometry {
  switch (type) {
    case 'Concept': return new THREE.SphereGeometry(1, 16, 16)
    case 'Project': return new THREE.BoxGeometry(1.4, 1.4, 1.4)
    case 'Organization': return new THREE.TorusGeometry(0.8, 0.3, 8, 16)
    case 'Artifact': return new THREE.OctahedronGeometry(1)
    case 'Skill': return new THREE.SphereGeometry(0.8, 8, 8)
    default: return new THREE.SphereGeometry(0.8, 8, 8)
  }
}

function nodeColor(node: GraphNode, colors: ColorPalette): string {
  const map: Record<string, string> = {
    design: colors.warm,
    development: colors.cool,
    strategy: colors.neutral,
    artifact: colors.gold,
  }
  return map[node.category] ?? colors.muted
}

// ---------------------------------------------------------------------------
// GraphCanvas component (base — wrapped with withAgui below)
// ---------------------------------------------------------------------------

interface GraphCanvasProps extends WithAguiProps {}

function GraphCanvasBase({ latestEvent }: GraphCanvasProps) {
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [animatedEdges, setAnimatedEdges] = useState<Set<string>>(new Set())
  const [use2D, setUse2D] = useState(false)

  // Refs that don't need to trigger React re-renders
  const colorsRef = useRef<ColorPalette | null>(null)
  const meshCache = useRef<Map<string, THREE.Mesh>>(new Map())
  const highlightedUris = useRef<Set<string>>(new Set())
  const graphRef = useRef<{
    refresh(): void
    cameraPosition(pos: object, lookAt: object, duration: number): void
  } | null>(null)
  const rafRef = useRef<number | null>(null)
  const pulsePhase = useRef(0)

  // Task 2.7 — mobile fallback check
  useEffect(() => {
    setUse2D(window.innerWidth < 768)
  }, [])

  // Task 2.1 — load graph.jsonld
  useEffect(() => {
    fetch('/graph.jsonld')
      .then(r => r.json())
      .then((raw: { '@graph': Record<string, unknown>[] }) => {
        setGraphData(transformGraphData(raw))
      })
      .catch(console.error)
  }, [])

  // ---------------------------------------------------------------------------
  // Pulse animation loop for highlighted nodes (emissiveIntensity sine wave)
  // ---------------------------------------------------------------------------

  const stopPulse = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const startPulse = useCallback(() => {
    stopPulse()
    const tick = () => {
      pulsePhase.current += 0.05
      const intensity = 0.3 + Math.sin(pulsePhase.current) * 0.3
      for (const [id, mesh] of meshCache.current) {
        if (highlightedUris.current.has(id)) {
          ;(mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = intensity
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [stopPulse])

  // Cleanup rAF on unmount
  useEffect(() => () => stopPulse(), [stopPulse])

  // ---------------------------------------------------------------------------
  // Task 5.2–5.4 — AGUI event handling
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!latestEvent) return

    if (latestEvent.type === 'HIGHLIGHT_NODES') {
      const uris = new Set(latestEvent.payload.uris)
      highlightedUris.current = uris
      for (const [id, mesh] of meshCache.current) {
        const mat = mesh.material as THREE.MeshStandardMaterial
        if (uris.has(id)) {
          mat.opacity = 1.0
        } else {
          mat.opacity = 0.15
          mat.emissiveIntensity = 0
        }
      }
      startPulse()
      graphRef.current?.refresh()
    } else if (latestEvent.type === 'ANIMATE_PATH') {
      const edges = inferPathEdges(latestEvent.payload.nodes)
      setAnimatedEdges(new Set(edges.map(e => `${e.source}::${e.target}`)))
    } else if (latestEvent.type === 'FOCUS_NODE') {
      const node = graphData?.nodes.find(n => n.id === latestEvent.payload.uri) as
        | (GraphNode & { x?: number; y?: number; z?: number })
        | undefined
      if (node && node.x !== undefined && node.y !== undefined) {
        const { x, y, z = 0 } = node
        graphRef.current?.cameraPosition({ x, y, z: z + 200 }, { x, y, z }, 800)
      }
    } else if (latestEvent.type === 'RESET') {
      // Reset highlighted nodes to original state
      highlightedUris.current = new Set()
      stopPulse()
      for (const [, mesh] of meshCache.current) {
        const mat = mesh.material as THREE.MeshStandardMaterial
        mat.opacity = getNodeOpacity(mesh.userData.era as string | null)
        mat.emissiveIntensity = 0
      }
      graphRef.current?.refresh()
      setAnimatedEdges(new Set())
    }
  }, [latestEvent, startPulse, stopPulse])

  // ---------------------------------------------------------------------------
  // Task 2.2–2.5 — nodeThreeObject with memoised mesh
  // ---------------------------------------------------------------------------

  const nodeThreeObject = useCallback(
    (node: unknown) => {
      const n = node as GraphNode
      if (!colorsRef.current) colorsRef.current = readColors()
      const colors = colorsRef.current

      const cached = meshCache.current.get(n.id)
      if (cached) return cached

      const size = getNodeSize(n.nodeWeight, n.depthYears, graphData?.maxDepthYears ?? 30)
      const geometry = makeGeometry(n.type)
      const opacity = getNodeOpacity(n.era)
      const material = new THREE.MeshStandardMaterial({
        color: nodeColor(n, colors),
        transparent: true,
        opacity,
        emissive: new THREE.Color(nodeColor(n, colors)),
        emissiveIntensity: 0,
      })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.scale.set(size, size, size)
      mesh.userData = { era: n.era }

      meshCache.current.set(n.id, mesh)
      return mesh
    },
    [graphData?.maxDepthYears]
  )

  // ---------------------------------------------------------------------------
  // Task 2.6 — edge encoding
  // ---------------------------------------------------------------------------

  const getLinkColor = useCallback((link: unknown) => {
    if (!colorsRef.current) colorsRef.current = readColors()
    const c = colorsRef.current
    const rel = (link as GraphLink).rel
    if (rel === 'ledTo') return c.edgeLedTo
    if (rel === 'evidencedBy') return c.edgeEvidencedBy
    if (rel === 'partOfEra') return c.edgePartOfEra
    return c.edgeDefault
  }, [])

  const getLinkWidth = useCallback((link: unknown) => {
    const rel = (link as GraphLink).rel
    if (rel === 'ledTo') return 2
    if (rel === 'evidencedBy') return 1.5
    return 1
  }, [])

  // Task 5.3 — animated path particles
  const getLinkParticles = useCallback(
    (link: unknown) => {
      const l = link as { source: string | GraphNode; target: string | GraphNode; rel: string }
      const src = typeof l.source === 'object' ? l.source.id : l.source
      const tgt = typeof l.target === 'object' ? l.target.id : l.target
      return animatedEdges.has(`${src}::${tgt}`) || animatedEdges.has(`${tgt}::${src}`) ? 4 : 0
    },
    [animatedEdges]
  )

  // ---------------------------------------------------------------------------
  // Task 3.1–3.2 — interaction handlers
  // ---------------------------------------------------------------------------

  const handleNodeClick = useCallback((node: unknown) => {
    setSelectedNode(node as GraphNode)
  }, [])

  // Hover tooltip: use nodeLabel prop (HTML string, natural browser delay)
  const getNodeLabel = useCallback((node: unknown) => {
    const n = node as GraphNode
    const truncated = n.summary.length > 80 ? n.summary.slice(0, 80) + '…' : n.summary
    return `<span style="font-size:12px;line-height:1.4"><strong>${n.label}</strong><br/>${truncated}</span>`
  }, [])

  // Task 3.3 — close handler
  const handleClose = useCallback(() => setSelectedNode(null), [])

  if (!graphData) return null

  const sharedProps = {
    ref: graphRef,
    graphData,
    nodeId: 'id',
    linkSource: 'source',
    linkTarget: 'target',
    linkColor: getLinkColor,
    linkWidth: getLinkWidth,
    linkDirectionalParticles: getLinkParticles,
    linkDirectionalParticleSpeed: 0.01,
    onNodeClick: handleNodeClick,
    nodeLabel: getNodeLabel,
    width: typeof window !== 'undefined' ? window.innerWidth : 800,
    height: typeof window !== 'undefined' ? window.innerHeight : 600,
  }

  return (
    <>
      {use2D ? (
        // Task 2.7 — 2D fallback: use nodeColor + nodeVal (no Three.js)
        <ForceGraph2D
          {...sharedProps}
          nodeColor={(node: unknown) => {
            if (!colorsRef.current) colorsRef.current = readColors()
            return nodeColor(node as GraphNode, colorsRef.current)
          }}
          nodeVal={(node: unknown) => {
            const n = node as GraphNode
            return getNodeSize(n.nodeWeight, n.depthYears, graphData.maxDepthYears) * 4
          }}
        />
      ) : (
        <ForceGraph3D
          {...sharedProps}
          nodeThreeObject={nodeThreeObject}
          nodeThreeObjectExtend={false}
          backgroundColor={
            getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim() || '#0a0a0f'
          }
        />
      )}
      {/* Task 3.1 / 4.x — detail panel */}
      <DetailPanel node={selectedNode} onClose={handleClose} />
    </>
  )
}

// Export wrapped with AGUI HOC (task 5.1)
const GraphCanvas = withAgui(GraphCanvasBase)
export default GraphCanvas
