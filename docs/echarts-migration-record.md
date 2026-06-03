# ECharts Migration Record

## 1. Purpose

This record captures the accepted ECharts migration baselines for Sales Analysis, Dashboard trend work, and the Taiwan opportunity map. It does not authorize Highcharts cleanup by itself.

## 2. Sales Analysis accepted ECharts baseline

Current accepted Sales Analysis baseline:

* monthly trend line area chart
* x-axis all month labels shown with `interval: 0`
* x-axis labels rotated 45 degrees
* axis hover tooltip with axis pointer
* preview modal support for each chart
* `成交類型` type chart as a standard professional donut
* no rounded slice corners on the `成交類型` donut
* no thick transparent border gaps on the `成交類型` donut
* subtle slice separation is accepted through `padAngle: 1`
* do not document the `成交類型` donut as fully gapless
* source chart as percentage horizontal bar

Source evidence:

* `public/scripts/sales/sales-analysis.js`
* `public/scripts/sales/sales-analysis-components.js`

## 3. Dashboard accepted ECharts baseline

Current accepted Dashboard baseline:

* Business Trend mixed chart
* revenue bar plus count lines
* hidden Y-axis numeric labels and unit names
* inline filter tabs
* preview modal
* historical x-axis labels forced visible for all-history mode

Source evidence:

* `public/scripts/dashboard/dashboard_widgets.js`
* `public/scripts/services/charting.js`

## 4. Taiwan map accepted ECharts baseline

Current accepted Taiwan map baseline:

* local `public/assets/maps/taiwan.json`
* county name normalization from `台` to `臺`
* county alias normalization from `桃園縣` to `桃園市`
* offshore exclusion for `澎湖縣`, `金門縣`, and `連江縣`
* gray no-data counties through `outOfRange` / null map color
* purple heat scale
* compact filter tabs
* preview modal
* on-map Top 5 labels
* no bottom Top 5 summary

Source evidence:

* `public/scripts/map-manager.js`
* `public/dashboard.html`

## 5. Vendor / dependency notes

ECharts local vendor asset exists:

* `public/assets/vendor/echarts/echarts.min.js`

Highcharts / Highmaps have not been removed:

* `public/assets/vendor/highcharts/*`
* `public/dashboard.html` still loads Highcharts / Highmaps scripts
* `package.json` and `package-lock.json` still declare Highcharts packages

## 6. Cleanup caution

Do not remove Highcharts / Highmaps until a cleanup audit confirms all active callers and script loads are safe to remove.

Current audit reference:

* `docs/highcharts-highmaps-remaining-references-audit.md`

## 7. Future chart rules

Future chart work must follow these rules:

* no CDN
* prefer local Apache ECharts for new chart work
* no rainbow scale unless business semantics justify it
* gray no-data states for empty map/chart regions
* preview modal pattern is allowed where already accepted
* no browser smoke test by default
* user visual validation is required for final PASS / NG
* do not revert Sales Analysis charts to Highcharts
