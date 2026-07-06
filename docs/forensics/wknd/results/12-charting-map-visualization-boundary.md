# 12-charting-map-visualization-boundary

Status: DONE

Task: `12-charting-map-visualization-boundary`

Result path: `docs/forensics/wknd/results/12-charting-map-visualization-boundary.md`

## Executive Conclusion

EVIDENCED: the dashboard HTML currently loads both local Highcharts/Highmaps vendor scripts and local ECharts before the app bundle. Evidence: `public/dashboard.html:13` to `public/dashboard.html:19` loads `assets/vendor/highcharts/highmaps.js`, `data.js`, `tw-all.js`, `exporting.js`, `export-data.js`, `accessibility.js`, and `assets/vendor/echarts/echarts.min.js`; `public/dashboard.html:430` loads `scripts/import-bundle.js?v=1.0.4`.

EVIDENCED: `public/scripts/services/charting.js` is a mixed chart wrapper. It still defines Highcharts theme/render helpers and ECharts theme/render helpers in the same file. Evidence: `public/scripts/services/charting.js:14`, `public/scripts/services/charting.js:192`, `public/scripts/services/charting.js:226`, and `public/scripts/services/charting.js:304`.

EVIDENCED: current ECharts usage includes dashboard business trend, Sales Analysis charts, and Taiwan opportunity map. Evidence: dashboard trend uses `createEChartsThemedChart('trend-chart-container', ...)` at `public/scripts/dashboard/dashboard_widgets.js:435`; dashboard preview uses `public/scripts/dashboard/dashboard_widgets.js:632`; Sales Analysis charts use `public/scripts/sales/sales-analysis-components.js:548` to `public/scripts/sales/sales-analysis-components.js:550`; Sales Analysis preview uses `public/scripts/sales/sales-analysis-components.js:569`; Taiwan map uses `createEChartsThemedChart('taiwan-map-container', ...)` at `public/scripts/map-manager.js:70` and preview uses `public/scripts/map-manager.js:436`.

EVIDENCED: current Highcharts usage still exists for event charts, and dashboard trend retains a Highcharts fallback/compatibility block after the ECharts branch. Evidence: event charts check `Highcharts` and `createThemedChart` at `public/scripts/events/event-charts.js:38` to `public/scripts/events/event-charts.js:50`, then call `createThemedChart()` at `public/scripts/events/event-charts.js:88`, `public/scripts/events/event-charts.js:136`, and `public/scripts/events/event-charts.js:171`; dashboard widgets reference `Highcharts`, `createThemedChart`, and `Highcharts.chart` at `public/scripts/dashboard/dashboard_widgets.js:442` to `public/scripts/dashboard/dashboard_widgets.js:448`.

UNKNOWN: this run did not execute the browser, so live chart rendering, runtime load timing, and map data API responses were not proven. Static source evidence shows load order, wrappers, and callers, but runtime success remains unverified.

## Files Inspected

