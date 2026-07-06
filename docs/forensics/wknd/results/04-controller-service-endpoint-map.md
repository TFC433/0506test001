# 04 Controller Service Endpoint Map

Run time: 2026-07-04 02:57 +08:00

## Executive Conclusion

EVIDENCED: The active backend controller layer is mixed-pattern. Most API domains route through controller instances exposed from the runtime service container; contact and LINE leads build controller instances in route factories; event, sales, external, and internal-ops use exported/static handlers that fetch services from `req.app.get('services')` at request time. Evidence: `app.js:37`, `services/service-container.js:305-344`, `routes/contact.routes.js:18-25`, `routes/line-leads.routes.js:20-26`, `controllers/event.controller.js:19`, `controllers/sales.controller.js:5`, `controllers/external.controller.js:14`, `controllers/internal-ops.controller.js:35`.

EVIDENCED: Controller-to-service ownership cannot be inferred from filenames alone. Some route modules share controller files across domains: `routes/calendar.routes.js:4` uses `controllers/event.controller.js`; `routes/company.routes.js:37` uses `externalController.generateCompanyProfile`; `routes/index.js:40` keeps a legacy drive thumbnail route on the API root.

EVIDENCED: I found no controller method calls to `contactWriter`, `opportunityReader`, or `opportunityWriter`; however those dependencies remain constructor fields or route factory arguments, so their compatibility meaning is UNKNOWN rather than removable. Evidence: `controllers/contact.controller.js:46-51`, `routes/contact.routes.js:22-25`, `controllers/opportunity.controller.js:19-27`.

## Files Inspected

| File | Inspection Scope | Classification |
| --- | --- | --- |
| `app.js` | Runtime service container installation and API route mount | ACTIVE_CONFIRMED |
| `services/service-container.js` | Controller instantiation and exported service/controller names only | ACTIVE_CONFIRMED |
| `routes/index.js` | API route module composition and shared/alias controller usage | ACTIVE_CONFIRMED |
| `routes/*.routes.js` | Route method/path to controller handler mapping | ACTIVE_CONFIRMED |
| `controllers/*.controller.js` | Controller exports, constructors, service calls, and direct service-bag lookups | ACTIVE_CONFIRMED |

NOT_INSPECTED: Service method bodies under `services/*.js` were not deeply inspected, per Task 04 limits.

## Evidence Tables

### Runtime Controller Wiring

| Evidence | Finding | Classification |
| --- | --- | --- |
| `app.js:37`; `routes/index.js:47-68` | `app.set('services', services)` runs before `/api` mounts the route index. | ACTIVE_CONFIRMED |
| `services/service-container.js:305-319` | Container constructs `AuthController`, `SystemController`, `AnnouncementController`, `ContactController`, `CompanyController`, `OpportunityController`, `InteractionController`, `ProductController`, and `WeeklyController`. | ACTIVE_CONFIRMED |
| `services/service-container.js:326-344` | The exported service bag includes service instances plus the controller instances listed above. | ACTIVE_CONFIRMED |
| `routes/contact.routes.js:18-25` | Contact routes build a new `ContactController` per request from `contactService`, `workflowService`, and `contactWriter`. | ACTIVE_CONFIRMED |
| `routes/line-leads.routes.js:20-26` | LINE leads routes build a new `LineLeadsController` per request from `contactService`, `authService`, and `systemService`. | ACTIVE_CONFIRMED |
| `controllers/event.controller.js:19`; `controllers/sales.controller.js:5`; `controllers/external.controller.js:14`; `controllers/internal-ops.controller.js:35` | Some exported/static controllers fetch services directly from `req.app.get('services')`. | ACTIVE_CONFIRMED |

### Controller File Inventory

