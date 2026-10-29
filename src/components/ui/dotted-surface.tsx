'use client';

import { cn } from '@/lib/utils';
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

type DottedSurfaceProps = Omit<React.ComponentProps<'div'>, 'ref'>;

/**
 * Animated Three.js dot-wave surface — adapted for FutureLine's always-dark theme.
 * Dots use the brand teal (#1466de) and fade into the dark background (#030d1a).
 * Sizes itself to its container, not the window, so it works as a section background.
 */
export function DottedSurface({ className, ...props }: DottedSurfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const SEPARATION = 150;
    const AMOUNTX = 40;
    const AMOUNTY = 60;

    /* ── dimensions: use container, fall back to window ── */
    const width  = container.clientWidth  || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    /* ── scene ── */
    const scene = new THREE.Scene();
    // Fog fades outer dots into the site's dark background
    scene.fog = new THREE.Fog(0x030d1a, 1800, 9000);

    /* ── camera ── */
    const camera = new THREE.PerspectiveCamera(60, width / height, 1, 10000);
    camera.position.set(0, 355, 1220);

    /* ── renderer (transparent canvas) ── */
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0); // fully transparent clear colour
    container.appendChild(renderer.domElement);

    /* ── geometry ── */
    const positions: number[] = [];
    for (let ix = 0; ix < AMOUNTX; ix++) {
      for (let iy = 0; iy < AMOUNTY; iy++) {
        positions.push(
          ix * SEPARATION - (AMOUNTX * SEPARATION) / 2,
          0,
          iy * SEPARATION - (AMOUNTY * SEPARATION) / 2,
        );
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3),
    );

    /* ── material — brand teal, low opacity for subtlety ── */
    const material = new THREE.PointsMaterial({
      size: 6,
      color: new THREE.Color(0x18a999), // FutureLine teal
      transparent: true,
      opacity: 0.38,
      sizeAttenuation: true,
      fog: true,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    /* ── animation loop ── */
    let count = 0;
    let animationId: number;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      const posArr = geometry.attributes.position.array as Float32Array;
      let i = 0;
      for (let ix = 0; ix < AMOUNTX; ix++) {
        for (let iy = 0; iy < AMOUNTY; iy++) {
          // Wave Y positions with two overlapping sine waves
          posArr[i * 3 + 1] =
            Math.sin((ix + count) * 0.3) * 50 +
            Math.sin((iy + count) * 0.5) * 50;
          i++;
        }
      }
      geometry.attributes.position.needsUpdate = true;
      renderer.render(scene, camera);
      count += 0.07; // slightly slower than default for elegance
    };

    /* ── resize ── */
    const handleResize = () => {
      const w = container.clientWidth  || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);
    animate();

    /* ── cleanup ── */
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []); // no theme dependency — site is always dark

  return (
    <div
      ref={containerRef}
      className={cn('pointer-events-none', className)}
      {...props}
    />
  );
}