| File | Classification | Evidence |
| --- | --- | --- |
| `public/dashboard.html` | ACTIVE_CONFIRMED | Loads Highcharts/Highmaps vendor scripts and ECharts at `public/dashboard.html:13` to `public/dashboard.html:19`; contains `#taiwan-map-container` at `public/dashboard.html:297`; contains `#map-preview-canvas` at `public/dashboard.html:310`; loads `scripts/import-bundle.js?v=1.0.4` at `public/dashboard.html:430`. |
| `public/scripts/import-bundle.js` | ACTIVE_CONFIRMED | Loads `scripts/services/charting.js` before page modules at `public/scripts/import-bundle.js:20`; loads `scripts/map-manager.js` at `public/scripts/import-bundle.js:30`; loads Sales Analysis, Event Charts, Dashboard Widgets, and Dashboard manager at `public/scripts/import-bundle.js:36`, `public/scripts/import-bundle.js:47`, `public/scripts/import-bundle.js:60`, and `public/scripts/import-bundle.js:63`. |
| `public/scripts/services/charting.js` | ACTIVE_CONFIRMED | Defines `createThemedChart()` for Highcharts at `public/scripts/services/charting.js:192` and `createEChartsThemedChart()` at `public/scripts/services/charting.js:304`. |
| `public/scripts/dashboard/dashboard_widgets.js` | ACTIVE_CONFIRMED | Dashboard trend chart uses ECharts at `public/scripts/dashboard/dashboard_widgets.js:435`; preview uses ECharts at `public/scripts/dashboard/dashboard_widgets.js:632`; Highcharts fallback/compatibility references remain at `public/scripts/dashboard/dashboard_widgets.js:442` to `public/scripts/dashboard/dashboard_widgets.js:448`. |
| `public/scripts/dashboard/dashboard.js` | ACTIVE_CONFIRMED | Calls `DashboardWidgets.renderTrendWidget()` at `public/scripts/dashboard/dashboard.js:114`; updates the map through `window.mapManager.update()` at `public/scripts/dashboard/dashboard.js:144` to `public/scripts/dashboard/dashboard.js:145`. |
| `public/scripts/map-manager.js` | ACTIVE_CONFIRMED | Uses `/assets/maps/taiwan.json` at `public/scripts/map-manager.js:12`; requires `window.echarts.registerMap` and `createEChartsThemedChart` at `public/scripts/map-manager.js:44` to `public/scripts/map-manager.js:51`; registers the map at `public/scripts/map-manager.js:120`; builds an ECharts `type: 'map'` series at `public/scripts/map-manager.js:238`. |
| `public/scripts/events/event-charts.js` | ACTIVE_CONFIRMED | Event charts depend on Highcharts/createThemedChart at `public/scripts/events/event-charts.js:38` to `public/scripts/events/event-charts.js:50` and render three charts through `createThemedChart()` at `public/scripts/events/event-charts.js:88`, `public/scripts/events/event-charts.js:136`, and `public/scripts/events/event-charts.js:171`. |
| `public/scripts/events/events.js` | ACTIVE_CONFIRMED | Event page keeps `chartData` in state at `public/scripts/events/events.js:13`; uses `#event-log-dashboard-container` at `public/scripts/events/events.js:21`; carries API chart data into state at `public/scripts/events/events.js:42`. |
| `public/scripts/sales/sales-analysis.js` | ACTIVE_CONFIRMED | Sales Analysis calls `SalesAnalysisComponents.renderAllCharts()` at `public/scripts/sales/sales-analysis.js:205`, `public/scripts/sales/sales-analysis.js:304`, and `public/scripts/sales/sales-analysis.js:401`. |
| `public/scripts/sales/sales-analysis-components.js` | ACTIVE_CONFIRMED | Creates chart containers at `public/scripts/sales/sales-analysis-components.js:221` to `public/scripts/sales/sales-analysis-components.js:223`; renders three ECharts charts at `public/scripts/sales/sales-analysis-components.js:548` to `public/scripts/sales/sales-analysis-components.js:550`; renders preview at `public/scripts/sales/sales-analysis-components.js:569`. |
| `public/assets/vendor/highcharts/**` | VENDOR_ASSET | Listed local vendor files: `public/assets/vendor/highcharts/highmaps.js`, `data.js`, `tw-all.js`, `exporting.js`, `export-data.js`, and `accessibility.js`. Internals were not inspected. |
| `public/assets/vendor/echarts/echarts.min.js` | VENDOR_ASSET | Listed as local ECharts vendor asset and loaded by `public/dashboard.html:19`. Internals were not inspected. |
| `public/assets/maps/taiwan.json` | VENDOR_ASSET | Listed as local map asset and referenced by `public/scripts/map-manager.js:12`; file size observed as 9,325,913 bytes. Internals were not deeply inspected. |
| `docs/echarts-migration-record.md` | ACTIVE_DOC | Records accepted ECharts baselines and says the record does not authorize Highcharts cleanup at `docs/echarts-migration-record.md:5`; records Taiwan map baseline at `docs/echarts-migration-record.md:44` to `docs/echarts-migration-record.md:63`; records Highcharts not removed at `docs/echarts-migration-record.md:70` to `docs/echarts-migration-record.md:74`. |
| `docs/highcharts-highmaps-remaining-references-audit.md` | REPORT_DOC | Records remaining Highcharts references and states event charts still depend on Highcharts at `docs/highcharts-highmaps-remaining-references-audit.md:31` to `docs/highcharts-highmaps-remaining-references-audit.md:37` and `docs/highcharts-highmaps-remaining-references-audit.md:67` to `docs/highcharts-highmaps-remaining-references-audit.md:71`. |
| `package.json` / `package-lock.json` | ACTIVE_CONFIRMED | Package metadata still declares `@highcharts/map-collection`, `echarts`, and `highcharts` at `package.json:21`, `package.json:26`, `package.json:29`, `package-lock.json:13`, `package-lock.json:18`, and `package-lock.json:21`. |
| `scripts/setup-highcharts-vendor.js` | COMPATIBILITY_CANDIDATE | Copies Highcharts/Highmaps local vendor assets from `node_modules` to `public/assets/vendor/highcharts` at `scripts/setup-highcharts-vendor.js:16`, `scripts/setup-highcharts-vendor.js:27` to `scripts/setup-highcharts-vendor.js:52`. |