| Controller File | Export Shape | Primary Runtime Access Pattern | Evidence |
| --- | --- | --- | --- |
| `controllers/announcement.controller.js` | Class export | Prebuilt `services.announcementController` | `controllers/announcement.controller.js:11-16`; `services/service-container.js:307,338`; `routes/announcement.routes.js:16-20` |
| `controllers/auth.controller.js` | Class export | Prebuilt `services.authController` | `controllers/auth.controller.js:14-19`; `services/service-container.js:305,336`; `routes/auth.routes.js:16-20` |
| `controllers/company.controller.js` | Class export | Prebuilt `services.companyController` | `controllers/company.controller.js:14-20`; `services/service-container.js:309,340`; `routes/company.routes.js:13-17` |
| `controllers/contact.controller.js` | Class export | Per-request route factory, despite a container instance also existing | `controllers/contact.controller.js:42-51`; `services/service-container.js:308,339`; `routes/contact.routes.js:18-25` |
| `controllers/event.controller.js` | `exports.*` functions | Route imports function module; functions fetch service bag | `controllers/event.controller.js:19,141,158,223,234,322,377,445,455`; `routes/event.routes.js:10-16`; `routes/calendar.routes.js:4,10-13` |
| `controllers/external.controller.js` | `exports.*` functions | Route imports function module; helper fetches service bag with fallback service construction | `controllers/external.controller.js:10,14-16,20,43`; `routes/external.routes.js:13-17`; `routes/index.js:40` |
| `controllers/interaction.controller.js` | Class export | Prebuilt `services.interactionController` | `controllers/interaction.controller.js:159-165`; `services/service-container.js:317,342`; `routes/interaction.routes.js:15-19` |
| `controllers/internal-ops.controller.js` | Static class methods | Route imports class; methods fetch service bag | `controllers/internal-ops.controller.js:11-13,33-36,133-136`; `routes/internal-ops.routes.js:13-30` |
| `controllers/line-leads.controller.js` | Class export | Per-request route factory | `controllers/line-leads.controller.js:18-32`; `routes/line-leads.routes.js:20-26` |
| `controllers/opportunity.controller.js` | Class export | Prebuilt `services.opportunityController` | `controllers/opportunity.controller.js:14-27`; `services/service-container.js:310-316,341`; `routes/opportunity.routes.js:13-17` |
| `controllers/product.controller.js` | Class export | Prebuilt `services.productController` | `controllers/product.controller.js:16-21`; `services/service-container.js:318,343`; `routes/product.routes.js:14,20-35` |
| `controllers/sales.controller.js` | `exports.*` function | Route imports function module; function fetches service bag | `controllers/sales.controller.js:5,8-12`; `routes/sales.routes.js:7` |
| `controllers/system.controller.js` | Class export | Prebuilt `services.systemController`; constructor also supports legacy reader/writer args | `controllers/system.controller.js:20,36-60`; `services/service-container.js:306,337`; `routes/system.routes.js:20-24` |
| `controllers/weekly.controller.js` | Class export | Prebuilt `services.weeklyController` | `controllers/weekly.controller.js:15-20`; `services/service-container.js:319,344`; `routes/weekly.routes.js:14,20-45` |

### Route Handler to Controller Map

| Route Module | Handler Coverage | Controller Evidence | Notes |
| --- | --- | --- | --- |
| `routes/announcement.routes.js` | `GET /`, `POST /`, `PUT /:id`, `DELETE /:id` | `routes/announcement.routes.js:29-49`; `controllers/announcement.controller.js:20-52` | Mutating routes also apply `verifyToken` at route level in `routes/announcement.routes.js:38-48`. |
| `routes/auth.routes.js` | `POST /login`, `POST /logout`, `GET /verify`, `POST /verify-password`, `POST /change-password` | `routes/auth.routes.js:24-44`; `controllers/auth.controller.js:25-128` | Session verify/change handlers rely on `verifyToken` in `routes/auth.routes.js:33-43`. |
| `routes/company.routes.js` | Company CRUD plus profile generation | `routes/company.routes.js:25-56`; `controllers/company.controller.js:27-118`; `controllers/external.controller.js:20-29` | `POST /:companyId/generate-profile` uses external controller, not company controller. |
| `routes/contact.routes.js` | Contact dashboard, RAW search/mutation, CORE list/detail/update, workflow actions | `routes/contact.routes.js:35-114`; `controllers/contact.controller.js:80-291` | Route factory passes `contactWriter`, but inspected controller methods call `contactService` or `workflowService`. |
| `routes/event.routes.js` | Event dashboard and event log CRUD/void | `routes/event.routes.js:10-16`; `controllers/event.controller.js:141-385` | Event log create/update/delete can call `interactionService` side-effect logging. |
| `routes/calendar.routes.js` | Calendar create and current-week read | `routes/calendar.routes.js:4,10-13`; `controllers/event.controller.js:445-458` | Calendar routes share `event.controller.js`. |
| `routes/external.routes.js`; `routes/index.js` | Drive thumbnail and company profile | `routes/external.routes.js:13-17`; `routes/index.js:40`; `controllers/external.controller.js:20-50` | Root `/drive/thumbnail` legacy path and `/external/thumbnail` both use the external controller. |
| `routes/interaction.routes.js` | Interaction search, opportunity/company scoped reads, create/update/delete | `routes/interaction.routes.js:27-62`; `controllers/interaction.controller.js:169-301` | Create/update/delete route definitions add `verifyToken` in `routes/interaction.routes.js:51-61` even though route index also applies global auth later. |
| `routes/internal-ops.routes.js` | Team workload, dev projects, subscription ops | `routes/internal-ops.routes.js:13-30`; `controllers/internal-ops.controller.js:33-197` | Static handlers pull either `internalOpsService` or `subscriptionOpsService`. |
| `routes/line-leads.routes.js` | LINE lead list/update/delete | `routes/line-leads.routes.js:30-36`; `controllers/line-leads.controller.js:36-208` | Controller performs token checks through `authService`. |
| `routes/opportunity.routes.js` | Opportunity dashboard/search/detail/CRUD/batch/contact links | `routes/opportunity.routes.js:21-72`; `controllers/opportunity.controller.js:31-217` | Create/link flows may call `workflowService` before relationship calls. |
| `routes/product.routes.js` | Product list/specs/cache/batch/category order | `routes/product.routes.js:20-35`; `controllers/product.controller.js:38-116` | Uses prebuilt `services.productController`. |
| `routes/sales.routes.js` | Sales analysis read | `routes/sales.routes.js:7`; `controllers/sales.controller.js:8-12` | Route is mounted at both `/sales` and `/sales-analysis` in `routes/index.js:57-60`. |
| `routes/system.routes.js` | Config, cache, status, audit/session/activity, dashboard variants | `routes/system.routes.js:29-94`; `controllers/system.controller.js:65-310` | Some routes add `requireRole('super_admin')` at `routes/system.routes.js:34,53,58`. |
| `routes/weekly.routes.js` | Weekly summary/options/detail/create/update/delete | `routes/weekly.routes.js:20-45`; `controllers/weekly.controller.js:27-109` | Uses prebuilt `services.weeklyController`. |

