'use client';

import React, { useEffect, useRef } from 'react';

/* ─── Particle class ─────────────────────────────────────────────────────── */
class Particle {
  private element: SVGElement;
  private container: HTMLElement;
  private position: number;
  private friction: number;
  private coordinates: { x: number; y: number };
  private scale: number;
  private siner: number;
  private rotationDirection: '+' | '-';
  private rotationValue: number;
  private ballColor: string;
  private readonly steps: number;
  private readonly dimensions = { width: 30, height: 30 };

  constructor(
    container: HTMLElement,
    coordinates: { x: number; y: number },
    friction: number,
    ballColor: string,
  ) {
    this.container = container;
    this.coordinates = coordinates;
    this.friction = friction;
    this.ballColor = ballColor;
    this.position = this.coordinates.y;
    this.steps = window.innerHeight / 2;
    this.rotationValue = 0;
    this.rotationDirection = Math.random() > 0.5 ? '+' : '-';
    this.scale = 0.4 + Math.random() * 2;
    this.siner = (window.innerWidth / 2.5) * Math.random();
    this.element = this.render();
  }

  private render(): SVGElement {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svgEl = document.createElementNS(svgNS, 'svg');
    svgEl.setAttribute('viewBox', '0 0 67.4 67.4');

    const circleEl = document.createElementNS(svgNS, 'circle');
    circleEl.setAttribute('cx', '33.7');
    circleEl.setAttribute('cy', '33.7');
    circleEl.setAttribute('r', '33.7');
    circleEl.setAttribute('fill', this.ballColor);
    svgEl.appendChild(circleEl);

    svgEl.style.position = 'absolute';
    svgEl.style.width = `${this.dimensions.width}px`;
    svgEl.style.height = `${this.dimensions.height}px`;
    svgEl.style.transform = `translateX(${this.coordinates.x}px) translateY(${this.coordinates.y}px)`;

    this.container.appendChild(svgEl);
    return svgEl;
  }

  public move(): boolean {
    this.position -= this.friction;
    const top = this.position;
    const left =
      this.coordinates.x +
      Math.sin((this.position * Math.PI) / this.steps) * this.siner;

    this.rotationValue += this.friction;
    const rotation =
      this.rotationDirection === '+' ? this.rotationValue : -this.rotationValue;

    this.element.style.transform = `translateX(${left}px) translateY(${top}px) scale(${this.scale}) rotate(${rotation}deg)`;

    if (this.position < -this.dimensions.height) {
      this.destroy();
      return false;
    }
    return true;
  }

  private destroy(): void {
    this.element.remove();
  }
}

/* ─── Component ──────────────────────────────────────────────────────────── */
interface MorphicBackgroundProps {
  /** Particle (bubble) colour — defaults to FutureLine teal */
  ballColor?: string;
  /** Tailwind classes for the solid background layer */
  bgClassName?: string;
  /** Milliseconds between particle spawns — lower = denser */
  spawnInterval?: number;
}

export const MorphicBackground: React.FC<MorphicBackgroundProps> = ({
  ballColor = '#22a6f7',          // teal-300 — visible on dark bg
  bgClassName = 'absolute inset-0 bg-[#030d1a]',
  spawnInterval = 220,
}) => {
  const particleContainerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameId = useRef<number | undefined>(undefined);
  const isPausedRef = useRef(false);

  useEffect(() => {
    const container = particleContainerRef.current;
    if (!container) return;

    const handleFocus = () => { isPausedRef.current = false; };
    const handleBlur  = () => { isPausedRef.current = true;  };
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur',  handleBlur);

    const particleInterval = setInterval(() => {
      if (!isPausedRef.current && container) {
        particlesRef.current.push(
          new Particle(
            container,
            { x: Math.random() * window.innerWidth, y: window.innerHeight + 100 },
            1 + Math.random(),
            ballColor,
          ),
        );
      }
    }, spawnInterval);

    const update = () => {
      particlesRef.current = particlesRef.current.filter((p) => p.move());
      animationFrameId.current = requestAnimationFrame(update);
    };
    update();

    return () => {
      clearInterval(particleInterval);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur',  handleBlur);
      if (container) container.innerHTML = '';
    };
  }, [ballColor, spawnInterval]);

  return (
    <>
      {/* Particle layer — sits at z-[1], below gradient overlays */}
      <div
        ref={particleContainerRef}
        className="absolute inset-0 z-[1] pointer-events-none opacity-60 [filter:url('#goo-fl')]"
      />

      {/* Solid dark background behind particles */}
      <div className={bgClassName} />

      {/* Goo SVG filter — unique ID to avoid page-level conflicts */}
      <svg className="absolute w-0 h-0" aria-hidden="true">
        <defs>
          <filter id="goo-fl">
            <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="12" />
            <feColorMatrix
              in="blur"
              result="colormatrix"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 21 -9"
            />
            <feBlend in="SourceGraphic" in2="colormatrix" />
          </filter>
        </defs>
      </svg>
    </>
  );
};
