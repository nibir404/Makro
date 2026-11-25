<div align="center">

<img src="public/brand/mark.svg" alt="makro IDP" width="64" height="64" />

# makro IDP · v2

**One place to run your services.** Deploy, request resources and approve changes across dev, qa and prod.

`v0.3.0` · prototype with dummy data · Next.js 16 · Tailwind v4 · shadcn/ui

</div>

---

## What this is

The redesign of Makro's Internal Developer Platform, built 1:1 from the Paper design file **"IDP V.2"**. It is a working frontend prototype: every screen is routed and interactive, and all data comes from local dummy fixtures. There is no backend yet.

The app is organised around the **service**. Kafka topics, Postgres users, secrets, network access and monitoring are resources of a service. Every change follows one lifecycle: **Draft → In review → Approved → Applying → Verifying → Live / Failed / Rejected**. Changes are reviewed in a single **Inbox**.

It has two layouts. You can switch between them on any screen without losing your place.

| Mode | URL prefix | Description |
|---|---|---|
| **Canvas** | `/canvas` | Top-bar navigation; services drawn as a node graph with an inspector panel |
| **Classic** | `/classic` | Sidebar navigation; dense tables and dashboards |

Both modes ship with **dark** (default) and **light** themes.

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000 → redirects to /canvas
```

Other scripts:

```bash
npm run build        # production build
npm run start        # serve the build
npm run lint         # eslint
npx tsc --noEmit     # type check
```

Requires Node 20+.

## Documentation

| Doc | Contents |
|---|---|
| [docs/ROUTES.md](docs/ROUTES.md) | Every screen and state, its URL, and the Paper frame it implements |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Folder layout, routing model, design tokens, shared kit, data |
| [docs/DESIGN_IMPLEMENTATION.md](docs/DESIGN_IMPLEMENTATION.md) | Rules for matching the Paper design 1:1 and the interaction/motion standard |
| [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) | Branching, commits, versioning and release tagging |
| [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md) | Known gaps against the design and open work |
| [CHANGELOG.md](CHANGELOG.md) | Release history |

## Tech stack

- **Next.js 16** (App Router) with **React 19** and TypeScript
- **Tailwind CSS v4** and **shadcn/ui**, using the `base-nova` style on Base UI primitives
- **motion** for animation, **@xyflow/react** for the canvas graphs, **sonner** for toasts, **next-themes** for theming
- **lucide-react** icons and the official integration marks (Argo CD, Kubernetes, GitLab, Vault, Kafka, Postgres, NetBird, Pulumi, Datadog, Okta)

## How it fits together

```mermaid
flowchart LR
  U([Developer]) --> S[Service canvas]
  S -- "C · Create" --> D[Draft resource]
  S -- "right-click · Remove" --> R[Staged removal]
  D --> CS[Change set]
  R --> CS
  CS -- "⌘↵ · Review & submit" --> IB[Inbox review]
  IB -- approve --> AP[Applying]
  IB -- reject --> RJ[Rejected]
  AP --> V[Verifying] --> L[Live]
  AP --> F[Failed] -- retry --> AP
```

Every change, whether a new topic, a removed grant or a rotated secret, goes through the same lifecycle: **Draft → In review → Approved → Applying → Verifying → Live / Failed / Rejected**.

## Keyboard

`⌘K` command palette · `N` new request · `J`/`K` move · `A` approve · `R` reject/review · `Esc` close panels.

On the service canvas: `C` create · `⌘↵` review staged changes · `↑ ↓` / `J K` next resource · `/` find · `F` fit · `=` `-` `0` zoom · `?` all shortcuts.

## Status

`0.x` is a prototype: the UI and flows are complete for review, and the data is mocked. API integration comes in later minor versions. See [CHANGELOG.md](CHANGELOG.md).

**0.3.0** adds a canvas view to every platform module (Postgres, Infrastructure, Projects, Secrets, Kafka, Network) behind a shared Canvas / List switch.

**0.2.0** adds an interactive service canvas (create on canvas, staged removal, live edges, minimap, search), a dot-matrix working indicator for long operations, Kafka ACL replace and bulk apply, the missing Vault actions (delete key, rotate SecretID, branches, inheritance) and a clean lint.
