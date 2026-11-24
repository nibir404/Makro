# Makro IDP v2 — build brief (read fully before coding)

Goal: implement the Paper design **1:1** (file `01M84NBVTWPCBQSZCNG7MB99FC`, "IDP V.2") as a working Next.js prototype with dummy data, real routing, and excellent motion / interaction / visual cues. Two layouts of one product: **Canvas** (page `p-3-0`) and **Classic** (page `p-5-0`). Both must support **dark (default) and light** themes.

App: `/Users/macm2/Downloads/Work/makro-idp-v2` — Next 16 (App Router, cache-components strictness), React 19, Tailwind v4, shadcn (style `base-nova` = **Base UI** primitives, NOT Radix — e.g. `DropdownMenuTrigger render={<button/>}`, `Dialog open onOpenChange`), `motion/react`, `lucide-react`, `@xyflow/react`, `sonner`, `next-themes`.
Dev server is ALREADY running at **http://localhost:3100** — do NOT start another. Read `AGENTS.md` (Next 16 docs live in `node_modules/next/dist/docs/`).

## Routing
Everything lives under `src/app/[mode]/…` where mode ∈ `canvas | classic`. The Canvas/Classic toggle swaps the first segment, so **every route you add must exist for both modes** — one `page.tsx` that renders `mode === "canvas" ? <CanvasX/> : <ClassicX/>` (use `useMode()` from `@/lib/mode`). Build links with `const href = useHref(); href("/inbox")`.
Page files that use hooks must be client components (`"use client"`). If a page reads `useSearchParams`, wrap the screen in `<Suspense>` (required by Next 16). Never call `new Date()`/`Math.random()` during render (prerender error) — use fixed design copy or `useEffect`.
Dialog-like states from the design should be reachable by URL too (e.g. `?confirm=1`, `?step=2`, `?tab=acls`) so reviewers can open each frame directly.

## Shared code (do NOT edit; if you truly need a change, describe it in your final report)
- `src/app/globals.css` — tokens. Use semantic Tailwind classes, never raw hex: `bg-page` (#0A0A0A) `bg-surface` (#111) `bg-surface-2` (#1A1A1A) `bg-surface-3` (#262626) `border-line` (#1C1C1C) `border-line-2` (#222) `border-line-3` (#2A2A2A) `text-foreground` (#F9F9F9) `text-muted-foreground` (#A7A7A7) `text-subtle` (#8A8A8A) `text-faint` (#3A3A3A) `text-primary`/`bg-primary` (#E85002) `text-success` `text-warning` `text-info` `text-destructive`. Utility classes: `card-gloss` (glossy gradient card, use with `rounded-[18px]`/`rounded-[16px]`), `btn-primary-gloss`, `btn-secondary-gloss`, `dot-grid` (canvas ground), `skeleton-shimmer`. Light variants: `light:` custom variant. Map Paper hex → closest token; `#FFFFFF0F/14` hairlines → `border-white/6` + `light:border-black/6`.
- `src/components/idp/kit.tsx` — `Btn` (variant primary|secondary|outline|ghost|destructive|link, size xs|sm|md|lg, `href`, `kbd`), `StatusPill` / `StatusText` (lifecycle: draft review approved applying verifying live failed rejected), `StatusDot`, `EnvChip` (only prod coloured), `IntegrationLogo` (`mono` for theme-aware inline marks), `LogoTile`, `Spark` (sparkline, `step`), `GlossCard`, `Panel`, `SectionLabel`, `Eyebrow`, `Kbd`, `FadeIn`, `Stagger`/`StaggerItem`, `useHotkey`, `ease`, `BrandMark`, `UserAvatar`.
- `src/components/shell/*` — Canvas topbar & Classic sidebar are done. Classic pages wrap content in `<ClassicPage crumbs={…}>` (`@/components/shell/classic-page`) which renders the classic topbar; pass custom breadcrumb JSX when the frame shows a deeper path. Canvas pages render directly under the topbar.
- `src/lib/data.ts` — core dummy data (services, inbox, activity, kafka, postgres, secrets, network, infra, projects…). Read & reuse it. Put any EXTRA data your screens need in **your own** file `src/lib/data-ext/<your-area>.ts`.
- `src/components/screens/home.tsx` — reference implementation (Canvas 01a + Classic R1a). Copy its style.
- Logos in `/public/logos/*` (argocd, kubernetes, gitlab, vault, kafka, postgres, netbird.png, pulumi, datadog, okta + mono-*), brand in `/public/brand`, texture `/public/textures/horizon.png`.

## How to match the design 1:1
1. Load Paper tools via ToolSearch: `select:mcp__Paper__get_screenshot,mcp__Paper__get_jsx,mcp__Paper__get_tree_summary,mcp__Paper__get_basic_info` (fileId above). `get_basic_info` with the pageId lists every frame (Canvas page has >100; pass the page id).
2. For each frame you own: `get_screenshot` (scale 0.6) to see it, then `get_jsx` (format `tailwind`, `includeNodeIds:false`) on the frame or its children for exact sizes, spacing, radii, copy. Large frames: use `get_tree_summary` and fetch children separately.
3. Recreate it with our components + semantic tokens. Paper icons are SVG asset URLs — use the matching **lucide-react** icon instead (and `IntegrationLogo` for brand marks). Same copy, same layout, same sizes.
4. Light theme must look right too (only tokens, no hard-coded dark hex).

## Experience bar ("hell good")
- Motion: page/section entrances (`FadeIn`, `Stagger`), shared-layout pills (`layoutId`) for tabs/segmented controls, spring panels/drawers (inspector slides in), `AnimatePresence` for dialogs/toasts/list changes, number count-ups, progress/rollout steppers that animate, sparklines draw in. Keep durations 150–450ms, ease `[0.22,1,0.36,1]`; respect reduced motion (already global).
- Interactions: every button does something — navigate, open dialog, optimistic state change + `toast` (sonner) with **Undo** for tier-1 actions, confirm dialog with diff/blast radius for tier-2 (PROD), type-to-confirm for tier-3 destructive. Keyboard shortcuts shown in the design must work (`useHotkey`). Hover/focus/pressed/disabled states on everything. Loading spinners → success states.
- Visual cues: status colour + icon + label, pulsing dots for in-progress, PROD always flagged, staged-change bars, empty states.

## Done means
- All your routes render in both modes, dark + light, no console errors, `npx tsc --noEmit` clean for your files.
- Each route was opened in a browser at 1440×900 (http://localhost:3100), compared against its Paper screenshot, and the gaps were fixed.
- Do not commit. Do not touch files owned by other areas. Final report: routes built (with URLs for every frame/state), anything you couldn't match, any shared-file change you need.
