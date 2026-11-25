# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/). See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for the release process.

## [Unreleased]

## [0.2.0] - 2026-11-25

Interaction pass on the service canvas, the missing screens from the gap audit against Paper and the old IDP, and a clean lint.

### Added
- **Service canvas, rebuilt** (`screens/service/canvas.tsx`):
  - Pan and zoom run outside React (ref + direct transform), so nodes don't re-render while you move; zoom follows the cursor (⌘/ctrl + scroll, pinch); the dot grid moves with the world.
  - Fits the graph on open and on resize until you take over; `F` refits.
  - Drag nodes to arrange them; the layout is saved per service, with **Reset layout**.
  - Live edges (traffic dots, faster with more throughput), hover focus, live sparklines.
  - Search (`/`), **Needs attention** and **Drafts** filters, `↑ ↓` / `J K` between resources, minimap, right-click menus, double-click to zoom to a node, `?` shortcut sheet.
- **Create on canvas** (`screens/service/create.tsx`): press `C` or **Create** for a "What do you need?" palette with drill-down and search. Picking an item drops a draft node with a camera swoop and beam, stages it for review, and `⌘↵` opens the review.
- **Remove a resource from a service** as a staged change (right-click a node), with impact copy, type-to-confirm on PROD and Undo. **Delete service** is also on right-click of the service node.
- **Working indicator** (`components/idp/working.tsx`): LED dot-matrix (`ripple`, `rise`, `scan`) plus a glow sweeping across the label, CSS-only and reduced-motion aware. Used in new-service provisioning (with a pill under the new node), add-resource submitted → live, the canary rollout, applying canvas nodes and applying Kafka ACLs.
- **Kafka ACLs** (`/kafka/acls`): platform-wide list with row selection, bulk apply (confirm, sequential run, partial-failure banner and retry) and **Replace ACL** with locked fields and PROD review. Ported from the old IDP (06h–06n); linked from the Kafka tabs and the Users ACL counts.
- **Vault actions** in Secrets (`screens/secrets/vault-dialogs.tsx`), ported from the old IDP (Kura):
  - Delete a key, staged with Undo and listed in the PROD confirm.
  - Rotate SecretID: confirm → generate → shown once; the dialog can't close until the value is copied or marked stored.
  - Create and delete branches (branch tabs, type-to-confirm delete).
  - Manage inheritance: choose and order parent configs, with an effective-keys preview and a warning for keys that would be lost.
- In-app entry points for screens that were URL-only: **Lookup** tab in Network access, **All databases** in Postgres.

### Changed
- The canvas **Add** button is now **Create** (opens the palette); the full add-resource panel is one click away from the palette.
- URL-opened overlays (`?cmdk=`, `?menu=`, `?notifications=`) read the URL with `useSearchParams` instead of an effect.
- The Classic sidebar's collapsed state and the home date are read through `useSyncExternalStore`, so they no longer flash after load.

### Fixed
- All `npm run lint` findings (34): components created during render in `shell-states/pages.tsx` (they reset state), values reassigned during render, form submit handlers written into props during render (now `useImperativeHandle`), and set-state-in-effect patterns.

## [0.1.0] - 2026-11-25

First prototype of the IDP v2 redesign, built from the Paper file "IDP V.2" (pages "New UI · Canvas mode" and "New UI · Classic mode").

### Added
- Next.js 16 app with Tailwind v4, shadcn/ui (Base UI), motion, @xyflow/react, sonner and next-themes.
- Design tokens ported 1:1 from Paper, with dark (default) and light themes.
- **Canvas** and **Classic** layouts under `/canvas` and `/classic`. A toggle on every screen switches between them and keeps the current route.
- Canvas shell: top bar, namespace and service switchers, Platform menu, ⌘K palette, avatar menu.
- Classic shell: collapsible sidebar, breadcrumb top bar, notifications sheet.
- Screens and states for every flow:
  - Home: regular, new-user, loading and error states; overview dashboard.
  - Services: list; service canvas with list and empty views.
  - Resource inspectors for Kafka (config, ACLs, history), Postgres (credentials, rotate), Secrets and Network access, including the applying and failed states.
  - Add resource: type picker, six resource forms, review change set, submitted → live tracker.
  - New service: template, configure, provisioning, failed + retry.
  - Service tabs (Deploys, Metrics, Settings) and the deploy operations promote, canary rollout, scale, image updater, edit config, rollback and delete.
  - Inbox: review, PROD confirm, reject with reason, all clear, my requests, done.
  - Activity: overview, audit log, event detail, no-results state.
  - Projects: switcher, list, overview, canvas, create, delete.
  - Infrastructure: stacks, requests, stack detail, graph and error, new request, plan review, request outcomes.
  - Network access: grants, revoke, groups, user lookup and mismatches, access review, access map, request form.
  - Secrets: inline edit, versions and inheritance, compare, .env upload, access log, inheritance tree, branch and service tokens.
  - Kafka: topic catalog, topic detail, users.
  - Postgres: overview, all databases, database detail with rotate and rollback.
  - Profile and API keys, What's new, platform status, patterns, loading skeleton, 404 and offline.
- Three-tier action contract: tier 1 runs with an Undo toast, tier 2 needs a PROD confirm showing the diff, tier 3 needs the name typed to confirm.
- Keyboard shortcuts (⌘K, N, J/K/A/R, Esc, canvas zoom).
- Dummy data fixtures in `src/lib/data.ts` and `src/lib/data-ext/`.
- Documentation: README, routes index, architecture, design-implementation brief, contributing and versioning guide, known issues.

[Unreleased]: https://github.com/nibir404/Makro/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/nibir404/Makro/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/nibir404/Makro/releases/tag/v0.1.0
