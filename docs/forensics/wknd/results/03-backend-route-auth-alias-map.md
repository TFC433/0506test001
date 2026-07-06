# 03 Backend Route Auth Alias Map

Run time: 2026-07-04 00:53 +08:00

## Executive Conclusion

EVIDENCED: The Express app mounts all API routes at `/api` from `app.js`, then `routes/index.js` applies three pre-auth route groups before the global API auth gate: `/api/auth`, `/api/line`, and `/api/drive/thumbnail`. Evidence: `app.js:53`, `routes/index.js:34`, `routes/index.js:37`, `routes/index.js:40`, `routes/index.js:45`.

EVIDENCED: Most API route modules are mounted after `router.use(authMiddleware.verifyToken)`, making them protected by the index-level middleware even when the route file itself has no local auth middleware. Evidence: `routes/index.js:45-65`.

EVIDENCED: Compatibility or alias paths exist for contacts, sales analysis, external thumbnail access, dashboard/domain summaries, and route-file-local aliases. These must be treated as compatibility concerns, not removable paths. Evidence: `routes/index.js:50-51`, `routes/index.js:58-60`, `routes/index.js:40`, `routes/external.routes.js:13`, `routes/interaction.routes.js:27-32`, `routes/system.routes.js:68-93`.

UNKNOWN: This task did not inspect controller or service internals deeply, so route behavior, authorization inside controllers, and business-side permission checks remain outside this report.

## Files Inspected

| File | Scope inspected | Evidence |
| --- | --- | --- |
| `app.js` | App-level middleware, health route, API mount, SPA fallback, error handler | `app.js:22-66` |
| `routes/index.js` | API mount order, global auth gate, aliases, 404 | `routes/index.js:34-74` |
| `routes/auth.routes.js` | Auth routes and route-local token checks | `routes/auth.routes.js:24-43` |
| `routes/announcement.routes.js` | Announcement route-local auth | `routes/announcement.routes.js:29-48` |
| `routes/calendar.routes.js` | Calendar routes | `routes/calendar.routes.js:10-13` |
| `routes/company.routes.js` | Company and external profile routes | `routes/company.routes.js:25-55` |
| `routes/contact.routes.js` | Contact and RAW/contact bridge routes | `routes/contact.routes.js:35-112` |
| `routes/event.routes.js` | Event routes and dashboard order note | `routes/event.routes.js:10-16` |
| `routes/external.routes.js` | External thumbnail and company profile routes | `routes/external.routes.js:13-17` |
| `routes/interaction.routes.js` | Interaction read/write routes and `/all` alias | `routes/interaction.routes.js:27-61` |
| `routes/internal-ops.routes.js` | Internal ops route groups | `routes/internal-ops.routes.js:13-30` |
| `routes/line-leads.routes.js` | Line leads routes mounted before global auth | `routes/line-leads.routes.js:30-36` |
| `routes/opportunity.routes.js` | Opportunity routes | `routes/opportunity.routes.js:21-71` |
| `routes/product.routes.js` | Product route-local auth and routes | `routes/product.routes.js:17-35` |
| `routes/sales.routes.js` | Sales analysis route | `routes/sales.routes.js:7` |
| `routes/system.routes.js` | System/dashboard routes and role checks | `routes/system.routes.js:29-93` |
| `routes/weekly.routes.js` | Weekly route-local auth and routes | `routes/weekly.routes.js:17-45` |
| `middleware/auth.middleware.js` | Token behavior and local dev token branch | `middleware/auth.middleware.js:50-86` |
| `middleware/role.middleware.js` | Role normalization and `super_admin` handling | `middleware/role.middleware.js:21-39` |
| `middleware/error.middleware.js` | Global error handler | `middleware/error.middleware.js:17-24` |

## Evidence Tables

### Route Mount Map

