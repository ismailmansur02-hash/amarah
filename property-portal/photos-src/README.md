# Photographs for the landing page

Drop full-size originals in here, named after the slot they fill:

| File           | Where it appears                                        |
| -------------- | ------------------------------------------------------- |
| `hero.jpg`     | The full-screen opening image                            |
| `interior.jpg` | The "from takeover to rent ready" band                   |
| `aerial.jpg`   | The "theirs, and only theirs" band near the bottom       |

`.jpg`, `.png` and `.heic` all work. Use the largest version you have —
straight off the camera or the photographer's export is ideal. Nothing here
is served to anyone; these are the masters.

Then, from `property-portal/`:

    node scripts/prepare-photos.mjs

That writes resized AVIF and WebP copies into `public/photos`, which *are*
served. Commit both directories and redeploy — the page picks the photographs
up on its own, with no code change.

Until a slot has a photograph, the page draws its own scene for it, so it
always looks finished.

A note on what to shoot: these read as atmosphere behind text, not as
listings. Wide, calm, and light on detail works better than a tight shot of a
feature, and anything with a house number, a street sign or a person in it
will fight the type sitting on top of it.