### Controller Function to Service Method Map

| Controller Function(s) | Service Method(s) Called | Evidence | Classification |
| --- | --- | --- | --- |
| Announcement CRUD | `announcementService.getAnnouncements`, `createAnnouncement`, `updateAnnouncement`, `deleteAnnouncement` | `controllers/announcement.controller.js:20-52` | ACTIVE_CONFIRMED |
| Auth login/logout/password | `authService.login`, `logout`, `verifyPassword`, `changePassword` | `controllers/auth.controller.js:25-128` | ACTIVE_CONFIRMED |
| Company CRUD | `companyService.getCompanyListWithActivity`, `createCompany`, `getCompanyDetails`, `updateCompany`, `deleteCompany` | `controllers/company.controller.js:27-118` | ACTIVE_CONFIRMED |
| Contact RAW/CORE reads and writes | `contactService.searchContacts`, `getDashboardStats`, `searchOfficialContacts`, `getContactOpportunities`, `updateContact`, `syncContactFromSource`, `deleteContact`, `updatePotentialContact`, `deletePotentialContact` | `controllers/contact.controller.js:80-250` | ACTIVE_CONFIRMED |
| Contact workflow actions | `workflowService.upgradeContactToOpportunity`, `linkBusinessCardToContact`, `fileContact` | `controllers/contact.controller.js:140-152,261-291` | ACTIVE_CONFIRMED |
| Event dashboard/log | `dashboardService.getEventsDashboardData`; `eventLogService.createEvent`, `getEventById`, `updateEventLog`, `voidEventLog`, `deleteEventLog`; `interactionService.createInteraction` | `controllers/event.controller.js:141-180,223-277,322-395` | ACTIVE_CONFIRMED |
| Calendar handlers | `eventService.createCalendarEventAndSync`, `getThisWeekEvents` | `controllers/event.controller.js:445-458`; `routes/calendar.routes.js:10-13` | ACTIVE_CONFIRMED |
| External AI/Drive | `externalService.generateCompanyProfile`, `getDriveFileStream`; fallback `new ExternalService(services.googleClientService)` | `controllers/external.controller.js:10,14-16,20-50` | ACTIVE_CONFIRMED / COMPATIBILITY_CANDIDATE |
| Interaction CRUD/search | `interactionService.searchInteractions`, `getInteractionsByOpportunity`, `getInteractionsByCompany`, `createInteraction`, `getInteractionById`, `updateInteraction`, `deleteInteraction` | `controllers/interaction.controller.js:169-301` | ACTIVE_CONFIRMED |
| Internal ops team/dev | `internalOpsService.getTeamWorkloads`, `createTeamWorkload`, `updateTeamWorkload`, `deleteTeamWorkload`, `getDevProjects`, `createDevProject`, `updateDevProject`, `deleteDevProject` | `controllers/internal-ops.controller.js:33-120` | ACTIVE_CONFIRMED |
| Internal ops subscriptions | `subscriptionOpsService.getSubscriptionOps`, `getUpcomingRenewalAlerts`, `getWonOpportunityOptions`, `createSubscriptionOp`, `updateSubscriptionOp`, `archiveSubscriptionOp` | `controllers/internal-ops.controller.js:133-197` | ACTIVE_CONFIRMED |
| LINE leads | `authService.verifyLineIdToken`, `systemService.getSystemConfig`, `contactService.getPotentialContacts`, `getPotentialContactByRow`, `updatePotentialContact`, `deletePotentialContact` | `controllers/line-leads.controller.js:36-208` | ACTIVE_CONFIRMED |
| Opportunity dashboard/search/CRUD/linking | `dashboardService.getOpportunitiesDashboardData`; `opportunityService.getOpportunitiesByCounty`, `getOpportunityYears`, `searchOpportunities`, `getOpportunityDetails`, `batchUpdateOpportunities`, `updateOpportunity`, `deleteOpportunity`, `addContactToOpportunity`, `deleteContactLink`; `workflowService.createOpportunity`, `resolveAndPromoteContact`, `linkBusinessCardToContact`, `createManualContact` | `controllers/opportunity.controller.js:31-217` | ACTIVE_CONFIRMED |
| Product operations | `productService.getAllProducts`, `getOpportunitySpecs`, `refreshCache`, `batchUpdate`, `getCategoryOrder`, `saveCategoryOrder` | `controllers/product.controller.js:38-116` | ACTIVE_CONFIRMED |
| Sales analysis | `salesAnalysisService.getSalesAnalysisData` | `controllers/sales.controller.js:8-12` | ACTIVE_CONFIRMED |
| System config/status/audit/dashboard | `systemService.getSystemConfig`, `updateSystemPref`, `invalidateCache`, `getSystemStatus`; `auditLoggerService.getAuditLogs`, `getUserSessions`; `activityTimelineService.enrichBusinessAnchors`, `getActivityTimeline`; `dashboardService.getDashboardData`, `getRawContactStats`, `getCompanyActivityDetails`, `getContactsDashboardData`, `getEventsDashboardData`, `getCompaniesDashboardData` | `controllers/system.controller.js:65-310` | ACTIVE_CONFIRMED |
| Weekly business | `weeklyBusinessService.getWeeklyBusinessSummaryList`, `getWeekOptions`, `getWeeklyDetails`, `createWeeklyBusinessEntry`, `updateWeeklyBusinessEntry`, `deleteWeeklyBusinessEntry` | `controllers/weekly.controller.js:27-109` | ACTIVE_CONFIRMED |

