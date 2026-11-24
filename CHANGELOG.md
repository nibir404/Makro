# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/). See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for the release process.

## [Unreleased]

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

[Unreleased]: https://github.com/nibir404/Makro/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/nibir404/Makro/releases/tag/v0.1.0
