# Northstar Logistics

A warehouse operations demo built with Next.js, React, TypeScript, Tailwind CSS, and React Three Fiber.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Warehouse layout editors

- `/layout-editor` provides a draggable 2D floor plan.
- `/layout-editor/3d` provides orbit, move, rotate, and scale controls for the 3D layout.
- Both editors share a browser-local draft. Saving updates the dashboard scene in the same browser.
- Facility dimensions and asset properties include inventory numbers, manufacturer, model, notes, and equipment height.

Dashboard data and equipment movement are demonstration data. Layouts are stored in browser `localStorage`; there is no connected database, authentication, GPS feed, or server-side synchronization.

## Quality checks

```bash
npm run lint
npm run build
```
