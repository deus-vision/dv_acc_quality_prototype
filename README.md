# Account Lab

Responsive, buildless frontend prototype for Deus Vision ad-account quality analytics. Inspired by Medusa's restrained admin interface. Russian UI; USD reporting. No backend, real authentication, AIO requests, or message delivery.

## Screens

- Analytics with a compact anchored issue-date popover, inclusive custom ranges and Moscow-relative presets, a synced “Только Disabled” shortcut, paired KPI cards, mean Spend/Profit/Revenue per account and cost per $1,000 of each; by account type and buyer; buyer × type matrix; filter-driven chart, source values, effective profit/ROI, account drill-down.
- Accounts with sorting/filtering/pagination, totals across the whole filtered cohort, campaign counts with hover/focus/tap lists, details, single/bulk import, searchable country GEO, validation, price snapshots, buyer reassignment, the same date popover and badges for accounts without linked campaigns. Campaign details show AIO campaign ID/name and source Spend, Revenue and Profit without a separate GEO label. Manual matching is removed.
- Team settings: shared types/prices, archive/restore, editable member usernames/emails, invite lifecycle, activation and demo login. Self-service profile editing is available from the sidebar and settings on mobile; users have no separate personal-name field.
- Sync health for Meta and Roll Up; successful vs attempted numeric timestamps, stale/error/paused/running states, rate/concurrency/retry settings and logs. One global refresh updates both sources; no source-specific/log retry buttons or schedule presets. Hover/focus/tap help explains each setting. The stale threshold is independent of schedule and measured since the last successful update.
- Demo role/team switch and 390px mobile presentation via “Сценарии и роли”.

Account column help explains the AIO sources, campaign aggregation, effective Profit/ROI and the signed Spend minus Raw Spend difference. Disabled reasons are available on status hover/focus/tap, in the extended table and on mobile cards. Source times display the numeric offset GMT+3; native dropdowns share an inset muted chevron across filters and forms.

All persistent mock state is browser-local under `dv-account-lab-v1`. The reset control restores seed data. Mock financial reporting remains fixed at 23 October 2026. Issue-date presets and demonstration sync timestamps use the current clock in Europe/Moscow. “Последняя неделя” means the last 7 days including today; “Последний месяц” means the last 30 days including today. “Эта неделя” starts on Monday, and “Этот месяц” starts on the first day; both end today. Today/yesterday and all-time presets are also available.

## Source

- `dist/core.js`: seed data, store, scoped selectors, financial math, modal and shared helpers.
- `dist/app.js`: shell, routing, mock authentication, demo controls and freshness.
- `dist/analytics.js`, `dist/accounts.js`, `dist/settings.js`: feature renderers and interactions.
- `dist/countries.js` and `dist/geo-picker.js`: bundled ISO alpha-2 countries/territories and a searchable Russian/English picker; records store only the code.
- `dist/date-picker.js` and `dist/date-picker.css`: shared non-modal anchored date filter for analytics and accounts, with draft edits, validation, keyboard/outside dismissal and responsive positioning.
- `dist/sync-help.js`: accessible contextual help for sync parameters and timing.
- `dist/account-tooltips.js`: shared popup lifecycle for campaign lists, column help, status reasons and total explanations.
- Feature CSS alongside the shared `dist/app.css`; no third-party runtime or remote asset dependency.

New mean Profit and cost-per-$1,000 Profit metrics use source Profit AIO before account purchase cost. Nonpositive denominators display a dash. Means divide each source total by the number of accounts with that specific value, including confirmed zeros and excluding missing values. Partial metrics show source-specific coverage and the actual denominator in hover, focus and tap tooltips; completely missing source values never become zero. The cohort KPI shows counts and percentages of all filtered accounts for Active, Disabled, no status and any additional statuses such as Unsettled. CSV export is available on Accounts and Analytics and respects all current filters. Built-in demo buyers use the provided AIO usernames; a one-time roster migration preserves existing local accounts, assignments and custom records.

The add form labels IDs as Facebook ad-account IDs and accepts nonduplicate numeric IDs as local mock records without a hidden demo catalog whitelist; AIO existence checks require the future backend. A type price is only a default: the actual per-account price is frozen on save, including common bulk prices and row overrides. Changing a type default never reprices old accounts.

## CSV exports

Both screens have a **Выгрузить CSV** action, disabled for an empty cohort. Accounts exports all filtered accounts in the current sort order, across all pages, regardless of checkbox selection. Analytics exports all metrics for the active grouping (type, buyer, or buyer × type), plus a total row distinguished by the `Строка` column. For additional pivot tables, exclude the `Итого` row to avoid double counting.

Files use UTF-8 with BOM, commas, decimal points, and CRLF line endings. Money and percentages are numeric (USD and % are stated in headers). Missing values are blank; known zero stays zero. Source Profit and Profit after account cost are separate columns. Analytics includes source coverage counts and uses the same `aggregate()` formulas and known-value denominators as the UI. Issue-date filters select accounts, not financial activity dates; financial results remain cumulative through the mock report date, 2026-10-23.

Import CSV into Excel using **Data → From Text/CSV**, select UTF-8 and comma delimiter, and set Facebook ID to **Text** before loading. This preserves long IDs and avoids spreadsheet numeric rounding. Formula-like user-entered names are prefixed with an apostrophe for safe spreadsheet import.

## Validation

Run `node scripts/validate.mjs` and `node scripts/validate-csv.mjs` for module syntax, arithmetic, whole-cohort totals, historical cost invariants, campaign identity migration, render smoke tests, and team scoping. Browser QA covers drill-down, partial bulk import, sync help/error/running states, mobile layout, type prices, invite preview and roles. Real production authorization, credentials, scheduling and API rate limiting remain future backend work.

## Local preview

No package installation or build step is required. Serve the static files over HTTP:

```sh
python3 -m http.server 8080 --directory dist
```

Open `http://localhost:8080/`. The default page is the login screen. Use the **«Войти как администратор демо»** button, or a seeded username such as `vlad_11_595` with any nonempty demo password. Passwords are not stored. The login screen is a UI demonstration, not an access-control boundary; direct hash routes such as `#analytics` remain available.

## GitHub and Netlify

Repository: `https://github.com/deus-vision/dv_acc_quality_prototype`.

Import this repository in Netlify and choose the branch to deploy. `netlify.toml` sets the publish directory to `dist`. Leave the build command empty; no framework preset or environment variables are required. Netlify serves `dist/index.html` at the root URL, which opens the login page. Navigation uses URL hashes, so no SPA redirect rule is needed.

The public deployment contains only mock data. Browser-local edits stay on that browser and origin; they are not shared between visitors or synchronized across deployment domains. Real AIO integration, authentication and server-side authorization are not implemented.
