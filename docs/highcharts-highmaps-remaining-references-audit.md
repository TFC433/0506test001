# Highcharts / Highmaps Remaining References Audit

## 1. Purpose

This audit records remaining Highcharts / Highmaps references after the current ECharts migration work. It is documentation-only and does not remove or modify any dependency, script, package, or runtime file.

## 2. Files inspected / search method

Search was performed locally with `rg` only. No internet access was used.

Search terms:

```text
Highcharts
Highcharts.chart
Highcharts.mapChart
Highmaps
highcharts
highmaps
createThemedChart
assets/vendor/highcharts
tw-all.js
```

Primary source search excluded generated `repomix-packs/**`, local vendor payloads, and package metadata where noted. A broader search was also used to identify package and vendor references.

## 3. Remaining references table

| File | Reference | Classification | Notes |
|---|---|---|---|
| `public/dashboard.html` | `assets/vendor/highcharts/highmaps.js`, `data.js`, `tw-all.js`, `exporting.js`, `export-data.js`, `accessibility.js` | vendor/script loading | Dashboard still loads Highcharts / Highmaps vendor scripts before `assets/vendor/echarts/echarts.min.js`. |
| `public/scripts/services/charting.js` | `getHighchartsThemeOptions`, `createThemedChart`, `Highcharts.color`, `Highcharts.chart` | wrapper/helper | Shared chart helper still contains an active Highcharts wrapper and theme helper. Same file also contains `createEChartsThemedChart`. |
| `public/scripts/dashboard/dashboard_widgets.js` | fallback block using `Highcharts` / `createThemedChart` / `Highcharts.chart` | legacy unused code / fallback | Current trend path returns after `createEChartsThemedChart`. The later Highcharts block appears unreachable in the current function path unless the return structure is changed later. |
| `public/scripts/events/event-charts.js` | `Highcharts`, `createThemedChart` callers for event trend/type/size charts | active runtime dependency | Event charts still call the Highcharts wrapper. This is outside the accepted Dashboard / Sales Analysis / Taiwan map ECharts baseline and is not safe to remove without event module forensics. |
| `public/assets/vendor/highcharts/*` | Highcharts / Highmaps vendor files including `tw-all.js` | vendor/script loading | Local vendor files remain present. |
| `scripts/setup-highcharts-vendor.js` | Highcharts vendor copy setup and `tw-all.js` | vendor/setup script | Script remains available to copy Highcharts assets from local `node_modules`. |
| `package.json`, `package-lock.json` | `highcharts`, `@highcharts/map-collection` | package dependency | Dependencies remain declared. Do not remove until active runtime references are eliminated. |
| `repomix-packs/**` | copied Highcharts references | comment/documentation / generated snapshot | Repomix packs mirror historical/source content and are not primary runtime owners. |

## 4. Classification summary

Active runtime dependency:

* `public/scripts/events/event-charts.js`
* `public/dashboard.html` script loading while event charts or any fallback still rely on Highcharts

Legacy unused code:

* The Highcharts fallback block in `public/scripts/dashboard/dashboard_widgets.js` appears legacy after the accepted ECharts trend path because the ECharts branch returns before the fallback block.

Vendor/script loading:

* `public/dashboard.html`
* `public/assets/vendor/highcharts/*`
* `scripts/setup-highcharts-vendor.js`
* package metadata

Wrapper/helper:

* `public/scripts/services/charting.js`

Comment/documentation:

* `repomix-packs/**`
* comments inside Highcharts-era source files

## 5. Do any charts still appear to depend on Highcharts / Highmaps?

Yes. Event charts in `public/scripts/events/event-charts.js` still depend on `Highcharts` and `createThemedChart`.

The current Dashboard business trend chart, Sales Analysis charts, and Taiwan map use ECharts paths, but Highcharts cannot be removed globally while event charts and script loading remain.

## 6. Does `public/dashboard.html` still load Highcharts / Highmaps scripts?

Yes. `public/dashboard.html` still loads Highmaps and Highcharts modules:

* `assets/vendor/highcharts/highmaps.js`
* `assets/vendor/highcharts/data.js`
* `assets/vendor/highcharts/tw-all.js`
* `assets/vendor/highcharts/exporting.js`
* `assets/vendor/highcharts/export-data.js`
* `assets/vendor/highcharts/accessibility.js`

It also loads `assets/vendor/echarts/echarts.min.js`.

## 7. Does `createThemedChart` still have active callers?

Yes. Active source callers remain in:

* `public/scripts/events/event-charts.js`

Potential legacy/fallback caller remains in:

* `public/scripts/dashboard/dashboard_widgets.js`

## 8. Cleanup readiness

Keep for now:

* `public/dashboard.html` Highcharts script loading
* `public/scripts/services/charting.js` Highcharts helper
* `public/assets/vendor/highcharts/*`
* `package.json` / `package-lock.json` Highcharts dependencies

Candidate for later removal:

* `public/scripts/dashboard/dashboard_widgets.js` Highcharts fallback block, after confirming the ECharts path is permanent and no alternate path reaches the fallback.
* `repomix-packs/**` Highcharts references, if the project has a governed pack regeneration/cleanup policy.

Not safe to remove:

* Event chart Highcharts references before a scoped event charts migration.
* Highcharts vendor/package references before all active callers and script loads are removed.

## 9. Recommended next step

Perform a small read-only event chart dependency forensic before any cleanup. The next safe patch would be either:

* migrate `public/scripts/events/event-charts.js` to `createEChartsThemedChart`, or
* document and intentionally deprecate event chart surfaces if product governance says they are no longer used.

Do not remove anything in this task.