| Mount path | Mounted target | Auth boundary | Classification | Evidence |
| --- | --- | --- | --- | --- |
| `/health` | Inline handler in `app.js` | No `verifyToken` in route; checks `authService` availability | POSSIBLY_ACTIVE | `app.js:43-49` |
| `/api` | `routes/index.js` | API router owner | ACTIVE_CONFIRMED | `app.js:53`, `routes/index.js:78` |
| `/api/auth` | `routes/auth.routes.js` | Before global `verifyToken`; route-local auth on selected endpoints | ACTIVE_CONFIRMED | `routes/index.js:34`, `routes/auth.routes.js:33-43` |
| `/api/line` | `routes/line-leads.routes.js` | Before global `verifyToken`; no route-local auth found in route file | POSSIBLY_ACTIVE | `routes/index.js:37`, `routes/line-leads.routes.js:30-36` |
| `/api/drive/thumbnail` | `externalController.getDriveThumbnail` | Before global `verifyToken` | COMPATIBILITY_CANDIDATE | `routes/index.js:40` |
| Global protected section | `router.use(authMiddleware.verifyToken)` | Applies to later mounts in `routes/index.js` | ACTIVE_CONFIRMED | `routes/index.js:45` |
| `/api/` | `systemRoutes` plus index root response | After global `verifyToken` | ACTIVE_CONFIRMED | `routes/index.js:47`, `routes/index.js:70-72` |
| `/api/external` | `routes/external.routes.js` | After global `verifyToken` | ACTIVE_CONFIRMED | `routes/index.js:48` |
| `/api/announcements` | `routes/announcement.routes.js` | After global `verifyToken`; write routes also use local `verifyToken` | ACTIVE_CONFIRMED | `routes/index.js:49`, `routes/announcement.routes.js:38-48` |
| `/api/contacts` | `routes/contact.routes.js` | After global `verifyToken` | ACTIVE_CONFIRMED | `routes/index.js:50` |
| `/api/contact-list` | `routes/contact.routes.js` | Alias mount after global `verifyToken` | COMPATIBILITY_CANDIDATE | `routes/index.js:51` |
| `/api/companies` | `routes/company.routes.js` | After global `verifyToken` | ACTIVE_CONFIRMED | `routes/index.js:52` |
| `/api/opportunities` | `routes/opportunity.routes.js` | After global `verifyToken` | ACTIVE_CONFIRMED | `routes/index.js:53` |
| `/api/products` | `routes/product.routes.js` | After global `verifyToken`; route file also uses `router.use(authMiddleware.verifyToken)` | ACTIVE_CONFIRMED | `routes/index.js:54`, `routes/product.routes.js:17` |
| `/api/business/weekly` | `routes/weekly.routes.js` | After global `verifyToken`; route file also uses `router.use(verifyToken)` | ACTIVE_CONFIRMED | `routes/index.js:55`, `routes/weekly.routes.js:17` |
| `/api/sales` | `routes/sales.routes.js` | After global `verifyToken` | ACTIVE_CONFIRMED | `routes/index.js:58`, `routes/sales.routes.js:7` |
| `/api/sales-analysis` | `routes/sales.routes.js` | Alias mount after global `verifyToken` | COMPATIBILITY_CANDIDATE | `routes/index.js:60`, `routes/sales.routes.js:7` |
| `/api/interactions` | `routes/interaction.routes.js` | After global `verifyToken`; write routes also use local `verifyToken` | ACTIVE_CONFIRMED | `routes/index.js:62`, `routes/interaction.routes.js:51-61` |
| `/api/events` | `routes/event.routes.js` | After global `verifyToken` | ACTIVE_CONFIRMED | `routes/index.js:63` |
| `/api/calendar` | `routes/calendar.routes.js` | After global `verifyToken` | ACTIVE_CONFIRMED | `routes/index.js:64` |
| `/api/internal-ops` | `routes/internal-ops.routes.js` | After global `verifyToken` | ACTIVE_CONFIRMED | `routes/index.js:65` |
| API catch-all | `router.use('*')` | After global `verifyToken` | ACTIVE_CONFIRMED | `routes/index.js:74` |
| `/` and `*` | Static login and SPA fallback | Outside API route auth | ACTIVE_CONFIRMED | `app.js:58-62` |

### Route File Map

