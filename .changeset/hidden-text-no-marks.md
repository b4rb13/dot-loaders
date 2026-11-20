---
'dotquilt': patch
---

The handoff no longer draws marks for text you can't see. It measured text with `getClientRects()`, which ignores clipping, so a visually hidden table header (a 1 px box with `overflow: hidden`, `clip` or `clip-path: inset(50%)`) became a stray row of marks. Text and boxes are now clipped by their ancestors' `overflow`, `clip` and `clip-path` up to the region, and what shows less than 2 px isn't a target.