## Evidence Tables

### Charting Library Load Map

| Surface | Library asset(s) | Classification | Evidence | Notes |
| --- | --- | --- | --- | --- |
| Dashboard HTML vendor load | Highmaps, Highcharts modules, Taiwan Highmaps map collection, ECharts | ACTIVE_CONFIRMED | `public/dashboard.html:13` to `public/dashboard.html:19` | Highcharts/Highmaps load before ECharts. |
| App script load chain | Shared `charting.js`, `map-manager.js`, Sales Analysis components, Event Charts, Dashboard Widgets | ACTIVE_CONFIRMED | `public/scripts/import-bundle.js:20`, `public/scripts/import-bundle.js:30`, `public/scripts/import-bundle.js:36`, `public/scripts/import-bundle.js:47`, `public/scripts/import-bundle.js:60` | The shared wrapper loads before chart callers. |
| Local Highcharts assets | `public/assets/vendor/highcharts/*.js` | VENDOR_ASSET | Files listed under `public/assets/vendor/highcharts/`; HTML loads them at `public/dashboard.html:13` to `public/dashboard.html:18` | Vendor files were listed, not internally inspected. |
| Local ECharts asset | `public/assets/vendor/echarts/echarts.min.js` | VENDOR_ASSET | File listed under `public/assets/vendor/echarts/`; HTML loads it at `public/dashboard.html:19` | Minified vendor internals were not inspected. |
| Taiwan GeoJSON asset | `public/assets/maps/taiwan.json` | VENDOR_ASSET | Referenced by `public/scripts/map-manager.js:12`; loaded with `fetch(this.geoJsonUrl)` at `public/scripts/map-manager.js:126` | Asset is local and large; contents were not deeply inspected. |

### Wrapper / Helper Usage Map

| Helper | Library boundary | Caller evidence | Classification | Caution |
| --- | --- | --- | --- | --- |
| `createThemedChart(elementId, specificOptions)` | Highcharts wrapper | Defined at `public/scripts/services/charting.js:192`; calls `Highcharts.chart` at `public/scripts/services/charting.js:215`; used by event charts at `public/scripts/events/event-charts.js:88`, `public/scripts/events/event-charts.js:136`, `public/scripts/events/event-charts.js:171`. | ACTIVE_CONFIRMED | Do not treat Highcharts wrapper as unused while event chart callers exist. |
| `getHighchartsThemeOptions()` | Highcharts theme options | Defined at `public/scripts/services/charting.js:14`; uses `Highcharts.color` at `public/scripts/services/charting.js:112` and `public/scripts/services/charting.js:114`. | ACTIVE_CONFIRMED | Highcharts theme code is tied to the wrapper and event charts. |
| `createEChartsThemedChart(elementId, option, extraOptions)` | ECharts wrapper | Defined at `public/scripts/services/charting.js:304`; checks `window.echarts.init` at `public/scripts/services/charting.js:321`; initializes ECharts at `public/scripts/services/charting.js:346`; used by dashboard widgets, Sales Analysis, and map manager. | ACTIVE_CONFIRMED | Shared resize/dispose behavior is centralized here. |
| `getEChartsThemeOptions()` / `getEChartsSeriesDefaults()` | ECharts theme/default options | Defined at `public/scripts/services/charting.js:226` and `public/scripts/services/charting.js:273`; applied to ECharts series inside `public/scripts/services/charting.js:335` to `public/scripts/services/charting.js:340`. | ACTIVE_CONFIRMED | ECharts options are not all owned inside individual page modules. |

### Highcharts Caller Map