| Route file | Controller access pattern | Auth/role pattern | Evidence |
| --- | --- | --- | --- |
| `routes/auth.routes.js` | Service locator `req.app.get('services').authController` | Selected `verifyToken` endpoints only | `routes/auth.routes.js:16-21`, `routes/auth.routes.js:33-43` |
| `routes/announcement.routes.js` | Service locator `announcementController` | Write routes use local `verifyToken`; mount is also after global auth | `routes/announcement.routes.js:16-21`, `routes/announcement.routes.js:38-48`, `routes/index.js:49` |
| `routes/calendar.routes.js` | Direct import of `event.controller` | Inherits global auth from mount | `routes/calendar.routes.js:3`, `routes/index.js:64` |
| `routes/company.routes.js` | Service locator plus direct `external.controller` import | Inherits global auth from mount | `routes/company.routes.js:13-18`, `routes/company.routes.js:22`, `routes/index.js:52` |
| `routes/contact.routes.js` | Constructs `ContactController` using services | Inherits global auth from mount | `routes/contact.routes.js:18-29`, `routes/index.js:50-51` |
| `routes/event.routes.js` | Direct import of `event.controller` | Inherits global auth from mount | `routes/event.routes.js:3`, `routes/index.js:63` |
| `routes/external.routes.js` | Direct import of `external.controller` | Inherits global auth from `/api/external`; legacy `/api/drive/thumbnail` bypasses global auth | `routes/external.routes.js:8`, `routes/index.js:40`, `routes/index.js:48` |
| `routes/interaction.routes.js` | Service locator `interactionController` | Write routes use local `verifyToken`; mount is also after global auth | `routes/interaction.routes.js:15-20`, `routes/interaction.routes.js:51-61`, `routes/index.js:62` |
| `routes/internal-ops.routes.js` | Direct import of `internal-ops.controller` | Inherits global auth from mount | `routes/internal-ops.routes.js:8`, `routes/index.js:65` |
| `routes/line-leads.routes.js` | Constructs `LineLeadsController` using services | Mounted before global auth; no local `verifyToken` found | `routes/line-leads.routes.js:15-25`, `routes/index.js:37` |
| `routes/opportunity.routes.js` | Service locator `opportunityController` | Inherits global auth from mount | `routes/opportunity.routes.js:13-18`, `routes/index.js:53` |
| `routes/product.routes.js` | Service locator `productController` | Local `router.use(authMiddleware.verifyToken)` plus protected mount | `routes/product.routes.js:14`, `routes/product.routes.js:17`, `routes/index.js:54` |
| `routes/sales.routes.js` | Direct import of `sales.controller` | Inherits global auth from mount | `routes/sales.routes.js:3`, `routes/index.js:58-60` |
| `routes/system.routes.js` | Service locator `systemController` | Inherits global auth; selected routes use `requireRole('super_admin')` | `routes/system.routes.js:16-24`, `routes/system.routes.js:34`, `routes/system.routes.js:53-58`, `routes/index.js:47` |
| `routes/weekly.routes.js` | Service locator `weeklyController` | Local `router.use(verifyToken)` plus protected mount | `routes/weekly.routes.js:14-17`, `routes/index.js:55` |

### HTTP Method / Path Table