### Service Access Pattern Table

| Pattern | Files | Evidence | Risk Classification |
| --- | --- | --- | --- |
| Container-built controller instance fetched by route | Announcement, auth, company, opportunity, interaction, product, system, weekly | `services/service-container.js:305-319`; `routes/auth.routes.js:16-20`; `routes/system.routes.js:20-24`; `routes/product.routes.js:14` | POSSIBLY_ACTIVE confusion risk if an LLM edits a controller constructor but ignores container wiring. |
| Per-request controller factory | Contact, LINE leads | `routes/contact.routes.js:18-25`; `routes/line-leads.routes.js:20-26` | COMPATIBILITY_CANDIDATE because route factories may differ from container-built instances. |
| Function/static controller reads service bag | Event, sales, external, internal-ops | `controllers/event.controller.js:19`; `controllers/sales.controller.js:5`; `controllers/external.controller.js:14`; `controllers/internal-ops.controller.js:35,135` | POSSIBLY_ACTIVE confusion risk if future work assumes all controllers use constructor injection. |
| Controller local fallback service construction | External, System compatibility constructor | `controllers/external.controller.js:10,14-16`; `controllers/system.controller.js:20,36-60` | COMPATIBILITY_CANDIDATE; not removable without deeper forensic review. |
| Audit helper service lookup from controller helpers | Company, contact, interaction, opportunity, event, internal-ops | `controllers/company.controller.js:134`; `controllers/contact.controller.js:59`; `controllers/interaction.controller.js:42`; `controllers/opportunity.controller.js:230`; `controllers/event.controller.js:40-112`; `controllers/internal-ops.controller.js:13` | ACTIVE_CONFIRMED cross-cutting behavior; audit links can be missed in endpoint-only scans. |

### Direct Data Access Warnings