| Caller | Chart surface | Evidence | Classification |
| --- | --- | --- | --- |
| `public/scripts/events/event-charts.js` | Event trend, event type pie, event size bar | Checks Highcharts wrapper availability at `public/scripts/events/event-charts.js:38` to `public/scripts/events/event-charts.js:50`; calls `createThemedChart()` at `public/scripts/events/event-charts.js:88`, `public/scripts/events/event-charts.js:136`, and `public/scripts/events/event-charts.js:171`. | ACTIVE_CONFIRMED |
| `public/scripts/dashboard/dashboard_widgets.js` | Dashboard trend fallback/compatibility block | References `Highcharts`, `createThemedChart`, and `Highcharts.chart` at `public/scripts/dashboard/dashboard_widgets.js:442` to `public/scripts/dashboard/dashboard_widgets.js:448` after the ECharts branch returns at `public/scripts/dashboard/dashboard_widgets.js:435` to `public/scripts/dashboard/dashboard_widgets.js:438`. | COMPATIBILITY_CANDIDATE |
| `public/scripts/services/charting.js` | Shared Highcharts theme/render helper | Defines Highcharts theme and render functions at `public/scripts/services/charting.js:14`, `public/scripts/services/charting.js:192`, and `public/scripts/services/charting.js:215`. | ACTIVE_CONFIRMED |
| `public/dashboard.html` | Runtime vendor script availability | Loads Highcharts/Highmaps files at `public/dashboard.html:13` to `public/dashboard.html:18`. | ACTIVE_CONFIRMED |

### ECharts Caller Map

| Caller | Chart/map surface | Evidence | Classification |
| --- | --- | --- | --- |
| `public/scripts/dashboard/dashboard_widgets.js` | Dashboard business trend chart and preview | Uses `createEChartsThemedChart('trend-chart-container', trendOption)` at `public/scripts/dashboard/dashboard_widgets.js:435`; uses `createEChartsThemedChart('dashboard-trend-preview-container', option)` at `public/scripts/dashboard/dashboard_widgets.js:632`. | ACTIVE_CONFIRMED |
| `public/scripts/sales/sales-analysis-components.js` | Sales Analysis trend/type/source charts and preview | Uses `createEChartsThemedChart()` for `chart-area-trend`, `chart-pie-type`, and `chart-pie-source` at `public/scripts/sales/sales-analysis-components.js:548` to `public/scripts/sales/sales-analysis-components.js:550`; preview uses `public/scripts/sales/sales-analysis-components.js:569`. | ACTIVE_CONFIRMED |
| `public/scripts/map-manager.js` | Taiwan opportunity map and preview | Requires `window.echarts.registerMap` at `public/scripts/map-manager.js:44`; creates map chart at `public/scripts/map-manager.js:70`; registers map at `public/scripts/map-manager.js:120`; preview uses `public/scripts/map-manager.js:436`. | ACTIVE_CONFIRMED |
| `public/scripts/services/charting.js` | Shared ECharts wrapper | Checks `window.echarts.init` at `public/scripts/services/charting.js:321`; initializes chart at `public/scripts/services/charting.js:346`; stores resize handler at `public/scripts/services/charting.js:349` to `public/scripts/services/charting.js:353`. | ACTIVE_CONFIRMED |

### Taiwan Map Asset Usage Map

| Area | Evidence | Classification | Notes |
| --- | --- | --- | --- |
| Static dashboard container | `#taiwan-map-container` appears in the map widget at `public/dashboard.html:297`; preview canvas appears at `public/dashboard.html:310`. | ACTIVE_CONFIRMED | DOM containers exist in the dashboard HTML. |
| Map manager asset path | `this.geoJsonUrl = '/assets/maps/taiwan.json'` at `public/scripts/map-manager.js:12`; `fetch(this.geoJsonUrl)` at `public/scripts/map-manager.js:126`. | ACTIVE_CONFIRMED | Local GeoJSON is the evidenced map asset path. |
| ECharts registration | `window.echarts.registerMap(this.mapName, geoJson)` at `public/scripts/map-manager.js:120`; `this.mapName = 'taiwan'` at `public/scripts/map-manager.js:11`. | ACTIVE_CONFIRMED | The ECharts map name is `taiwan`. |
| Map series configuration | `type: 'map'` at `public/scripts/map-manager.js:238`; `map: this.mapName` at `public/scripts/map-manager.js:239`; visual scale and null color are configured at `public/scripts/map-manager.js:315` to `public/scripts/map-manager.js:331`. | ACTIVE_CONFIRMED | Map rendering is through ECharts map series, not Highmaps mapChart. |
| Dashboard trigger | `window.mapManager.update()` is called at `public/scripts/dashboard/dashboard.js:144` to `public/scripts/dashboard/dashboard.js:145`. | ACTIVE_CONFIRMED | Dashboard manager owns refresh trigger for the map manager. |
| Highmaps Taiwan collection | `assets/vendor/highcharts/tw-all.js` loads at `public/dashboard.html:15`; local `tw-all.js` exists under `public/assets/vendor/highcharts/`. | VENDOR_ASSET | Static load remains even though current map manager path uses local GeoJSON and ECharts. |

