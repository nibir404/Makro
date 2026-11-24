# Known issues and open work (v0.1.0)

## Design fidelity
- **Not compared visually:** some screens were not checked against their Paper frame in a browser and may differ in detail:
  - several Classic variants
  - the Rollback, Scale and Image-updater dialogs
  - the new-user home
  - parts of the light theme
- **Missing frames:** Paper's API lists only 100 of the 104 frames on the Canvas page. The last 4 were not seen or built.
- **No Paper frame:** Kafka topic detail, Postgres database detail, and the project Members/Settings tabs follow the same visual style but are not designed in Paper.
- **Graph layout in Classic:** node positions in the project canvas and stack graph are tuned to Canvas width, so in Classic some labels sit slightly off.
- **Add-resource backdrop:** the backdrop behind the add-resource panel is a simplified copy of the service page, not the live canvas.

## Behaviour
- **Dummy data:** all data is mock data. Actions change local state only.
- **Partial actions:** a few actions only show a toast, such as "View logs", "View code" and "Group by".
- **Undo out of sync:** undoing a removed change in add-resource review doesn't decrement the canvas staged count until the next stage.

## Code quality
- **Lint findings:** `npm run lint` reports ~30 React-compiler style findings (`react-hooks/static-components`, `set-state-in-effect`, `immutability`) plus a few unused vars. The build and type check pass. The `static-components` findings in `screens/shell-states/pages.tsx` should be fixed first because they can reset component state.
