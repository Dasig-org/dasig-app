Files the share images (`src/app/og/[slug]/route.tsx`) are drawn with.

- `inter-600.woff`, `inter-800.woff`: Inter by Rasmus Andersson, SIL Open Font License 1.1 (from Fontsource).
- `screens/*.png`: PNG copies of `public/screens/*.webp` at 360px wide, because the image renderer can't read WebP.
  Regenerate them when a screenshot changes.
