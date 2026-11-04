import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Navy 60 / cream 30 / coral 10: navy page and section backgrounds,
        // cream cards and bands, coral for small accents. The accent tokens
        // keep their old names (teal, lab, mint) so the hundreds of class
        // names that use them didn't have to change; they now hold the coral.
        //
        // The surface and text tokens (canvas, ink, hairline, the accent ink)
        // are CSS variables that follow their surface: cream text on navy,
        // navy text inside cream cards and bands. globals.css sets them.
        navy: {
          DEFAULT: '#011C41',
          light: '#0B2A5C',
          dark: '#000E26',
        },
        teal: {
          // Full scale too, so default-palette classes (teal-400, teal-500…)
          // follow the brand instead of staying green-blue.
          50: '#FFF3F1',
          100: '#FFE3DF',
          200: '#FFC9C2',
          300: '#FFA59A',
          400: '#FF8576',
          500: '#FF6B5B',
          600: '#EE4F3E',
          700: '#C93C2D',
          800: '#A33226',
          900: '#852C23',
          950: '#48130E',
          DEFAULT: '#FF6B5B',
          light: '#FF8A7D',
          dark: '#E5503F',
          ink: 'rgb(var(--fl-accent-ink) / <alpha-value>)', // coral text: light on navy, deep on cream
        },
        // The bright end of the wordmark gradient: a lighter coral.
        mint: {
          DEFAULT: '#FF8A7D',
          light: '#FFC2B9',
        },
        // Surfaces: canvas is the navy page, alt and card are cream.
        // Reads as `bg-canvas text-ink border-hairline`.
        canvas: {
          DEFAULT: 'rgb(var(--fl-canvas) / <alpha-value>)',
          alt: 'rgb(var(--fl-canvas-alt) / <alpha-value>)',
          card: 'rgb(var(--fl-canvas-card) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'rgb(var(--fl-ink) / <alpha-value>)',
          muted: 'rgb(var(--fl-ink-muted) / <alpha-value>)',
        },
        hairline: 'rgb(var(--fl-hairline) / var(--fl-hairline-alpha))',
        // Two-pole accent system (Lab vs Academy). Lab is the coral, the same
        // values as teal.
        lab: {
          DEFAULT: '#FF6B5B',
          light: '#FF8A7D',
          dark: '#E5503F',
          ink: 'rgb(var(--fl-accent-ink) / <alpha-value>)',
        },
        // Academy pole: cream on navy, a lighter navy inside cream surfaces.
        academy: {
          DEFAULT: 'rgb(var(--fl-academy) / <alpha-value>)',
          light: '#8FA0C6',
          dark: '#011C41',
        },
        // Mirrors the reference repo's brand.* namespace so verbatim section
        // components compile. bg/fg/muted use the reference's black canvas;
        // accent/accent2 are mapped to our brand teal (not the reference cyan)
        // so editorial sections inherit FutureLine brand. The DualWalkway 3D
        // scene retains its hardcoded cyan/amber by design.
        brand: {
          bg: '#000000',
          surface: '#0a0a0a',
          fg: '#fafafa',
          muted: '#a1a1aa',
          accent: '#FF6B5B',
          accent2: '#FF8A7D',
        },
        gray: {
          soft: '#EFE6D6',
        },
        surface: {
          DEFAULT: '#031231',
          dim: '#031231',
          bright: '#2b3859',
          'container-lowest': '#000d2a',
          'container-low': '#0b1a39',
          container: '#101f3e',
          'container-high': '#1b2949',
          'container-highest': '#263454',
        },
        'on-surface': '#d9e2ff',
        'on-surface-variant': '#bcc9c6',
        outline: '#869490',
        primary: {
          DEFAULT: '#5edac8',
          container: '#1466de',
        },
        secondary: {
          DEFAULT: '#93AEFF',
          container: '#2A3475',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
        // Display face for headings and the wordmark treatment: Sora for Latin,
        // Alexandria for the Arabic letters Sora lacks. Order matters; see
        // layout.tsx.
        display: ['var(--font-display)', 'var(--font-display-arabic)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
        // Arabic face — Inter and Sora have no Arabic coverage, so
        // any Arabic string without this renders as tofu.
        arabic: ['var(--font-arabic)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        pill: '999px',
        card: '24px',
        panel: '32px',
      },
      transitionTimingFunction: {
        // The redesign's single easing curve — every entrance and settle.
        'out-expo': 'cubic-bezier(.16,1,.3,1)',
      },
      backgroundImage: {
        // Buttons carry white text, so they stay navy (white on coral is 2.8:1).
        'brand-gradient': 'linear-gradient(135deg, #011C41, #0B2A5C)',
        'brand-gradient-hover': 'linear-gradient(135deg, #000E26, #011C41)',
        'lab-glow': 'radial-gradient(ellipse at center, rgba(255, 107, 91, 0.25), transparent 70%)',
        'academy-glow': 'radial-gradient(ellipse at center, rgba(58, 82, 136, 0.22), transparent 70%)',
      },
      animation: {
        spotlight: 'spotlight 2s ease .75s 1 forwards',
        'marquee-left': 'marquee-left 28s linear infinite',
        'marquee-right': 'marquee-right 32s linear infinite',
        'glitch-rgb': 'glitch-rgb 7s steps(1) infinite',
        // Redesign motion set
        'gradient-flow': 'gradient-flow 8s ease-in-out infinite',
        sheen: 'sheen 4.5s cubic-bezier(.16,1,.3,1) infinite',
        'chip-bob': 'chip-bob 6s ease-in-out infinite',
        'cue-drop': 'cue-drop 1.9s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 1.8s infinite',
        'orbit-spin': 'orbit-spin 26s linear infinite',
        'orbit-spin-slow': 'orbit-spin 30s linear infinite',
      },
      keyframes: {
        spotlight: {
          '0%': { opacity: '0', transform: 'translate(-72%, -62%) scale(0.5)' },
          '100%': { opacity: '1', transform: 'translate(-50%, -40%) scale(1)' },
        },
        'marquee-left': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'marquee-right': {
          '0%': { transform: 'translateX(-50%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'glitch-rgb': {
          '0%, 92%, 100%': {
            textShadow: '0 0 0 transparent',
          },
          '93%': {
            textShadow: '-2px 0 0 rgba(61, 143, 240, 0.85), 2px 0 0 rgba(245, 166, 35, 0.75)',
          },
          '95%': {
            textShadow: '2px 0 0 rgba(61, 143, 240, 0.85), -2px 0 0 rgba(245, 166, 35, 0.75)',
          },
          '97%': {
            textShadow: '0 0 0 transparent',
          },
        },
        // --- Redesign motion set ---
        // Sweeps a 220%-wide gradient across clipped text.
        'gradient-flow': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        // Light sweep across the primary CTA.
        sheen: {
          '0%, 55%': { left: '-70%' },
          '100%': { left: '140%' },
        },
        'chip-bob': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-9px)' },
        },
        'cue-drop': {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '70%': { transform: 'translateY(14px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '0' },
        },
        // Expanding ring on "live" status dots.
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(13,148,136,.5)' },
          '70%': { boxShadow: '0 0 0 8px rgba(13,148,136,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(13,148,136,0)' },
        },
        'orbit-spin': {
          to: { transform: 'rotate(360deg)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
