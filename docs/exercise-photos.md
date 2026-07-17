# Exercise photos — regenerating locally

The exercise library uses **crafted glyph tiles** by default (`ExerciseThumb` +
`ExerciseGlyph`) — consistent across all exercises, no image files required.

Curated photos are **optional** and can be layered back in. The first batch of
generated 3D-mannequin photos looked blobby and generic, so they were removed.
This doc is how to regenerate a better set **on a machine where the Higgsfield
CDN is reachable** (the cloud/CI sandbox blocks `*.cloudfront.net` egress, so
the download step can't run there — generation works, the fetch doesn't).

## Improved prompt

The old prompt produced featureless grey blobs. Use a prompt that asks for a
defined, athletic figure and a cleaner render:

> "Premium fitness app exercise icon — a single athletic figure with clear,
> defined anatomy performing {SCENE}, clean side profile, smooth matte 3D
> render, dark charcoal background #0E1013, one subtle lime-green #CDFB45 rim
> light on a single edge, centered with generous padding, minimalist, sharp and
> readable at small sizes, no text, no logos"

`{SCENE}` = the exercise name plus its first instruction, e.g. *"a barbell back
squat, sitting down and back to depth with the bar on the upper back"*.

Model: `nano_banana_pro`, `aspect_ratio: "1:1"` (matches the 1024×1024 tiles).

## Pipeline (run locally)

For each exercise id (`EXERCISES` in `src/data/exercises.ts`):

1. `generate_image({ model: 'nano_banana_pro', params: { aspect_ratio: '1:1', prompt } })`
   → note the returned `job id`.
2. `job_display(id)` → copy the `results.minUrl` (a `..._min.webp`).
3. `curl -sS -o public/exercises/<id>.webp "<minUrl>"`.

~2 credits each. Review the results — keep the good ones.

## Turning photos on

`ExerciseThumb` prefers a photo only for ids listed in its `PHOTO_IDS` set
(empty by default, so no 404s for absent photos). After adding `.webp` files,
add their ids there:

```ts
const PHOTO_IDS = new Set<string>(['bench-press', 'squat', /* … */]);
```

Anything not listed keeps the crafted glyph tile, so a partial photo set still
looks consistent.
