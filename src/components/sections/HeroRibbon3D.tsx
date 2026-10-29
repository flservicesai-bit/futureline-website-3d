/**
 * HeroRibbon3D — reusable signature 3D moment for interior pages.
 *
 * One RibbonWall plane + a small drifting particle field. Idle camera (no
 * scroll trigger). Designed to drop into the hero of /services, /courses,
 * /ai, etc. as a brand-aligned visual anchor without the cost of the full
 * DualWalkway pinned canvas.
 *
 * The shader's pattern (vertical scrolling data stripes, soft horizontal
 * falloff, 0.8 Hz "breathing" pulse) is the home DualWalkway's, preserving
 * the design language per the "do not rewrite the 3D" directive. Only how it
 * composites changed: the pages are light, so the glow tints the page
 * instead of being bloomed over black.
 */
'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { useInViewFrameloop } from '@/hooks/useInViewFrameloop';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { Color, InstancedMesh, Matrix4, ShaderMaterial } from 'three';

function Ribbon({ color, tilt = 0.3 }: { color: string; tilt?: number }) {
  const matRef = useRef<ShaderMaterial>(null);
  const colorVec = useMemo(() => new Color(color), [color]);
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uColor: { value: colorVec } }),
    [colorVec],
  );

  useFrame((_, delta) => {
    if (matRef.current) matRef.current.uniforms.uTime.value += delta;
  });

  return (
    <mesh position={[0, 0, 0]} rotation={[0, tilt, 0]}>
      <planeGeometry args={[3.6, 11, 1, 1]} />
      <shaderMaterial
        ref={matRef}
        transparent
        depthWrite={false}
        uniforms={uniforms}
        side={2}
        vertexShader={/* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={/* glsl */ `
          precision highp float;
          uniform float uTime;
          uniform vec3 uColor;
          varying vec2 vUv;

          float bands(vec2 uv, float t) {
            float f = sin((uv.y * 80.0) - (t * 0.4 * 80.0));
            return smoothstep(0.6, 1.0, f * 0.5 + 0.5);
          }

          void main() {
            float horiz = pow(1.0 - abs(vUv.x - 0.5) * 2.0, 1.6);
            float vert = smoothstep(0.0, 0.18, vUv.y) * smoothstep(1.0, 0.82, vUv.y);
            float scroll = bands(vUv, uTime);
            float baseGlow = horiz * vert * (0.4 + scroll * 0.6);
            float pulse = 0.85 + 0.15 * sin(uTime * 0.8);
            // Light page: keep the hue constant and let the glow set the
            // opacity, so faint areas fade to the page rather than to grey.
            gl_FragColor = vec4(uColor, clamp(baseGlow * pulse * 0.6, 0.0, 1.0));
          }
        `}
      />
    </mesh>
  );
}

const PARTICLE_COUNT = 90;
function Particles() {
  const meshRef = useRef<InstancedMesh>(null);
  const matrix = useMemo(() => new Matrix4(), []);
  const dots = useMemo(() => {
    const arr: Array<{ x: number; y: number; z: number; phase: number; speed: number; size: number }> = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      arr.push({
        x: (Math.random() - 0.5) * 3.8,
        y: (Math.random() - 0.5) * 7,
        z: -Math.random() * 3 + 1.5,
        phase: Math.random() * Math.PI * 2,
        speed: 0.25 + Math.random() * 0.55,
        size: 0.014 + Math.random() * 0.034,
      });
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const d = dots[i];
      const dy = Math.sin(t * d.speed + d.phase) * 0.16;
      const dx = Math.cos(t * d.speed * 0.6 + d.phase) * 0.07;
      matrix.makeScale(d.size, d.size, d.size);
      matrix.setPosition(d.x + dx, d.y + dy, d.z);
      meshRef.current.setMatrixAt(i, matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
      <sphereGeometry args={[1, 6, 5]} />
      <meshBasicMaterial color="#1466DE" transparent opacity={0.45} toneMapped={false} />
    </instancedMesh>
  );
}

function IdleCamera() {
  useFrame(({ camera, clock }) => {
    const t = clock.elapsedTime;
    // Subtle parallax — camera breathes around the ribbon
    camera.position.x = Math.sin(t * 0.18) * 0.18;
    camera.position.y = Math.cos(t * 0.13) * 0.12;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

interface HeroRibbon3DProps {
  /** Hex color, defaults to the brand royal blue */
  color?: string;
  /** Plane rotation in radians around Y (default 0.3 — slight tilt) */
  tilt?: number;
  className?: string;
}

export default function HeroRibbon3D({
  color = '#1466DE',
  tilt = 0.3,
  className = 'absolute inset-0',
}: HeroRibbon3DProps) {
  // Convert hex → rgba so the CSS-gradient fallback matches the canvas tint
  // even when WebGL is unavailable. Real users with old GPUs / blocked
  // hardware acceleration / low-power mode see a brand-aligned gradient
  // instead of empty space.
  const rgba = (alpha: number) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Render frames only while the hero is on screen, and not at all under
  // reduced motion (one still frame instead). Off-screen it used to redraw
  // every frame, draining batteries for nothing.
  const reduced = usePrefersReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const inView = useInViewFrameloop(wrapRef);

  return (
    <div ref={wrapRef} aria-hidden="true" className={`${className} pointer-events-none`}>
      {/* CSS-gradient fallback — always rendered behind the canvas, and all
          that shows if WebGL is unavailable. Transparent outside the glow so
          it sits on the page's light background. */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 60% 80% at 50% 50%, ${rgba(0.14)} 0%, transparent 65%),
            radial-gradient(ellipse 20% 60% at 50% 50%, ${rgba(0.18)} 0%, transparent 60%)
          `,
        }}
      />
      <Canvas
        dpr={[1, 2]}
        frameloop={reduced ? 'demand' : inView}
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
        // If WebGL context creation fails, canvas silently doesn't mount;
        // the fallback gradient behind us stays visible. No crash.
        onCreated={(state) => {
          // Defensive: if the GL context is lost (browser tab backgrounded
          // for a long time, GPU throttled), the fallback still shows.
          state.gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
          });
        }}
      >
        {/* Alpha canvas with no postprocessing: the old Bloom + Vignette
            chain was tuned for a black page and drew a grey slab over the
            light theme. The ribbon now tints the page directly. */}
        <IdleCamera />
        <Ribbon color={color} tilt={tilt} />
        <Particles />
      </Canvas>
    </div>
  );
}
