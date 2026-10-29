# Brand assets

The logo is **The Living F** (approved artwork, October 2026).

| File | Use |
| --- | --- |
| `public/brand/futureline-mark.svg` | The mark in navy (`#011C41`) for light backgrounds: header, footer, sign-in pages |
| `public/brand/futureline-mark-white.svg` | The mark in white, for dark backgrounds: header over the home hero, splash intro |
| `public/brand/futureline-logo-512.png` | Navy mark on white, the logo search engines show (schema.org `Organization.logo`) |
| `public/og/futureline-share.jpg` | 1200×630 link preview: the 3D chrome artwork on blue |
| `src/app/icon.png`, `apple-icon.png`, `favicon.ico` | Browser and home-screen icons: white mark on a navy tile |

The approved master is a raster (a 1536×1024 PNG inside an SVG wrapper). The
two mark SVGs were traced from its flat white-on-navy variant, so they are
true vectors and stay sharp at any size. The 3D chrome version is only used
where it is shown large (the share image); at header size its glow and dark
backdrop don't read on the light pages.

The site's wordmark ("FutureLine" next to the mark) is live text in the
display font, not part of the image, so it stays sharp and translatable.

## Colours

Taken from the logo artwork. Tailwind tokens live in `tailwind.config.ts`;
the accent tokens kept their old names (`teal`, `lab`, `mint`) so class names
didn't change, but they hold these blues.

| Role | Value | Token | Notes |
| --- | --- | --- | --- |
| Navy (text, dark surfaces) | `#011C41` | `navy`, `ink` | The flat logo's navy |
| Royal blue (accent) | `#1466DE` | `teal`, `lab` | 5:1 on the page background, so usable for text |
| Royal blue, text | `#0E50C0` | `teal-ink`, `lab-ink` | Small text and icons, 6.7:1 |
| Azure (bright end of gradients) | `#22A6F7` | `mint` | The "Line" blue; decorative only (2.5:1) |
| Periwinkle (Academy pole) | `#5B7BFB` | `academy` | Unchanged |
| Page background | `#F6F8FC` / `#EDF2FA` | `canvas`, `canvas-alt` | Tinted toward the logo blue |
| Muted text | `#52627A` | `ink-muted` | 5.8:1 |
