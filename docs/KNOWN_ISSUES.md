# Known issues and open work (v0.2.0)

## Design fidelity
- **Not compared visually:** some screens were not checked against their Paper frame in a browser and may differ in detail:
  - several Classic variants
  - the Rollback, Scale and Image-updater dialogs
  - the new-user home
  - parts of the light theme
- **Mobile (16l):** the 390px layout from Paper (inbox-first home, bottom tab bar, canvas as a list, inspectors as bottom sheets) is not built. The app is laid out for 1440px.
- **No Paper frame:** these follow the same visual style but have no frame in Paper:
  - Kafka topic detail, Postgres database detail, the project Members/Settings tabs
  - added in 0.2.0: Kafka ACLs (`/kafka/acls`), the Vault dialogs, the canvas create palette and the working indicator
- **Not in the new design (old IDP parity):** creating, editing and deleting Vault projects; custom Vault configs beyond dev/qa/prod; the Postgres "Connect database" dialog. Confirm with product whether they come back.
- **Graph layout in Classic:** node positions in the project canvas and stack graph are tuned to Canvas width, so in Classic some labels sit slightly off.
- **Add-resource backdrop:** the backdrop behind the add-resource panel is a simplified copy of the service page, not the live canvas.

## Behaviour
- **Dummy data:** all data is mock data. Actions change local state only.
- **Partial actions:** a few actions only show a toast, such as "View logs", "View code" and "Group by".
- **Undo out of sync:** undoing a removed change in add-resource review doesn't decrement the canvas staged count until the next stage.

- **Canvas drafts don't persist:** resources created on the canvas live in memory; a full reload drops them from the canvas (they stay in the review change set).

## Code quality
- `npm run lint`, `npx tsc --noEmit` and `npm run build` are clean as of 0.2.0.
- **Dev-only warning:** `/[mode]/services/[service]` logs an "instant navigation" warning in `next dev` because the service layout reads params outside `<Suspense>`. It doesn't affect the build.
