# Optional: photoreal muscle-map figure (Higgsfield)

The muscle heat map (`src/components/exercise/MuscleMap.tsx`) is a pure-SVG anatomical
silhouette with volt heat plates — resolution-independent, offline-friendly, zero payload.

A photoreal 3D-render alternative was explored (2026-07-19): two 1024×1024 renders of a
graphite anatomical mannequin (front + back, side by side, matching the app's base `#0B0D11`)
were generated with the Higgsfield MCP (`nano_banana_pro` lineage, model `nano_banana_2`):

- Job `ff6d47e1-3401-4ef8-ba0f-6e2c410ae207`
- Job `bf6d2c36-4135-4a91-8530-b31fd3fb1ec6`

The cloud sandbox's egress policy blocks the Higgsfield CDN (`d8j0ntlcm91z4.cloudfront.net`,
403 on CONNECT — same limitation as `docs/exercise-photos.md`), so the renders couldn't be
pulled into the repo from a cloud session.

To layer them in from a local machine: fetch either job's `rawUrl` via the Higgsfield MCP
(`job_display <id>`), save to `public/muscles/figure.png`, and render it behind the SVG heat
plates (the plates already carry all dynamic behaviour; the raster would replace only the
silhouette layer). Evaluate against the SVG first — the vector version scales crisper at the
card sizes the app actually uses.