| Effective base | Methods and paths | Classification and auth note | Evidence |
| --- | --- | --- | --- |
| `/health` | `GET /health` | UNKNOWN; no route-local `verifyToken` evidenced | `app.js:43` |
| `/api/auth` | `POST /login`, `POST /logout`, `GET /verify`, `POST /verify-password`, `POST /change-password` | ACTIVE_CONFIRMED; selected route-local token checks only | `routes/auth.routes.js:24-43`, `routes/index.js:34` |
| `/api/line` | `GET /leads`, `PUT /leads/:rowIndex`, `DELETE /leads/:rowIndex` | UNKNOWN; mounted before global auth and no route-local `verifyToken` evidenced | `routes/line-leads.routes.js:30-36`, `routes/index.js:37` |
| `/api/drive` | `GET /thumbnail` | UNKNOWN; legacy path mounted before global auth | `routes/index.js:40` |
| `/api` | `GET /`, `GET /config`, `PUT /config/pref`, `POST /cache/invalidate`, `GET /system/status`, `GET /audit-logs`, `GET /user-sessions`, `GET /activity-timeline`, dashboard/domain summary routes | ACTIVE_CONFIRMED; protected by global auth, selected super-admin role checks | `routes/index.js:45`, `routes/system.routes.js:29-93` |
| `/api/external` | `GET /thumbnail`, `POST /companies/:companyName/profile` | ACTIVE_CONFIRMED; protected by global auth | `routes/index.js:48`, `routes/external.routes.js:13-17` |
| `/api/announcements` | `GET /`, `POST /`, `PUT /:id`, `DELETE /:id` | ACTIVE_CONFIRMED; protected by global auth, write routes duplicate local token check | `routes/index.js:49`, `routes/announcement.routes.js:29-48` |
| `/api/contacts` and `/api/contact-list` | `GET /dashboard`, `GET /`, `GET /list`, `GET /:contactId/opportunities`, `POST /:contactId/sync-from-source`, `POST /:rowIndex/upgrade`, `PUT /:contactId`, `DELETE /:contactId`, `PUT /:rowIndex/raw`, `DELETE /:rowIndex/raw`, `POST /:contactId/link-card`, `POST /:rowIndex/file` | ACTIVE_CONFIRMED; protected by global auth | `routes/index.js:50-51`, `routes/contact.routes.js:35-112` |
| `/api/companies` | `GET /`, `POST /`, `POST /:companyId/generate-profile`, `GET /:companyId/details`, `PUT /:companyId`, `DELETE /:companyId` | ACTIVE_CONFIRMED; protected by global auth | `routes/index.js:52`, `routes/company.routes.js:25-55` |
| `/api/opportunities` | `GET /dashboard`, `GET /by-county`, `GET /metadata/years`, `GET /`, `GET /:opportunityId/details`, `POST /`, `PUT /batch`, `PUT /:opportunityId`, `DELETE /:opportunityId`, `POST /:opportunityId/contacts`, `DELETE /:opportunityId/contacts/:contactId` | ACTIVE_CONFIRMED; protected by global auth | `routes/index.js:53`, `routes/opportunity.routes.js:21-71` |
| `/api/products` | `GET /`, `GET /opportunity-specs`, `POST /refresh`, `POST /batch`, `GET /category-order`, `POST /category-order` | ACTIVE_CONFIRMED; protected by global auth and duplicate local token gate | `routes/index.js:54`, `routes/product.routes.js:17-35` |
| `/api/business/weekly` | `GET /summary`, `GET /week-options`, `GET /details/:weekId`, `POST /`, `PUT /:recordId`, `DELETE /:recordId` | ACTIVE_CONFIRMED; protected by global auth and duplicate local token gate | `routes/index.js:55`, `routes/weekly.routes.js:17-45` |
| `/api/sales` and `/api/sales-analysis` | `GET /` | COMPATIBILITY_CANDIDATE; protected by global auth with alias mount | `routes/index.js:58-60`, `routes/sales.routes.js:7` |
| `/api/interactions` | `GET /`, `GET /all`, `GET /opportunity/:id`, `GET /company/:id`, `POST /`, `PUT /:id`, `DELETE /:id` | ACTIVE_CONFIRMED; protected by global auth, write routes duplicate local token check | `routes/index.js:62`, `routes/interaction.routes.js:27-61` |
| `/api/events` | `GET /dashboard`, `POST /`, `POST /:eventId/void`, `GET /:eventId`, `PUT /:eventId`, `DELETE /:eventId` | ACTIVE_CONFIRMED; protected by global auth | `routes/index.js:63`, `routes/event.routes.js:10-16` |
| `/api/calendar` | `POST /events`, `GET /week` | ACTIVE_CONFIRMED; protected by global auth | `routes/index.js:64`, `routes/calendar.routes.js:10-13` |
| `/api/internal-ops` | `GET/POST /team-workload`, `PUT/DELETE /team-workload/:workId`, `GET/POST /dev-projects`, `PUT/DELETE /dev-projects/:devId`, `GET/POST /subscription-ops`, `GET /subscription-ops/alerts`, `GET /subscription-ops/won-opportunity-options`, `PUT /subscription-ops/:subId`, `PATCH /subscription-ops/:subId/archive` | ACTIVE_CONFIRMED; protected by global auth | `routes/index.js:65`, `routes/internal-ops.routes.js:13-30` |

### Middleware / Auth Boundary Table

| Boundary | Behavior evidenced | Classification | Evidence |
| --- | --- | --- | --- |
| App body/CORS/static middleware | JSON/urlencoded/CORS/static registered before server start routes | ACTIVE_CONFIRMED | `app.js:22-27` |
| API global auth gate | `router.use(authMiddleware.verifyToken)` appears after `/auth`, `/line`, and legacy drive thumbnail, before other mounts | ACTIVE_CONFIRMED | `routes/index.js:34-45` |
| JWT token validation | `verifyToken` reads `Authorization` bearer token, returns 403 when missing, 401 when invalid | ACTIVE_CONFIRMED | `middleware/auth.middleware.js:50-84` |
| Local dev token branch | Token literal `TEST_LOCAL_TOKEN` creates `req.user` with admin role and continues | COMPATIBILITY_CANDIDATE | `middleware/auth.middleware.js:65-80` |
| Session last-seen touch | Auth middleware optionally touches `auditLoggerService.touchUserSession` | POSSIBLY_ACTIVE | `middleware/auth.middleware.js:17-43` |
| Role checks | `requireRole` requires `req.user`, normalizes roles, treats `super_admin` as also `admin` | ACTIVE_CONFIRMED | `middleware/role.middleware.js:21-39` |
| Super-admin routes | `PUT /api/config/pref`, `GET /api/audit-logs`, `GET /api/user-sessions` use `requireRole('super_admin')` | ACTIVE_CONFIRMED | `routes/system.routes.js:34`, `routes/system.routes.js:53`, `routes/system.routes.js:58` |
| Route-local duplicate auth | Product and weekly add route-level `router.use(verifyToken)` even though mounted after global auth | COMPATIBILITY_CANDIDATE | `routes/product.routes.js:17`, `routes/weekly.routes.js:17`, `routes/index.js:54-55` |
| Write-route duplicate auth | Announcement and interaction write routes include route-local `verifyToken` after global protected mounts | COMPATIBILITY_CANDIDATE | `routes/announcement.routes.js:38-48`, `routes/interaction.routes.js:51-61`, `routes/index.js:49`, `routes/index.js:62` |
| Global error handler | `globalErrorHandler` is registered after API and SPA routes | ACTIVE_CONFIRMED | `app.js:66`, `middleware/error.middleware.js:17-24` |