| Evidence | Finding | Classification |
| --- | --- | --- |
| `controllers/contact.controller.js:46-51`; `routes/contact.routes.js:22-25` | `contactWriter` is still passed/stored for compatibility, but inspected controller method calls use `contactService` or `workflowService`. | COMPATIBILITY_CANDIDATE / UNKNOWN |
| `controllers/opportunity.controller.js:19-27` | `opportunityReader` and `opportunityWriter` are labeled deprecated in the controller and stored, but inspected methods route through services/workflow/dashboard. | COMPATIBILITY_CANDIDATE / UNKNOWN |
| `controllers/system.controller.js:36-60` | Constructor accepts either a `SystemService` or legacy reader/writer pair and can instantiate `SystemService` internally. | COMPATIBILITY_CANDIDATE |
| `controllers/external.controller.js:10,14-16` | External controller imports `ExternalService` directly and constructs a fallback instance if `services.externalService` is absent. | COMPATIBILITY_CANDIDATE |

UNKNOWN: This pass did not prove whether stored legacy reader/writer fields are used through dynamic access, tests, or older runtime paths outside inspected route modules. It only found no direct method calls in inspected controller files.

## LLM Confusion Risks

| Risk | Evidence | Safer Interpretation |
| --- | --- | --- |
| Assuming every route uses a matching same-name controller | `routes/calendar.routes.js:4,10-13`; `routes/company.routes.js:37`; `routes/index.js:40` | Shared controller usage is active; route-to-controller mapping must be traced. |
| Assuming controller instances always come from `services/service-container.js` | `routes/contact.routes.js:18-25`; `routes/line-leads.routes.js:20-26` | Some routes construct controllers at request time. |
| Assuming all controllers use constructor injection | `controllers/event.controller.js:19`; `controllers/sales.controller.js:5`; `controllers/internal-ops.controller.js:35`; `controllers/external.controller.js:14` | Function/static controllers may use `req.app.get('services')` internally. |
| Missing cross-domain side effects in controller code | `controllers/event.controller.js:180,277,395`; `controllers/system.controller.js:145-147`; `controllers/interaction.controller.js:135` | Event/interactions/system endpoints can touch audit or timeline services beyond their primary domain. |
| Treating legacy/deprecated constructor args as unused cleanup targets | `controllers/contact.controller.js:46-51`; `controllers/opportunity.controller.js:19-27`; `controllers/system.controller.js:36-60` | Legacy and compatibility fields require deeper forensic review before any planning claim. |
| Treating `/sales` and `/sales-analysis` as separate implementations | `routes/index.js:57-60`; `routes/sales.routes.js:7`; `controllers/sales.controller.js:8-12` | Both mounts share the same route module and handler. |

## No-Touch / Caution Areas

| Area | Why Caution Applies | Evidence | Classification |
| --- | --- | --- | --- |
| `services/service-container.js` controller construction | Runtime wiring creates controller instances and exposes them in the service bag. | `services/service-container.js:305-344` | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC |
| Contact route factory | It bypasses the prebuilt container controller and constructs per request. | `routes/contact.routes.js:18-25`; `services/service-container.js:308,339` | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC |
| LINE leads route factory | It constructs controller with three services and performs LINE token-related flows through services. | `routes/line-leads.routes.js:20-36`; `controllers/line-leads.controller.js:57,131,181` | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC |
| External controller fallback | It imports and may construct `ExternalService` directly. | `controllers/external.controller.js:10,14-16` | COMPATIBILITY_CANDIDATE |
| SystemController constructor | It supports service-mode and legacy reader/writer-mode construction. | `controllers/system.controller.js:36-60` | COMPATIBILITY_CANDIDATE |
| Event controller side-effect calls | Event log create/update/delete may create interactions and write audit logs. | `controllers/event.controller.js:112,180,277,395` | DO_NOT_TOUCH_WITHOUT_DEEP_FORENSIC |

## Evidence Gaps

| Gap | Current Status | Evidence Boundary |
| --- | --- | --- |
| Whether stored `contactWriter`, `opportunityReader`, and `opportunityWriter` fields are used indirectly | UNKNOWN | Direct scans found storage at `controllers/contact.controller.js:51` and `controllers/opportunity.controller.js:26-27`, but no direct calls in controller methods. |
| Whether service methods called by controllers have further cross-domain dependencies | UNKNOWN | Task 04 did not deeply inspect service method bodies by rule. |
| Whether external/system fallback construction is exercised in production | UNKNOWN | Static code evidence exists at `controllers/external.controller.js:14-16` and `controllers/system.controller.js:36-60`; runtime path was not executed. |
| Complete auth/role exposure for every endpoint | PARTIAL | Route-level evidence is present, but Task 03 owns deeper auth boundary mapping. |

## Recommended One Next Forensic Question, if applicable

Which runtime services/readers/writers are actually constructed and passed into each controller path, especially where route factories or compatibility constructors differ from `services/service-container.js` exported controller instances?
