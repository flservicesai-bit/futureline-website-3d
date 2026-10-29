/**
 * GlobeHeroCanvas — the hero's 3D scene. R3F port of the prototype's raw
 * Three.js globe, kept faithful to the original maths.
 *
 * Structure: a tilt group that eases toward the cursor, containing a spin
 * group that auto-rotates — an outer wireframe shell, a counter-rotating
 * inner cage, and glow points on the shell vertices coloured navy → teal →
 * mint by height. A starfield sits outside both.
 *
 * Everything animates from a single useFrame. Nothing here touches React
 * state: the cursor position lives in a ref, so moving the mouse never
 * triggers a render.
 */
'use client'

import { useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGlowTexture } from '@/components/three/useGlowTexture'

const NAVY = new THREE.Color('#011C41')
const ROYAL = new THREE.Color('#1466DE')
const AZURE = new THREE.Color('#22A6F7')
const RADIUS = 1.72

/**
 * Sine-based radial displacement. Because the offset is derived purely from a
 * vertex's *base* position, vertices that start at the same point stay welded
 * — which is what keeps the wireframe from tearing apart at shared edges.
 *
 * Inverse lengths are constant per geometry, so they're precomputed once
 * rather than recomputed 60 times a second.
 */
function makeDisplacer(base: Float32Array, attr: THREE.BufferAttribute) {
  const invLen = new Float32Array(base.length / 3)
  for (let i = 0; i < base.length; i += 3) {
    invLen[i / 3] = 1 / (Math.hypot(base[i], base[i + 1], base[i + 2]) || 1)
  }
  return (time: number, amp: number) => {
    const arr = attr.array as Float32Array
    for (let i = 0; i < arr.length; i += 3) {
      const bx = base[i]
      const by = base[i + 1]
      const bz = base[i + 2]
      const n =
        Math.sin(bx * 2.1 + time) * 0.45 +
        Math.sin(by * 1.7 + time * 1.35) * 0.35 +
        Math.sin(bz * 2.4 + time * 0.8) * 0.3
      const s = 1 + n * amp * invLen[i / 3]
      arr[i] = bx * s
      arr[i + 1] = by * s
      arr[i + 2] = bz * s
    }
    attr.needsUpdate = true
  }
}

interface Props {
  /** Cursor offset from centre, -0.5..0.5 on both axes. */
  pointerRef: React.MutableRefObject<{ x: number; y: number }>
}

export function GlobeHeroCanvas({ pointerRef }: Props) {
  const glow = useGlowTexture()
  const tiltRef = useRef<THREE.Group>(null)
  const spinRef = useRef<THREE.Group>(null)
  const cageRef = useRef<THREE.LineSegments>(null)
  const starsRef = useRef<THREE.Points>(null)

  // Built once. Disposal is handled in the cleanup below — unlike the
  // prototype, a route change here actually unmounts the scene.
  const { wireGeo, ptsGeo, starGeo, displaceWire, displacePts } = useMemo(() => {
    const wireGeo = new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(RADIUS, 2))
    const wireBase = (wireGeo.attributes.position.array as Float32Array).slice()

    // deleteAttribute('uv') is load-bearing: with UVs present the glow sprite
    // is sampled per-vertex and every point renders as a hard square.
    const ptsGeo = new THREE.IcosahedronGeometry(RADIUS, 2)
    ptsGeo.deleteAttribute('uv')
    const ptsBase = (ptsGeo.attributes.position.array as Float32Array).slice()

    const count = ptsGeo.attributes.position.count
    const colors = new Float32Array(count * 3)
    const tmp = new THREE.Color()
    for (let i = 0; i < count; i++) {
      const y = ptsGeo.attributes.position.getY(i)
      const t = (y / RADIUS + 1) / 2
      if (t < 0.55) tmp.copy(NAVY).lerp(ROYAL, t / 0.55)
      else tmp.copy(ROYAL).lerp(AZURE, (t - 0.55) / 0.45)
      colors.set([tmp.r, tmp.g, tmp.b], i * 3)
    }
    ptsGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    // Starfield — an ellipsoidal shell, squashed vertically and pushed back.
    const STAR_COUNT = 260
    const starPos = new Float32Array(STAR_COUNT * 3)
    const starCol = new Float32Array(STAR_COUNT * 3)
    for (let i = 0; i < STAR_COUNT; i++) {
      const r = 3.4 + Math.random() * 5.2
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      starPos.set(
        [
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta) * 0.72,
          r * Math.cos(phi) - 1.5,
        ],
        i * 3,
      )
      tmp.copy(Math.random() > 0.5 ? ROYAL : NAVY)
      starCol.set([tmp.r, tmp.g, tmp.b], i * 3)
    }
    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
    starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3))

    return {
      wireGeo,
      ptsGeo,
      starGeo,
      displaceWire: makeDisplacer(wireBase, wireGeo.attributes.position as THREE.BufferAttribute),
      displacePts: makeDisplacer(ptsBase, ptsGeo.attributes.position as THREE.BufferAttribute),
    }
  }, [])

  const cageGeo = useMemo(
    () => new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(RADIUS * 0.62, 1)),
    [],
  )

  useEffect(
    () => () => {
      wireGeo.dispose()
      ptsGeo.dispose()
      starGeo.dispose()
      cageGeo.dispose()
    },
    [wireGeo, ptsGeo, starGeo, cageGeo],
  )

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (spinRef.current) spinRef.current.rotation.y = t * 0.1
    if (cageRef.current) {
      cageRef.current.rotation.y = -t * 0.22
      cageRef.current.rotation.x = t * 0.07
    }
    if (starsRef.current) starsRef.current.rotation.y = t * 0.014

    displaceWire(t * 0.55, 0.085)
    displacePts(t * 0.55, 0.085)

    // Ease toward the cursor rather than snapping — the lag is what makes it
    // feel like the globe has weight.
    if (tiltRef.current) {
      const { x, y } = pointerRef.current
      tiltRef.current.rotation.x += (y * 0.42 - tiltRef.current.rotation.x) * 0.045
      tiltRef.current.rotation.y += (x * 0.55 - tiltRef.current.rotation.y) * 0.045
    }
  })

  return (
    <>
      <group ref={tiltRef} rotation={[0, 0, 0.16]}>
        <group ref={spinRef}>
          <lineSegments geometry={wireGeo}>
            <lineBasicMaterial color={ROYAL} transparent opacity={0.28} />
          </lineSegments>

          <lineSegments ref={cageRef} geometry={cageGeo}>
            <lineBasicMaterial color={NAVY} transparent opacity={0.3} />
          </lineSegments>

          <points geometry={ptsGeo}>
            <pointsMaterial
              size={0.11}
              map={glow}
              vertexColors
              transparent
              opacity={0.85}
              sizeAttenuation
              depthWrite={false}
            />
          </points>
        </group>
      </group>

      <points ref={starsRef} geometry={starGeo}>
        <pointsMaterial
          size={0.095}
          map={glow}
          vertexColors
          transparent
          opacity={0.55}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    </>
  )
}
