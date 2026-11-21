---
'@dotquilt/react': patch
---

Server-rendered loaders keep their layout until the elements register:

- Your own classes now win over the static styles, as they do once the element is defined. The static rules matched the element at a higher specificity than a class, so a `SkeletonCircle` or `TextLoader` sized by a class (`.avatar { width: 48px }`) drew at its default size in the server HTML, then jumped when the element registered.
- A pending `LoadingRegion` reserves its placeholder's space. The placeholder lay over the content, so a region whose content was still empty, or an empty list, was only as tall as that content (often 0 px) until the element registered. The placeholder is now in flow, with any content below it, as the server rendering guide describes.