### Compatibility Alias Table

| Alias or compatibility path | Same target / concern | Classification | Evidence |
| --- | --- | --- | --- |
| `/api/contact-list` | Mounts `contactRoutes`, same route file as `/api/contacts` | COMPATIBILITY_CANDIDATE | `routes/index.js:50-51` |
| `/api/sales-analysis` | Mounts `salesRoutes`, same route file as `/api/sales` | COMPATIBILITY_CANDIDATE | `routes/index.js:58-60` |
| `/api/drive/thumbnail` | Legacy direct thumbnail route before global auth; `/api/external/thumbnail` also exists after global auth | COMPATIBILITY_CANDIDATE | `routes/index.js:40`, `routes/external.routes.js:13` |
| `/api/interactions/all` | Calls same controller method as `GET /api/interactions/` | COMPATIBILITY_CANDIDATE | `routes/interaction.routes.js:27-32` |
| `/api/dashboard`, `/api/contacts/dashboard`, `/api/events/dashboard`, `/api/companies/dashboard` | Dashboard/domain summary routes live in `system.routes.js` while some domain route files also have dashboard routes | COMPATIBILITY_CANDIDATE | `routes/system.routes.js:68-93`, `routes/contact.routes.js:35`, `routes/event.routes.js:10`, `routes/opportunity.routes.js:21` |
| `/api/companies/:companyId/generate-profile` and `/api/external/companies/:companyName/profile` | Both call `externalController.generateCompanyProfile` with different parameter names | COMPATIBILITY_CANDIDATE | `routes/company.routes.js:37`, `routes/external.routes.js:17` |

### Public / Protected / Unknown Route Classification

| Route area | Classification | Public/protected evidence note | Evidence |
| --- | --- | --- | --- |
| `/api/auth/login` | UNKNOWN | Mounted before global auth and has no route-local `verifyToken`; login public/custom behavior requires controller-level confirmation | `routes/index.js:34`, `routes/auth.routes.js:24` |
| `/api/auth/logout` | UNKNOWN | Mounted before global auth and has no route-local `verifyToken`; controller internals not inspected | `routes/index.js:34`, `routes/auth.routes.js:29` |
| `/api/auth/verify`, `/api/auth/verify-password`, `/api/auth/change-password` | ACTIVE_CONFIRMED | Protected by route-local token middleware | `routes/auth.routes.js:33-43` |
| `/api/line/*` | UNKNOWN | Mounted before global auth; route file inspected did not show `verifyToken`; controller internals not inspected | `routes/index.js:37`, `routes/line-leads.routes.js:30-36` |
| `/api/drive/thumbnail` | UNKNOWN | Mounted before global auth; direct controller handler | `routes/index.js:40` |
| Routes mounted after `routes/index.js:45` | ACTIVE_CONFIRMED | Protected by `router.use(authMiddleware.verifyToken)` before their mounts | `routes/index.js:45-65` |
| Selected system routes | ACTIVE_CONFIRMED | Protected by token plus `requireRole('super_admin')` | `routes/system.routes.js:34`, `routes/system.routes.js:53`, `routes/system.routes.js:58` |
| App static, `/`, and SPA fallback | NOT_INSPECTED for API auth | Outside API router; included only as app-level route context | `app.js:27`, `app.js:58-62` |

## LLM Confusion Risks

