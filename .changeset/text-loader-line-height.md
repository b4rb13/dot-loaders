---
'dotquilt': patch
---

A pending TextLoader inside a line of text no longer makes the line taller. While its value was still empty and only the mask showed, the loader had no text baseline and sat on the line by its bottom edge, so a 42 px line at 28 px type grew to 53 px. Its layers now share one baseline, the mask's, so the line keeps its height.
