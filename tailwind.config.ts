import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Palette from the Living F logo (docs/BRAND.md): its navy, the deep
        // royal of its glow and the azure of "Line". The accent tokens keep
        // their old names (teal, lab, mint) so the hundreds of class names
        // that use them didn't have to change; they now hold the logo blues.
        navy: {
          DEFAULT: '#011C41',
          light: '#0B2A5C',
          dark: '#000E26',
        },
        teal: {
          // Full scale too, so default-palette classes (teal-400, teal-500…)
          // follow the brand instead of staying green-blue.
          50: '#EEF5FF',
          100: '#D9E8FF',
          200: '#BCD7FF',
          300: '#8EBEFF',
          400: '#59A0FB',
          500: '#2A82F2',
          600: '#1466DE',
          700: '#0E50C0',
          800: '#0E3F94',
          900: '#0F3570',
          950: '#0A2247',
          DEFAULT: '#1466DE', // 5:1 on canvas, so it also works as text
          light: '#3D8FF0',
          dark: '#0E50C0',
          ink: '#0E50C0', // small text and icons on light surfaces, 6.7:1
        },
        // The bright end of the wordmark gradient: the logo's azure.
        mint: {
          DEFAULT: '#22A6F7',
          light: '#7CC8FB',
        },
        // Light-surface palette, tinted toward the logo's blue.
        // Reads as `bg-canvas text-ink border-hairline`.
        canvas: {
          DEFAULT: '#F6F8FC',
          alt: '#EDF2FA',
          card: '#FFFFFF',
        },
        ink: {
          // Body text is the brand navy rather than a neutral black.
          DEFAULT: '#011C41',
          muted: '#52627A',
        },
        hairline: 'rgba(1, 28, 65, 0.10)',
        // Two-pole accent system (Lab vs Academy). Lab is the logo's royal
        // blue, the same values as teal.
        lab: {
          DEFAULT: '#1466DE',
          light: '#3D8FF0',
          dark: '#0E50C0',
          ink: '#0E50C0',
        },
        // Academy pole — wordmark's blue end (lavender → deep navy).
        // Replaces the off-brand amber so Academy and Lab read as the
        // two poles already present in the FutureLine wordmark.
        academy: {
          DEFAULT: '#5B7BFB',
          light: '#93AEFF',
          dark: '#2A3475',
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
          accent: '#1466DE',
          accent2: '#3D8FF0',
        },
        gray: {
          soft: '#F4F6F9',
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
        // Display face for headings and the wordmark treatment.
        display: ['var(--font-display)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
        // Arabic face — Inter and Space Grotesk have no Arabic coverage, so
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
        'brand-gradient': 'linear-gradient(135deg, #0B2A5C, #1466DE)',
        'brand-gradient-hover': 'linear-gradient(135deg, #011C41, #0E50C0)',
        'lab-glow': 'radial-gradient(ellipse at center, rgba(20, 102, 222, 0.25), transparent 70%)',
        'academy-glow': 'radial-gradient(ellipse at center, rgba(91, 123, 251, 0.28), transparent 70%)',
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