| Risk | Why it can confuse future work | Evidence |
| --- | --- | --- |
| Route comments may say public inside files mounted after global auth | `announcement.routes.js` labels read routes as public, but `/api/announcements` is mounted after `router.use(authMiddleware.verifyToken)` | `routes/announcement.routes.js:23-29`, `routes/index.js:45-49` |
| Duplicate auth gates can be mistaken for the only auth gate | Product, weekly, announcement write routes, and interaction write routes use local `verifyToken`, but most protection comes from `routes/index.js` ordering | `routes/index.js:45-65`, `routes/product.routes.js:17`, `routes/weekly.routes.js:17`, `routes/announcement.routes.js:38-48`, `routes/interaction.routes.js:51-61` |
| Aliases share route files | `/api/contact-list` and `/api/contacts`; `/api/sales-analysis` and `/api/sales` mount the same route modules | `routes/index.js:50-60` |
| Dashboard routes are split across system and domain files | `system.routes.js` owns several dashboard/domain summary paths, while `contact.routes.js`, `event.routes.js`, and `opportunity.routes.js` also define dashboard routes | `routes/system.routes.js:68-93`, `routes/contact.routes.js:35`, `routes/event.routes.js:10`, `routes/opportunity.routes.js:21` |
| External controller is reachable through multiple route files | `external.controller` is used from `routes/index.js`, `routes/external.routes.js`, and `routes/company.routes.js` | `routes/index.js:40`, `routes/external.routes.js:8-17`, `routes/company.routes.js:22-37` |
| Route order matters for parameter capture | `event.routes.js` explicitly places `/dashboard` before `/:eventId`; contact/opportunity routes also place named routes before parameter routes | `routes/event.routes.js:9-14`, `routes/contact.routes.js:35-56`, `routes/opportunity.routes.js:21-41` |
| Local dev token is a compatibility/auth exception | `TEST_LOCAL_TOKEN` bypasses JWT verification and creates an admin-like `req.user`; future prompts must not casually remove or reinterpret it | `middleware/auth.middleware.js:65-80` |

## No-Touch / Caution Areas

| Area | Caution classification | Evidence |
| --- | --- | --- |
| `routes/index.js` mount order | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC | Auth boundary depends on ordering before and after `router.use(authMiddleware.verifyToken)` at `routes/index.js:34-65` |
| `/api/line/*` route group | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC | It is intentionally mounted before global auth per route index ordering; route-local auth was not evidenced in `routes/line-leads.routes.js:30-36` |
| `/api/drive/thumbnail` and `/api/external/thumbnail` | COMPATIBILITY_CANDIDATE | Two thumbnail access paths exist with different auth boundaries | `routes/index.js:40`, `routes/external.routes.js:13` |
| Contact and sales aliases | COMPATIBILITY_CANDIDATE | Same route files mounted under alternate base paths | `routes/index.js:50-60` |
| Duplicate local auth middleware | COMPATIBILITY_CANDIDATE | Local token gates coexist with global route-index gate | `routes/product.routes.js:17`, `routes/weekly.routes.js:17`, `routes/announcement.routes.js:38-48`, `routes/interaction.routes.js:51-61` |
| `TEST_LOCAL_TOKEN` branch | COMPATIBILITY_CANDIDATE | Auth middleware contains explicit local development behavior | `middleware/auth.middleware.js:65-80` |
| Super-admin role gates | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC | Role expansion and selected system endpoints depend on `requireRole` | `middleware/role.middleware.js:21-39`, `routes/system.routes.js:34`, `routes/system.routes.js:53-58` |

## Evidence Gaps

| Gap | Status | Why it remains unknown |
| --- | --- | --- |
| Controller-internal auth checks | UNKNOWN | Task scope excluded deep controller inspection; route handlers may perform additional checks not visible in route files |
| Whether `/api/line/*` has custom auth semantics | UNKNOWN | Route file constructs `LineLeadsController` with `authService`, but controller body was not inspected in this task | `routes/line-leads.routes.js:15-25` |
| Whether `/api/auth/logout` requires token in controller | UNKNOWN | Route file has no local `verifyToken`, but controller internals were not inspected | `routes/auth.routes.js:29` |
| Frontend callers for alias paths | UNKNOWN | This task did not inspect frontend API calls |
| Runtime config for CORS/static exposure | UNKNOWN | `app.js` shows middleware registration, but environment-specific behavior was not inspected | `app.js:22-27` |

## Recommended One Next Forensic Question

Which controller/service paths use `req.user` or role data beyond route-level middleware, especially for `/api/line/*`, `/api/auth/logout`, external profile generation, and dashboard/system routes?
