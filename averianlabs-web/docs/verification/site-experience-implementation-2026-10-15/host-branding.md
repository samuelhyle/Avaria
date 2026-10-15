# Host badge configuration evidence — 2026-10-15

The public Netlify badge was injected by the hosting edge, independently of this repository. Its bottom-right fixed iframe overlapped the Finnish mobile calculator result title in the release screenshot. The app source contained no badge code or setting.

[Netlify’s official badge documentation](https://docs.netlify.com/manage/projects/powered-by-netlify-badge/) describes the per-project **Project configuration → General → Powered by Netlify badge** on/off control and says changes apply to the next request without a redeploy. It documents edge injection and an isolated frame. No supported position setting was found.

The current shipped [official dashboard application](https://app.netlify.com/assets/js/app.3ef0d695000c2b835d8a.js) submits the exact changed field `built_with_badge_enabled` as a boolean. Its [official API client](https://app.netlify.com/assets/js/lib.f99efe1571030a8031e3.js) implements the save as `PUT /api/v1/sites/{site_id}` with `JSON.stringify(payload)`. The targeted owner setting is therefore `{ "built_with_badge_enabled": false }` with existing authorized credentials. It does not change billing, plan, project visibility or deployment locks.

There is a documentation/implementation distinction: the general documentation describes the toggle, while the current dashboard additionally disables it and displays a paid upgrade prompt if the account capability `can_remove_netlify_badge` is explicitly false. Read-only authenticated responses for this existing project confirmed role **Owner**, existing **Pro** plan and capability **true**. No purchase or upgrade is needed. The [public OpenAPI schema](https://open-api.netlify.com/swagger.json) exposes `updateSite` with PATCH but currently omits the newer badge field; the exact PUT and payload above come from the live official dashboard implementation, rather than a guessed undocumented property.

Before the owner action, the live Finnish calculator HTML contained `script[src^="/.netlify/scripts/hud"][data-nf-variant="public"]`. The official injected script creates `iframe#nl-badge-frame[title="Powered by Netlify"]`, initially fixed at bottom/right with width 216px, height 92px and z-index 2147483645. The private owner variant uses `iframe#nl-hud-frame[title="Netlify"]`.

The release owner performs the supported toggle and records its verification separately. This investigation made no hosting mutations, app/CSS changes, plan changes, visitor-dismissal storage writes or redeploys. Fresh-context EN/FI calculator checks at mobile and desktop sizes should establish that both the public script and badge iframe are absent and result headings remain unobscured.

The companion [host-branding.json](host-branding.json) retains sanitized capability facts, exact selectors and hashes of the primary dashboard/HUD sources. No account identity or credentials are included.