### Docs vs Source Consistency Notes

| Claim area | Docs evidence | Source evidence | Classification |
| --- | --- | --- | --- |
| ECharts migration record is documentation, not cleanup authorization | `docs/echarts-migration-record.md:5` says it does not authorize Highcharts cleanup by itself. | Highcharts source callers remain in `public/scripts/events/event-charts.js:38` to `public/scripts/events/event-charts.js:50` and `public/scripts/events/event-charts.js:88`, `public/scripts/events/event-charts.js:136`, `public/scripts/events/event-charts.js:171`. | EVIDENCED |
| Dashboard trend accepted ECharts baseline | `docs/echarts-migration-record.md:28` to `docs/echarts-migration-record.md:40` records dashboard ECharts baseline. | Dashboard trend uses ECharts at `public/scripts/dashboard/dashboard_widgets.js:435`; preview at `public/scripts/dashboard/dashboard_widgets.js:632`. | EVIDENCED |
| Taiwan map accepted ECharts baseline | `docs/echarts-migration-record.md:44` to `docs/echarts-migration-record.md:63` records local Taiwan map baseline. | `map-manager.js` uses `/assets/maps/taiwan.json`, `registerMap`, and `type: 'map'` at `public/scripts/map-manager.js:12`, `public/scripts/map-manager.js:120`, and `public/scripts/map-manager.js:238`. | EVIDENCED |
| Highcharts / Highmaps not removed | `docs/echarts-migration-record.md:70` to `docs/echarts-migration-record.md:74` and `docs/highcharts-highmaps-remaining-references-audit.md:31` to `docs/highcharts-highmaps-remaining-references-audit.md:37` record remaining Highcharts references. | `public/dashboard.html:13` to `public/dashboard.html:18`, `public/scripts/services/charting.js:192`, and `public/scripts/events/event-charts.js:88` / `:136` / `:171` confirm remaining source references. | EVIDENCED |

## LLM Confusion Risks

| Risk | Classification | Evidence | Safer future prompt constraint |
| --- | --- | --- | --- |
| Assuming the project is fully migrated to ECharts because dashboard trend, Sales Analysis, and Taiwan map use ECharts | EVIDENCED | ECharts callers exist at `public/scripts/dashboard/dashboard_widgets.js:435`, `public/scripts/sales/sales-analysis-components.js:548` to `public/scripts/sales/sales-analysis-components.js:550`, and `public/scripts/map-manager.js:70`; Highcharts event chart callers still exist at `public/scripts/events/event-charts.js:88`, `public/scripts/events/event-charts.js:136`, and `public/scripts/events/event-charts.js:171`. | Future chart prompts should ask for the specific surface and inspect active callers before touching shared chart dependencies. |
| Treating `public/assets/vendor/highcharts/**` as removable vendor leftovers | EVIDENCED | Dashboard still loads Highcharts scripts at `public/dashboard.html:13` to `public/dashboard.html:18`; event charts still call the Highcharts wrapper at `public/scripts/events/event-charts.js:88`, `public/scripts/events/event-charts.js:136`, `public/scripts/events/event-charts.js:171`. | Keep vendor asset questions separate from cleanup decisions and caller verification. |
| Treating `charting.js` as an ECharts-only wrapper | EVIDENCED | `charting.js` contains both `createThemedChart()` at `public/scripts/services/charting.js:192` and `createEChartsThemedChart()` at `public/scripts/services/charting.js:304`. | Inspect both wrappers before changing shared chart themes or error handling. |
| Assuming the Taiwan map uses Highmaps because `tw-all.js` is loaded | EVIDENCED | `tw-all.js` loads at `public/dashboard.html:15`, but current map manager uses `/assets/maps/taiwan.json`, `window.echarts.registerMap`, and ECharts `type: 'map'` at `public/scripts/map-manager.js:12`, `public/scripts/map-manager.js:120`, and `public/scripts/map-manager.js:238`. | Trace current map manager calls instead of inferring map ownership from vendor script load alone. |
| Reading migration docs as implementation authorization | EVIDENCED | `docs/echarts-migration-record.md:5` says it does not authorize Highcharts cleanup; `docs/highcharts-highmaps-remaining-references-audit.md:5` says the audit is documentation-only. | Treat docs as evidence context, then verify active source paths before making any future plan. |
| Mistaking package declarations for active chart ownership | EVIDENCED | `package.json:21`, `package.json:26`, and `package.json:29` declare chart packages, while active callers are distributed across `public/scripts/events/event-charts.js`, `public/scripts/dashboard/dashboard_widgets.js`, `public/scripts/sales/sales-analysis-components.js`, and `public/scripts/map-manager.js`. | Use package metadata only as dependency evidence, not as route/chart ownership evidence. |

