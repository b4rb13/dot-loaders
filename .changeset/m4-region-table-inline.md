---
'@dotquilt-internal/core': patch
'@dotquilt-internal/react': patch
---

Reduce inline Region and Table adapter delivery by keeping pre-upgrade replay with each family, removing a redundant skeleton coordination round trip, and reusing native static Table layout through a private capability. Keep the frozen public controls, animation recipes, accessibility, CSP, hydration snapshots and lifecycle cleanup. Block and TypingDots retain their complete CSS-mode passes; remaining numerical/environment gates stay open and npm publishing disabled.
