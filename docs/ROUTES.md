# Makro IDP v2 — screen index

Run `npm run dev -- -p 3100`, then open http://localhost:3100.
Every path works with both prefixes: **`/canvas`** (Paper page "New UI · Canvas mode") and **`/classic`** ("New UI · Classic mode").
Use the Canvas/Classic toggle to switch on the same screen. Change the theme from the avatar menu or ⌘K.

| Flow | Path (after `/canvas` or `/classic`) | Paper frames |
|---|---|---|
| Home | `/` | 01a · R1a |
| Home states | `/home-states?state=new-user\|loading\|error` | R1b · R1c |
| Overview dashboard | `/overview` | R1f |
| Services list | `/services` | C2a |
| Service canvas / resources | `/services/order-service` (`?view=list`, `?env=dev\|qa`) | 02a · 02b · C2b |
| Empty service | `/services/price-api` | 02h |
| Inspectors | `/services/order-service/r/orders.created.v1` (`?tab=config\|acls\|history`, `?state=applying\|failed`) | 05a–b · 10a–c |
| | `…/r/pg-prod-orders` (`?tab=credentials\|rotate`) · `…/r/secrets-prod` · `…/r/warehouse-api-443` | 05c–e · 10d–e |
| Add resource | `/services/order-service/add` → `/add/kafka\|postgres\|database\|secret\|network\|monitoring` → `/add/review` → `/add/submitted` | 04a–d · C04* |
| New service | `/services/new?step=pick\|configure\|provisioning\|failed` | 07a–d |
| Deploys / Metrics / Settings | `/services/order-service/deploys`, `/metrics`, `/settings` | 06a · 06d · C2c–e |
| Deploy ops | add `?op=promote\|rollout\|scale\|image-updater\|edit-config\|rollback\|delete` to any service page | 15a–e · 06b · C16d |
| Inbox | `/inbox` (`?confirm=1`, `?reject=1`, `?state=clear`, `?tab=mine\|done`) | 03a–d |
| Activity | `/activity`, `/activity/audit`, `/activity/ev-acl`, `/activity/audit?q=zzz` | 08a–d |
| Shell overlays | `?cmdk=rollb`, `?menu=platform`, `?menu=avatar`, `?notifications=1` (or ⌘K, avatar, Platform, bell) | 09a · 09b · 09f · R1d · R1e |
| Profile & keys | `/profile` | 09c |
| Skeleton / 404 / offline | `/skeleton`, `/anything`, `/offline` | 09d · 09e |
| What's new / Status / Patterns | `/whats-new`, `/status`, `/patterns` | 16i · 16j · 16k |
| Projects | `/projects` (`?switcher=1`), `/projects/new`, `/projects/commerce` (`?view=canvas`, `?delete=1`, `?tab=members\|settings`) | 11a–f |
| Infrastructure | `/infra` (`?tab=requests`), `/infra/new`, `/infra/stacks/commerce-order-service` (`?view=graph`), `/infra/stacks/supply-chain-replenish?state=error`, `/infra/requests/IR-1042` (`?outcome=approved\|verifying\|done\|rejected`) | 12a–f · 16g–h |
| Network access | `/network` (`?revoke=pg-prod-orders`), `/network/groups`, `/network/lookup`, `/network/review`, `/network/map`, `/network/request` | 13a–f · 16e |
| Secrets | `/secrets`, `/secrets/order-service`, `/versions?key=DATABASE_URL`, `/compare`, `/upload`, `/access-log`, `/tree`, `/tokens` | 14a–f · 16f |
| Vault actions | `/secrets/order-service?rotate=secretid` (rotate SecretID, shown once), `?branch=new` (create branch), `?inherit=1` (manage inheritance); delete a key from its row (trash icon); delete a branch from its tab header | no Paper frame · ported from old IDP Kura 05i/05k/05p/05q/05t/05u |
| Kafka | `/kafka` (`?view=cluster`), `/kafka/topics/orders.created.v1` (`?tab=…`), `/kafka/users` (`?rotate=…`, `?new=1`) | 16a · 16b · C4d |
| Kafka ACLs | `/kafka/acls` (`?apply=1` bulk confirm, `?state=partial` partial failure, `?replace=ka-0001`) | no Paper frame · ported from old IDP 06h–06n |
| Postgres | `/postgres`, `/postgres/databases`, `/postgres/pg-prod-orders` (`?rotate=order_svc_rw`, `?rollback=1`) | 16c · C4e |

Keyboard: ⌘K palette, `N` new request, `J/K` move, `A` approve, `R` reject or review, `Esc` close panels.

Service canvas: `C` create on canvas, `⌘↵` review staged changes, `↑ ↓` / `J K` previous / next resource, `/` find, `F` fit, `=` `-` zoom, `0` 100%, `?` shortcuts. ⌘ + scroll zooms at the cursor, drag moves nodes (layout is remembered per service), right-click a node for actions (open, zoom, history, copy, remove from service), right-click the service for Delete service.