## No-Touch / Caution Areas

| Area | Classification | Evidence | Caution |
| --- | --- | --- | --- |
| `public/scripts/services/charting.js` | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC | Mixed Highcharts and ECharts wrappers at `public/scripts/services/charting.js:192` and `public/scripts/services/charting.js:304`; active callers in event charts, dashboard widgets, Sales Analysis, and map manager. | Shared chart behavior crosses multiple domains. |
| Highcharts/Highmaps vendor scripts and package metadata | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC | HTML loads Highcharts scripts at `public/dashboard.html:13` to `public/dashboard.html:18`; `package.json:21` and `package.json:29` declare Highcharts dependencies; event chart callers remain. | Vendor presence is tied to active or compatibility source references. |
| Event chart module | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC | `public/scripts/events/event-charts.js:38` to `public/scripts/events/event-charts.js:50` checks Highcharts wrapper availability; chart renders at `public/scripts/events/event-charts.js:88`, `public/scripts/events/event-charts.js:136`, and `public/scripts/events/event-charts.js:171`. | Event chart runtime depends on the Highcharts wrapper. |
| Taiwan map manager and GeoJSON asset | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC | `public/scripts/map-manager.js:12`, `public/scripts/map-manager.js:120`, `public/scripts/map-manager.js:238`, and `public/assets/maps/taiwan.json` evidence local ECharts map ownership. | Map behavior crosses local asset loading, county normalization, API data, ECharts registration, and preview disposal. |
| Dashboard chart widget | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC | ECharts current path at `public/scripts/dashboard/dashboard_widgets.js:435`; Highcharts compatibility references at `public/scripts/dashboard/dashboard_widgets.js:442` to `public/scripts/dashboard/dashboard_widgets.js:448`; preview at `public/scripts/dashboard/dashboard_widgets.js:632`. | Dashboard chart code has both current ECharts path and residual compatibility references. |
| Migration and audit docs | ROADMAP_DOC / REPORT_DOC | `docs/echarts-migration-record.md:5` and `docs/highcharts-highmaps-remaining-references-audit.md:5` frame docs as records/audits, not implementation authorization. | Do not treat docs alone as permission to change dependencies or chart code. |

## Evidence Gaps

| Gap | Classification | Evidence / limit |
| --- | --- | --- |
| Live browser rendering of chart/map surfaces | UNKNOWN | Static callers are evidenced, but this run did not launch the app or inspect rendered charts in a browser. |
| Runtime event page reachability and user visibility | UNKNOWN | `public/scripts/events/events.js:21` has the event dashboard container and `public/scripts/events/event-charts.js` can render charts, but this run did not prove the current navigation path reaches event charts in production use. |
| Full `taiwan.json` feature content correctness | NOT_INSPECTED | `public/assets/maps/taiwan.json` was listed and referenced, but the 9,325,913-byte asset was not deeply inspected under the vendor/generated asset caution rules. |
| Whether any dynamic or archived source references use Highcharts outside targeted paths | UNKNOWN | Targeted `rg` covered active `public/scripts`, `public/dashboard.html`, package metadata, and relevant docs; generated snapshots and archives were not deeply inspected. |
| Runtime success of dashboard map API data | UNKNOWN | `public/scripts/map-manager.js:179` uses `/api/opportunities/by-county`, but this run did not call the API or validate response shape at runtime. |

## Recommended One Next Forensic Question

For task 13: Across completed reports 01 through 12, which repeated LLM traps combine docs-as-authority risk, compatibility paths, generated/vendor assets, shared globals, and mixed current/legacy chart or data paths?
