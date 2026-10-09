# ERP mapping: how an ERP customer's orders and payments map to Panameer

Spec for O-E006 (2026-10-09). The build is X-E001..X-E008. Oracle Cloud is the first ERP; every other ERP gets its own adapter behind `lib/erp/adapter.ts`.

**Principle (Scott, 2026-10-09):** an ERP customer comes into Panameer only to punch out. Every other customer step on an ERP order happens in the ERP: approve, change, hold, freeze, close. Panameer sends ERP customers no worklist items and no "act in Panameer" emails.

Statuses are stored as they are today. Screens show Oracle labels from `src/lib/oracle-status.ts`.

---

## Flow 1: Fulfillment (punch-in to an Open work order)

| # | Step | cXML / API | Panameer record |
|---|---|---|---|
| 1 | The requester punches in from the ERP requisition | **PunchOutSetupRequest** → `POST /api/cxml/punchout` | Requester resolved by the `UserId` extrinsic → `RequesterProfile.employee_id` (email as fallback). A punchout session opens, scoped to the punchout pages only. |
| 2 | Finds a provider and attaches them to a work request (no interviewing or testing in this flow) | n/a | `WorkRequest` + `WorkRequestLine` rows (transaction type, UOM, quantity, rate or amount, UNSPSC, `provider_service_id`) |
| 3 | Returns the cart | **PunchOutOrderMessage**, auto-posted to the BrowserFormPost URL | One `ItemIn` per line. Work request → **Awarded** ("Returned to ERP, waiting for the PO") |
| 4 | Requisition approved in the ERP; the PO is created automatically | n/a | n/a |
| 5 | The PO arrives | **OrderRequest** (`type="new"`) → `POST /api/cxml/order` | One PO can fan out to several work orders, one per provider (`external_ref` = orderID, not unique), matched by `SupplierPartAuxiliaryID` = work request line id. **Customer acceptance is set on arrival**: the ERP approval is the acceptance, so the customer has no second step. Work request → **Ordered**. |
| 6 | Work order **Pending Acknowledgment** | n/a | Provider gets bell + worklist + email |
| 7 | Provider accepts or rejects | **ConfirmationRequest** (`type="accept"` / `"reject"`) to the connection's cXML URL | Accept → order **Open**. Fulfillment ends here. |

### Changes and cancellations from the ERP
- **OrderRequest `type="update"`** → a change order (O-E003 `WorkOrderRevision`) with the customer side already accepted. The order shows **Pending Change Acknowledgment** until the provider answers; that answer goes back as a ConfirmationRequest.
- **OrderRequest `type="delete"`** → work order **Canceled**.
- **Hold / Freeze / Close / Finally Close** are done in the ERP. On ERP orders Panameer hides those buttons and the change-order editor, and mirrors what the ERP sends.

### cXML item mapping (PunchOutOrderMessage `ItemIn`)

| cXML | Panameer |
|---|---|
| `ItemID/SupplierPartID` | Provider service ref (`ProviderService.id`) or service product ref |
| `ItemID/SupplierPartAuxiliaryID` | `WorkRequestLine.id` (the key the PO comes back on) |
| `UnitPrice/Money` | Rate. An amount line is sent as quantity 1 × amount. |
| `UnitOfMeasure` | cXML / UN-ECE code: HUR (hour), DAY, WEE (week), MON (month), EA (each) |
| `Classification domain="UNSPSC"` | `WorkRequestLine.unspsc_code` |
| `Description` | Line description plus the provider's name |

---

## Flow 2: Settlement (a payment request becomes an ERP receipt)

**Payment is receipt + ERS (Evaluated Receipt Settlement) for every ERP order** (Scott, 2026-10-09: touchless, best practice).

| # | Step | Panameer | ERP (Oracle Cloud) |
|---|---|---|---|
| 1 | The provider works and submits a payment request: a timesheet (receipt by quantity), a draw-down (receipt by amount) or a product trigger (receipt) | `SettlementRequest` SUBMITTED, `due_date` = submitted + terms (terms start on submission) | n/a |
| 2 | Sent to the ERP as a receipt for the **requester** to review | Shows **Sent to ERP · Pending Requester Approval**. Panameer's Approve and Reject are hidden. | **Work Confirmation** via REST: `POST /fscmRestApi/resources/11.13.18.05/workConfirmations`, then `…/action/submit`, against the PO schedule |
| 3 | Requester approves in the ERP | Status poll mirrors it → **Approved** (or **Rejected**) | Approval creates the receipt automatically |
| 4 | ERS creates the invoice | Panameer sends **no invoice** | A Pay on Receipt supplier site creates the invoice automatically, so payables does nothing |
| 5 | The customer pays Panameer | Remittance → existing `Payment` allocation → **Paid** | n/a |
| 6 | Panameer pays the provider | Existing `ProviderPayout` | n/a |

Work confirmations work only on **complex-work POs**: a document style with work confirmation enabled and progress payment schedules. That fits draw-downs and fixed price. Hourly timesheets are pending Scott's test.

---

## Customer one-time Oracle setup (onboarding checklist)

1. A **Panameer Services line type**, linked only to the **complex-work document style** (work confirmation on), so every Panameer PO is complex automatically.
2. Punchout lines land with that line type. How Oracle sets it is still open: category mapping, or the punchout catalog default.
3. The Panameer **supplier site** set to **Pay on Receipt** (ERS).
4. A **Panameer supplier user** with work-confirmation privileges (used by the REST adapter).
5. A punchout catalog pointing at `/api/cxml/punchout`, with the shared secret Panameer issues (Panameer stores it hashed).
6. The PO transmission (cXML OrderRequest) pointing at `/api/cxml/order`.

## Adapter shape (per ERP)

`lib/erp/adapter.ts` defines a `SettlementAdapter` with `sendReceipt(paymentRequest)` and `pollStatus(message)`. Oracle Cloud is the only implementation. Outbound sending and polling stay **off** until `ERP_SEND_ENABLED` is set; queued messages wait as `HELD` in the `ErpMessage` log. A connection names the env var that holds its credentials (`credential_env_name`). No credential is stored in the database.

---

## Open questions for Scott (listed here, not decided)

1. **How the receipt enters each ERP:** cXML (ServiceEntryRequest / CMF) or REST (Oracle work confirmations). Oracle is specified as REST; other ERPs are open.
2. **How approval or rejection comes back:** polling the work confirmation (built, off), an ERP callback, or cXML StatusUpdate.
3. **ERS on amount-based service lines:** does Pay on Receipt create the invoice correctly from a receipt by amount?
4. How Oracle sets the Panameer Services line type on punchout lines.
5. Whether hourly timesheets fit a complex PO progress schedule.
6. Demo Central terms before any live test.
