/**
 * ThreeActStoryCanvas — the scroll-scrubbed particle choreography.
 *
 * Three acts, driven entirely by scroll position:
 *   1. scattered cloud assembles into a globe          (we advise)
 *   2. camera pushes in while satellites dock          (we build)
 *   3. the globe expands into four service clusters    (we train)
 *
 * Every particle holds three precomputed positions and is lerped between
 * them. Scroll progress arrives through a ref and is read inside useFrame, so
 * scrubbing never triggers a React render.
 *
 * The RNG is seeded rather than Math.random(): the scatter cloud and cluster
 * jitter are then identical on every load, which makes visual review and
 * screenshot comparison meaningful instead of noise.
 */
'use client'

import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGlowTexture } from '@/components/three/useGlowTexture'

const NAVY = new THREE.Color('#011C41')
const ROYAL = new THREE.Color('#1466DE')
const AZURE = new THREE.Color('#22A6F7')
const RADIUS = 1.9
const GOLDEN = Math.PI * (3 - Math.sqrt(5))
const SAT_COUNT = 3

/** Deterministic PRNG so the layout is identical on every load. */
function mulberry32(seed: number) {
  return function rng() {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const smooth = (p: number, a: number, b: number) => {
  const t = Math.min(1, Math.max(0, (p - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** Hub positions for the four service clusters, narrowed on tall stages. */
export function clusterPositions(aspect: number): [number, number, number][] {
  const spread = Math.min(1, aspect / 1.9)
  return (
    [
      [-2.3, 1.15, -0.3],
      [2.3, 1.05, -0.5],
      [-2.1, -1.2, -0.4],
      [2.2, -1.15, -0.2],
    ] as [number, number, number][]
  ).map(([x, y, z]) => [x * spread, y, z])
}

interface Props {
  progressRef: React.MutableRefObject<number>
  /** DOM label elements, projected from the cluster hubs each frame. */
  labelRefs: React.MutableRefObject<(HTMLElement | null)[]>
}

export function ThreeActStoryCanvas({ progressRef, labelRefs }: Props) {
  const glow = useGlowTexture()
  const size = useThree((s) => s.size)
  const camera = useThree((s) => s.camera)

  const groupRef = useRef<THREE.Group>(null)
  const wireMatRef = useRef<THREE.LineBasicMaterial>(null)
  const linkMatRef = useRef<THREE.LineBasicMaterial>(null)
  const satMatRef = useRef<THREE.PointsMaterial>(null)

  const aspect = size.width / Math.max(size.height, 1)

  // Rebuilt when the stage's aspect changes so cluster hubs — and the labels
  // projected onto them — stay on screen when the window resizes.
  const scene = useMemo(() => {
    const count = size.width < 720 ? 420 : 780
    const rng = mulberry32(20260813)
    const clusters = clusterPositions(aspect)

    const scatter = new Float32Array(count * 3)
    const globe = new Float32Array(count * 3)
    const cluster = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const tmp = new THREE.Color()

    for (let i = 0; i < count; i++) {
      scatter.set(
        [(rng() - 0.5) * 11, (rng() - 0.5) * 7, (rng() - 0.5) * 5 - 0.5],
        i * 3,
      )

      // Fibonacci sphere — even coverage at any particle count.
      const y = 1 - (i / (count - 1)) * 2
      const r = Math.sqrt(1 - y * y)
      const th = i * GOLDEN
      globe.set([Math.cos(th) * r * RADIUS, y * RADIUS, Math.sin(th) * r * RADIUS], i * 3)

      // Sum of three uniforms ≈ gaussian, so clusters look organic rather
      // than like uniformly filled boxes.
      const c = clusters[i % clusters.length]
      const j = () => (rng() + rng() + rng() - 1.5) * 0.55
      cluster.set([c[0] + j(), c[1] + j(), c[2] + j() * 0.6], i * 3)

      const t = (y + 1) / 2
      if (t < 0.55) tmp.copy(NAVY).lerp(ROYAL, t / 0.55)
      else tmp.copy(ROYAL).lerp(AZURE, (t - 0.55) / 0.45)
      colors.set([tmp.r, tmp.g, tmp.b], i * 3)
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(scatter.slice(), 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const wireGeo = new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(RADIUS, 2))

    // Links between the four hubs, drawn in act 3.
    const pairs: [number, number][] = [
      [0, 1],
      [1, 3],
      [3, 2],
      [2, 0],
      [0, 3],
      [1, 2],
    ]
    const linePos = new Float32Array(pairs.length * 6)
    pairs.forEach(([a, b], i) => {
      linePos.set(clusters[a], i * 6)
      linePos.set(clusters[b], i * 6 + 3)
    })
    const linkGeo = new THREE.BufferGeometry()
    linkGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3))

    const satGeo = new THREE.BufferGeometry()
    satGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SAT_COUNT * 3), 3))

    return { count, scatter, globe, cluster, geo, wireGeo, linkGeo, satGeo, clusters }
  }, [size.width, aspect])

  const vec = useMemo(() => new THREE.Vector3(), [])

  useFrame((state) => {
    const p = progressRef.current
    const t = state.clock.elapsedTime
    const group = groupRef.current
    if (!group) return

    // Act 1 assembles; act 3 expands. They never overlap, so only one lerp
    // runs per frame.
    const assemble = smooth(p, 0.02, 0.3)
    const expand = smooth(p, 0.66, 0.92)
    const attr = scene.geo.attributes.position as THREE.BufferAttribute
    const arr = attr.array as Float32Array
    const from = expand === 0 ? scene.scatter : scene.globe
    const to = expand === 0 ? scene.globe : scene.cluster
    const k = expand === 0 ? assemble : expand
    for (let i = 0; i < arr.length; i++) arr[i] = from[i] + (to[i] - from[i]) * k
    attr.needsUpdate = true

    if (wireMatRef.current) wireMatRef.current.opacity = 0.22 * assemble * (1 - expand)
    if (linkMatRef.current) linkMatRef.current.opacity = 0.38 * expand

    // Act 2: camera pushes in, then eases back out for the wide constellation.
    const push = smooth(p, 0.36, 0.6)
    camera.position.z = 7 - push * 1.9 + expand * 1.6

    // Satellites orbit inward and dock.
    if (satMatRef.current) satMatRef.current.opacity = 0.9 * push * (1 - expand)
    {
      const satAttr = scene.satGeo.attributes.position as THREE.BufferAttribute
      const sarr = satAttr.array as Float32Array
      const satR = 3.3 - push * 1.0
      for (let i = 0; i < SAT_COUNT; i++) {
        const a = p * 5 + t * 0.12 + (i * Math.PI * 2) / SAT_COUNT
        sarr[i * 3] = Math.cos(a) * satR
        sarr[i * 3 + 1] = Math.sin(a * 0.8) * 0.75
        sarr[i * 3 + 2] = Math.sin(a) * satR * 0.5
      }
      satAttr.needsUpdate = true
    }

    // Scroll-driven rotation with a whisper of idle drift.
    group.rotation.y = p * 2.6 + t * 0.03
    group.rotation.x = 0.1 - p * 0.15

    // Project the hub positions to screen space and drive the DOM labels.
    // drei's <Html> would do this, but it isn't used anywhere in this repo
    // and peer-requires React 19 while the app runs React 18 — not worth the
    // risk for four decorative pills when the maths is ten lines.
    group.updateMatrixWorld()
    const labels = labelRefs.current
    if (labels.length) {
      for (let i = 0; i < labels.length; i++) {
        const el = labels[i]
        const hub = scene.clusters[i]
        if (!el || !hub) continue
        // Offset the label AWAY from the vertical centre: the top two hubs
        // push their pill up, the bottom two push down. Keeps all four out at
        // the constellation's edges so they never drift onto the centred
        // caption (the old `+ 0.95` for every hub lifted the lower pair onto
        // the copy — worse with the longer Arabic text).
        const yOffset = hub[1] >= 0 ? 0.95 : -0.95
        vec.set(hub[0], hub[1] + yOffset, hub[2]).applyMatrix4(group.matrixWorld).project(camera)
        const sx = (vec.x * 0.5 + 0.5) * size.width
        const sy = (-vec.y * 0.5 + 0.5) * size.height
        el.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px) translate(-50%, -50%)`
        // vec.z >= 1 means the hub is behind the camera.
        el.style.opacity = (vec.z < 1 ? expand : 0).toFixed(3)
      }
    }
  })

  return (
    <group ref={groupRef}>
      <points geometry={scene.geo}>
        <pointsMaterial
          size={0.085}
          map={glow}
          vertexColors
          transparent
          opacity={0.9}
          sizeAttenuation
          depthWrite={false}
        />
      </points>

      <lineSegments geometry={scene.wireGeo}>
        <lineBasicMaterial ref={wireMatRef} color={ROYAL} transparent opacity={0} />
      </lineSegments>

      <lineSegments geometry={scene.linkGeo}>
        <lineBasicMaterial ref={linkMatRef} color={ROYAL} transparent opacity={0} />
      </lineSegments>

      <points geometry={scene.satGeo}>
        <pointsMaterial
          ref={satMatRef}
          size={0.22}
          map={glow}
          color={AZURE}
          transparent
          opacity={0}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    </group>
  )
}
