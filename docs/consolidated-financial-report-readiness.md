# การเตรียมระบบ Multi-BU / Consolidated Financial Report

อัปเดต readiness 14 ตุลาคม 2026 · Frontend Carmen Financial · Backend Carmen.WebApi

ขอบเขตเดิม: Phase 2 เลือก BU เพื่อดูรายงานแยกกัน; Phase 3 เพิ่ม `view all` และ report templates ส่วนกลาง งานใหม่วันที่ 12 ตุลาคมเพิ่ม consolidated management reporting ระดับ 1 บน branch แยก ตามแนวทาง storage/mapping ที่โอมยืนยัน

## Readiness ล่าสุด: ยังขาดอะไรในการ consolidate

อัปเดต runtime/UI 14 ตุลาคม: Shared reports เป็น workspace ในพื้นที่หลักแล้ว เก็บ draft ทั้ง shared/รายงานเดี่ยวระหว่างสลับหน้า; authenticated create/save/reload/clone/history/soft-delete และ restore ของ config ที่ mapping ครบผ่านกับ Admin DB จริง ทดสอบ Room Revenue ปี 2026 P1 เทียบ SQL แยกสอง BU ได้ Actual รวม 26,388,737.76 และ Budget Rev0 รวม 28,123,525.00 ตรง UI/KPI/ไฟล์ Excel โอมยืนยัน Rev0 เป็น scenario เดียวกัน แต่ยังไม่มีบัญชีทดสอบ deny/revoke ผลนี้ครอบคลุมหนึ่งแถว/หนึ่ง scenario ไม่ใช่ full acceptance ดู [verification record](shared-report-verification-2026-10-14.md)

ผลตรวจเพิ่มเติม 14 ตุลาคม: DBX read-only ยืนยันว่าตาราง shared ทั้งสองมีอยู่ โครงสร้าง 11 columns และ primary keys ตรง migration และทั้งสองตารางยังว่าง; frontend regression รันใหม่ผ่าน 280 tests / 33 files ส่วน authenticated capability/lifecycle/reconciliation ยังรอ session ที่ใช้งานได้ ดู [verification record](shared-report-verification-2026-10-14.md) ไม่ apply migration ซ้ำ

**มี local implementation ของ shared templates และการรวมยอดระดับ 1 แล้ว โอมแจ้งว่า apply migration ใน Admin DB แล้ววันที่ 14 ตุลาคม แต่ยังไม่ผ่าน reconciliation กับข้อมูลจริง** เปิด shared template ที่กำหนด participating BUs และ mapping จากปุ่ม Shared reports ด้านซ้าย ส่วน full accounting consolidation ยังไม่มี implementation

### การปรับล่าสุดวันที่ 14 ตุลาคม 2026

- เอา `view all` ออกจาก BU dropdown และย้ายปุ่ม **Shared reports** ไป sidebar เหนือรายการ Reports; เมนู mobile ใช้ sidebar panel เดียวกัน
- เปิด shared workspace โดยไม่เปลี่ยน BU selection หรือทิ้ง draft รายงานเดี่ยว เมื่อเลือก carmencloud/paresa อยู่ก็เปิด Shared reports ได้โดยตรง
- Participating BUs ของรายงานยังมาจาก stored template และตรวจสิทธิ์ทุก BU; การเปิดเมนูไม่ทำให้เลือกทุก BU หรือรวมยอดอัตโนมัติ
- โอมยืนยันว่า apply Admin DB migration แล้ว ไม่ apply ซ้ำจาก agent; ยังไม่ได้ตรวจ schema/lifecycle/reconciliation จริงในรอบนี้ Backend capability gate คงตรวจ schema ตาม admin scope ของ session
- Verification ของ UI รอบนี้: affected tests 58 เคสผ่าน และทดสอบ sidebar case เพิ่มให้ยืนยัน BU selection สองรายการกับ unsaved draft ไม่เปลี่ยน; frontend build และ diff check ผ่าน

### Implementation วันที่ 12 ตุลาคม 2026

- Frontend/backend อยู่บน `codex/consolidated-financial-report`; shared storage/API แยกจาก tenant reports ไม่มีการย้าย `glhis`/`jv`
- Shared lifecycle รองรับ create/save/clone/delete/history/restore พร้อม owner/ACL, BU permissions, transaction และ version conflict; delete เป็น soft delete เก็บ audit historyไว้
- Admin migration อยู่ backend `App_Data/SharedReports/001-create-admin-shared-reports.sql` พร้อม rollback แยก; ต้องเลือก Admin DB ตาม signed admin scope และ backup ก่อน apply ไม่มี auto migration ตอน startup
- `GET /api/shared-reports/capabilities` ตรวจ schema availability; frontend ไม่สร้าง shared template ใน localStorage เมื่อ backend/schema ยังไม่พร้อม
- API ใหม่: `/api/shared-reports` สำหรับ catalog/create, `/{id}` สำหรับ read/save/delete (delete ส่ง `version`), `/{id}/clone`, `/{id}/history`, `/{id}/history/{version}/restore` (body `version` ปัจจุบัน), `/{id}/data` (POST filters) และ `/validate` สำหรับตรวจ definition/possible overlaps ไม่ส่ง `useTenant` กับ shared APIs
- Shared config เพิ่ม `tenants`, `mappings[tenant][stableRowId]`, column `sourceTenant` (`ALL` หรือ tenant เดียว), `version`, `compatibilityConfirmed`, `overlapConfirmed` และ `kpis` ที่อ้าง stable row/column IDs; mapping ใช้ GL conditions โดยตรง ไม่ต้องสร้าง source report แยกก่อน
- Group selections ใน setup ขยายเป็น account/department codes แบบ snapshot เมื่อ Apply; ต้อง reapply หลังสมาชิก group เปลี่ยน ไม่ถือว่า group membership sync อัตโนมัติ
- Backend ใช้ query เดิมกับ explicit tenant DB contexts ครั้งละไม่เกินสอง BU ตรวจ currency, fiscal ranges ของปีที่ต้องใช้ และ unknown source codes; client reuse calculation engine เดิมเพื่อรวม mapped base amounts ก่อน row/column formulas และ percentages
- Dashboard KPI/report ใช้ calculated result เดียวกัน; missing BU ไม่แสดง consolidated output และไม่เปิด export/print ยอดครบถ้วน ข้อมูลเก่าถูกล้างเมื่อ preview ใหม่ล้มเหลว
- Source queries มี timeout 60 วินาทีต่อ query; cancellation ตรวจระหว่าง BU batches แต่ query ที่เริ่มแล้วรอจบหรือ timeout ตาม provider ยังไม่ใช่ immediate SQL cancellation
- ยังไม่รองรับ FX/elimination/ownership, การ remap budget revision ข้าม BU หรือ reporting store; budget scenario/sign equivalence ต้องยืนยันใน config ไม่อ้างว่าระบบพิสูจน์ accounting semantics อัตโนมัติ

Verification: frontend 280 tests / 33 files ผ่านด้วย Node 25.6.1 และ `--maxWorkers=4 --testTimeout=15000` (ค่าเดิม 5 วินาทีเกิด timeout ต่างเคสระหว่าง full suite; API setup tests ปรับให้รอปุ่ม Edit หลัง loading จบก่อนกด) Backend 77 policy/query/language tests และ frontend/backend builds ผ่าน Browser fixture แสดง Room Revenue 180,000 และ Total Revenue 230,000, KPI 180,000, export เปิดอ่านยอดได้, print PDF หนึ่งหน้า และ mobile viewport 390px ไม่มี body overflow ผลนี้ใช้ข้อมูลจำลอง ไม่ใช่ authenticated DB reconciliation

React Doctor ใช้ scanner รุ่นปัจจุบันได้ 75/100 มี warnings เดิมและ complexity ของ shared workspace; loading reset ใน shared workspaceอยู่ใน finally แล้ว ไม่เปลี่ยน engine เพื่อไล่คะแนน ยังไม่ตรวจ migration/lifecycle/revoke end-to-end กับ database จริง, p95/load หรือ production deployment

แยกเป้าหมายสองระดับ: (1) รวมยอดหลาย BU สกุลเงินเดียวสำหรับ management reporting และ (2) full accounting consolidation ที่เพิ่มกติกา FX, intercompany, ownership และ adjustments ระดับแรกไม่ควรถูกนำเสนอว่าเป็นงบ consolidated ทางบัญชีที่ครบถ้วน

### สิ่งที่มีแล้วและขอบเขตหลักฐาน

| ความสามารถ | สถานะ | หลักฐาน / ข้อจำกัด |
|---|---|---|
| BU selection และ catalog แยก BU | มีแล้ว | `useBusinessUnitReports` โหลด catalog แยก tenant จำกัดครั้งละสอง BU และใช้ key `(tenant, reportId)` |
| อ่าน report data หนึ่ง BU ต่อ request | มีแล้ว | `reportApi.js` ส่ง owner tenant; `ReportV2Controller.GetReportData` และ `FncReportV2.GetReportDataAsync` อ่าน actual/budget ใน tenant context เดียว |
| Calculation ของรายงานเดี่ยว / shared base values | มี local implementation | `reportLogic.js` reuse row/column formulas และ percentages หลังรวม mapped base values |
| Central templates / source binding / consolidated API | มี local implementation; โอมแจ้งว่า migration แล้ว | มี lifecycle/data APIs และ UI; schema/lifecycle/reconciliation กับ DB จริงยังต้องตรวจ |
| End-to-end deny/revoke, write routing และ DB reconciliation | ยังไม่ตรวจ runtime ครบ | ผลเดิมและข้อจำกัดอยู่หัวข้อ 10 ไม่ใช่ผล verification ใหม่วันที่ 12 ตุลาคม |

### ระดับ 1: รวมยอดหลาย BU สกุลเงินเดียว

| งานที่ยังขาด | สิ่งที่ต้องทำ / ตัดสินใจ | เกณฑ์พร้อมใช้ |
|---|---|---|
| Central configuration | เก็บ report definition และ source binding ใน admin scope พร้อม permissions, version/history/audit และ migration/rollback; localStorage ไม่เป็น authoritative storage | Save/reload/version/restore ได้ และผู้ไม่มีสิทธิ์อ่านหรือแก้ไม่ได้ |
| Mapping ต่อ BU | กำหนด source report และ mapping COA/departments/dimensions เข้าความหมายกลางแบบมี version; ไม่จับคู่ด้วย label/index/reportId อย่างเดียว | ตรวจพบ unmapped/ambiguous mapping และตามกลับถึง source BU ได้ |
| Currency และ filter compatibility | ยืนยันสกุลเงินเดียว, sign policy, actual date ranges/fiscal calendar, day/YTD และ budget scenario ต่อ BU | Mixed currency หรือ filters ที่เทียบกันไม่ได้ถูก block พร้อมเหตุผล |
| Backend aggregation | เพิ่ม orchestration ที่ตรวจสิทธิ์ทุก BU ใช้ independent tenant DB contexts และรวม base measures ก่อนคำนวณ row formulas → column formulas → percentages | ยอด reconcile กับ source ต่อ BU; ไม่ SUM/average percentages หรือ nonlinear final cells |
| Completeness และ traceability | แยก missing mapping/data, failed BU และ true zero; ระบุ requested/included BUs, asOf, mappingVersion, warnings และ totals/byTenant | Unauthorized BU ถูก reject; timeout/unavailable ไม่กลายเป็นศูนย์หรือถูกตัดออกเงียบ ๆ |
| UI / Excel / Print | ให้เลือก consolidated configuration และ BUs พร้อมแสดง breakdown, warnings และความครบถ้วนในหน้ารายงานและ output | ข้อมูลไม่ครบไม่ถูก export/print เป็นผล complete; พฤติกรรมรายงานเดี่ยวและ import เดิมไม่เสีย |
| Verification และ performance | ทำ reconciliation, tenant isolation/revoke และ load/concurrency checks; ตกลง SLA จากจำนวน BU และขนาดข้อมูลจริง | ผ่าน acceptance ด้านล่างและ SLA ที่ยืนยันก่อน release |

ระดับนี้ยังต้องตกลงขอบเขตรายงานเริ่มต้น, BU ที่เข้าร่วม, source mapping, currency/period/scenario/sign policy และ SLA ก่อน implement ตารางนี้เป็น readiness checklist ไม่ใช่การอนุมัติกติกาบัญชีหรือ API schema ใหม่

### แนวทางที่โอมยืนยัน: Shared storage และแหล่งข้อมูล

Shared template เก็บใน **Carmen Admin DB ภายใต้ admin scope ของกลุ่ม BU** โดยไม่เป็นเจ้าของอยู่ใน BU ใด BU หนึ่ง Frontend อ่าน/บันทึกผ่าน Carmen.WebApi; backend ตรวจสิทธิ์ template ส่วนกลางและสิทธิ์ BU ที่อ้างอิงแยกกัน มี local schema/API implementation แล้ว แต่ต้องตรวจ migration กับ Admin DB จริงก่อน apply

| ข้อมูล | ที่เก็บ |
|---|---|
| Shared template: metadata, rows, columns, formulas และรูปแบบ | Admin DB |
| BUs ที่เข้าร่วม, source bindings และ mapping ต่อ BU | Admin DB ผูก template และ tenant identifier |
| Template permissions, mapping/config versions และ history/audit | Admin DB |
| `glhis`, `jv` และ budget ต้นทาง | Tenant DB ของแต่ละ BU ตามเดิม |

**ไม่ต้องย้ายหรือทำสำเนา `glhis` และ `jv` มา Admin DB สำหรับ implementation เริ่มต้น** Backend อ่านข้อมูลจากแต่ละ Tenant DB ตาม mapping และ filters โดย aggregate/filter ที่ต้นทางก่อนนำ base amounts มารวม ใช้ independent DB contexts และ bounded concurrency; ไม่ดึง transactions ทั้งหมดมาไว้ใน memory เพื่อรวมรายงาน

เลือกใช้ `glhis` หรือ transaction aggregation จาก `jv` ตามชนิดรายงานและ business rules เดิม ต้องตรวจช่วงวันที่/สถานะรายการและ reconcile ให้ชัด ไม่บวกทั้งสองแหล่งซ้ำสำหรับยอดเดียวกัน หากภายหลังวัดแล้วไม่ถึง SLA ค่อยประเมิน central reporting store สำหรับยอดสรุป พร้อม refresh/invalidation และ reconciliation; ยังไม่เพิ่ม store หรือ sync pipeline ใน scope เริ่มต้น

### แนวทางที่โอมยืนยัน: Mapping กำหนด source; สูตรใช้ `R#` / `C#`

เปิดหรือสร้าง shared template ส่วนกลางจาก **Shared reports** ใน sidebar โดยไม่เปลี่ยน BU selection Template สำหรับ consolidate กำหนด BUs ที่เข้าร่วมชัดเจน ไม่เปลี่ยนตาม permitted inventory ของผู้เปิดโดยเงียบ ๆ หากผู้ใช้ไม่มีสิทธิ์ BU ที่จำเป็น ต้องแจ้งว่าเปิด consolidated report ไม่ได้

- Data rows มีความหมายกลาง เช่น Room Revenue และ mapping accounts/departments/groups/dimensions แยกต่อ BU ใช้ lookup ของ BU ที่กำลังตั้งค่า; code หรือ label เหมือนกันไม่ถือว่า mapping เหมือนกัน
- Mapping ผูก stable row ID และ tenant ID; `R#` / `C#` ใช้ในสูตรตามระบบเดิมพร้อม reference syncing เมื่อย้ายแถว/คอลัมน์ ไม่ใส่ชื่อ BU ลงใน formula text
- Formula/Total rows ใช้สูตรกลางของ template; รวม base measures ของ source ที่เลือกก่อนคำนวณ row formulas → column formulas → percentages ไม่รวม percentages สำเร็จรูป
- คอลัมน์ข้อมูลกำหนด source scope ชัดว่าอ่าน BU เดียวหรือยอดรวมของ BUs ที่กำหนด; Formula columns อ้างคอลัมน์ผ่าน `C#` ป้องกันการนำ combined column มาบวกกับ per-BU columns ของยอดเดียวกันซ้ำ
- ทุก Data row ของ BU ที่เข้าร่วมต้องมี mapping หรือระบุชัดว่าไม่มีรายการนี้ใน BU นั้น; mapping ว่างถือว่ายังตั้งค่าไม่ครบ ต้องกำหนดกติกาตรวจ overlapping mappings เพื่อป้องกันยอดซ้ำโดยยังรองรับแถวที่ตั้งใจแสดง source ซ้ำ
- Preview แสดงยอดแยก BU และยอดรวมเพื่อ reconcile ก่อน save/version; currency, period, scenario และ signs ต้องเทียบกันได้ตาม checklist ระดับ 1

ตัวอย่าง Room Revenue: mapping ของ CarmenCloud ให้ยอด 100,000 และ mapping ของ paresa ให้ยอด 80,000 แถวกลางแบบ combined ได้ 180,000 หากต้องการแสดงแยก BU และใช้ column formula ให้ตั้งดังนี้ (ตัวเลขเป็นตัวอย่าง ไม่ใช่ข้อมูลจริง):

| แถวกลาง | CarmenCloud (`C1`: BU เดียว) | paresa (`C2`: BU เดียว) | รวม (`C3`: Formula) |
|---|---:|---:|---|
| Room Revenue (`R1`) | 100,000 | 80,000 | `C1+C2` = 180,000 |
| F&B Revenue (`R2`) | 20,000 | 30,000 | `C1+C2` = 50,000 |
| Total Revenue (`R3`: Formula `R1+R2`) | 120,000 | 110,000 | 230,000 |

เลือกแสดง combined source column หรือ per-BU columns + formula ตามรูปแบบรายงาน ไม่ใช้สองวิธีเพื่อบวก source เดียวกันซ้ำ Dashboard KPI อ้างผล cell ของ template เช่น Room Revenue รวม พร้อม participating BUs/completeness/warnings ใช้ผลคำนวณชุดเดียวกับรายงาน ไม่สร้าง calculation rules อีกชุด Source scope ข้าม BU และ stable KPI binding มี local implementation และ fixtures แล้ว

### ระดับ 2: Full accounting consolidation

| งานเพิ่มเติมจากระดับ 1 | สิ่งที่ต้องยืนยันกับผู้รับผิดชอบบัญชี |
|---|---|
| Consolidation perimeter / ownership / method | บริษัทที่อยู่ในกลุ่ม, effective dates, สัดส่วนถือหุ้น, consolidation method และ NCI ตามกรณี |
| FX | Reporting currency, rate source/date/version, average/closing/historical rates ตามประเภทบัญชี, rounding และ translation differences |
| Intercompany | Counterparty mapping, matching/reconciliation ของยอดระหว่างบริษัท และ elimination rules |
| Adjustments และ control | Consolidation journals, approval, audit trail, period controls และการย้อนกลับรายการ |
| Accounting acceptance | Reconcile source balances, FX, eliminations และ adjustments ถึงยอด consolidated พร้อมการยืนยันจากผู้รับผิดชอบบัญชี |

ยังไม่มี implementation ของความสามารถระดับ 2 ในขอบเขต source ที่ตรวจ และยังไม่มี accounting policy ที่ยืนยันในเอกสารนี้

### ลำดับงานที่แนะนำและ API ที่ต้องเพิ่ม

1. ยืนยันเป้าหมายระดับ 1 และกติกา currency/period/scenario/sign พร้อมตัวอย่างรายงานและ expected totals ที่ฝ่ายบัญชีตรวจได้
2. ออกแบบ central configuration, source binding และ mapping version พร้อม authorization และ migration/rollback
3. เพิ่ม consolidated backend capability โดย reuse data queries และ business rules เดิม; API หนึ่ง BU ปัจจุบันยังคง contract เดิม ไม่ส่ง tenants array ให้ `useTenant`
4. เพิ่ม UI และ output พร้อม per-BU breakdown, completeness และ warnings
5. ตรวจ reconciliation/security/performance แล้วจึง release; ระดับ 2 ต้องยืนยัน accounting policies และ acceptance แยกก่อนเริ่ม

Consolidated data API ปัจจุบันคือ `POST /api/shared-reports/{id}/data` รับ filters และอ่าน stored configuration โดยคืน requested/included BUs, isComplete, asOf, configVersion/mappingVersion, currency, warnings และ normalized sources ใน byTenant; frontend สร้าง per-BU/combined base values และ final cells ด้วย engine เดิม จึงยังไม่ใช่ API ของ final decimal cells ที่คำนวณทั้งหมดบน backend

**เงื่อนไข branch ที่โอมยืนยัน:** งาน source สำหรับ consolidation อยู่บน branch `codex/consolidated-financial-report` ทั้ง frontend (`C:\source\carmen.financial`) และ backend (`C:\dotnet\Carmen4\Carmen.WebApi`) ซึ่งสร้างก่อน implementation ไม่รวม changes ที่ไม่เกี่ยวข้องโดยอัตโนมัติ

### Acceptance ที่ต้องเพิ่มสำหรับ consolidation

- ยอด additive measures เท่ากับผลรวม source BU หลัง mapping/sign policy และ rounding ที่ตกลง; ตรวจทั้ง actual และ budget
- สูตรและ ratios คำนวณจาก base measures รวม เช่น กำไร 10/รายได้ 100 และกำไร 90/รายได้ 300 ได้ margin 25%; ไม่รวมเปอร์เซ็นต์สำเร็จรูป
- Code/label/reportId ซ้ำข้าม BU ไม่ทำให้ mapping หรือข้อมูลปะปน; missing mapping ถูกแสดงเป็นปัญหา
- Mixed currency, incompatible periods และ budget scenarios ถูกตรวจพบก่อนแสดงผลที่อ้างว่าเทียบกันได้
- BU timeout/data missing แสดงผล incomplete พร้อม missing BUs; true zero แยกได้; Excel/print คง warnings และสถานะ
- Unauthorized/revoked BU ถูก reject แม้ยังอยู่ใน frontend selection; request ข้าม admin scope อ่านข้อมูลไม่ได้
- Configuration/mapping version ตรวจย้อนหลังได้ และ pending/stale requests ไม่แทนผลจาก configuration หรือ filters ใหม่
- Shared template บันทึกใน Admin DB ภายใต้ admin scope ที่ถูกต้อง; ย้ายแถวแล้ว mapping ตาม stable row ID ไม่หลุด และสูตร reference syncing ยังคงถูกต้อง
- Room Revenue จากสอง BU รวมเป็น 180,000 ตาม fixture ตัวอย่าง ทั้ง combined-source และ per-BU `C1+C2`; row formula `R1+R2` ให้ Total Revenue 230,000 โดยไม่บวก source ซ้ำ
- Dashboard และ report cell ให้ผลเดียวกันและแสดง completeness ตรงกัน; การอ่าน `glhis`/`jv` ไม่ double count และไม่ต้อง replicate transactions เข้า Admin DB
- รายงานเดี่ยว, Excel import/formulas/multiline labels และ export เดิมผ่าน regression ที่เกี่ยวข้อง; วัด load/concurrency/p95 เทียบ SLA ที่ต้องยืนยัน

### Verification ของการอัปเดตเอกสาร

วันที่ 12 ตุลาคม 2026 ตรวจ source แบบ targeted ของ BU hook, report API/controller, tenant data function และ calculation helpers เพื่อยืนยันขอบเขตปัจจุบัน ไม่ได้รัน tests/build, query database, ตรวจ runtime, accounting reconciliation หรือ performance ใหม่ ผล verification วันที่ 8–9 ตุลาคมด้านล่างคงเป็นหลักฐานย้อนหลัง

| Phase | ขอบเขต | สถานะ |
|---|---|---|
| 1 | Default-BU login, EN login และ Language preferences | Implement ใน local checkout แล้ว |
| 2 | BU multiselect, Reports แยกกลุ่ม BU, เปิด/จัดการรายงานใน BU เดียว | Implement ใน local checkout; tests/build ผ่าน การตรวจ runtime ยังไม่ครบ |
| 3 | Shared reports จาก sidebar และ central templates | Local implementation แบบ capability gate; โอมแจ้งว่า apply Admin migration แล้ว |
| 4 | Consolidated management reporting ระดับ 1 | Local implementation + fixtures ผ่าน; DB reconciliation/load ยังไม่ผ่าน acceptance |

## 1. ข้อสรุปและขอบเขตที่เลือก

- Login ไม่มี dropdown BU/ภาษา; resolve default BU ตาม Username และ fallback BU แรก ส่ง Language EN คง token/session ผูก BU
- Title bar มี BU multiselect โดย options เป็น BU ที่มี active membership และ Financial Report View ภายใน admin scope เดียวตาม shared identity ที่โอมยืนยัน
- Reports ด้านซ้ายแสดงทุก report ที่ผู้ใช้มีสิทธิ์จาก BU ที่เลือก แยกกลุ่มตาม BU; เปิดหนึ่งรายงานในหนึ่ง BU ไม่รวมยอด
- API ใช้ path เดิมและ `useTenant` ต่อท้าย เช่น `GET /api/reports?useTenant=BU_B` และ `POST /api/accountGroup/search?useTenant=BU_B` ไม่สร้าง `/api/business-units/{tenant}/...`
- Backend ตรวจ token/session ตามเดิมก่อน แล้วตรวจ membership + financial report permission ของ BU ที่ขอ และกำหนด DB context เฉพาะ request โดยไม่เปลี่ยน Tenant ใน token/session
- ไม่แก้ database/schema, import/export หรือ calculation engine ในรอบนี้

## 2. หลักฐานจาก implementation ก่อนเริ่ม Phase 1

หัวข้อนี้บันทึก source audit เดิมเพื่ออธิบายเหตุผลของการเปลี่ยนแปลง ผล implementation ปัจจุบันดูหัวข้อ 4 และสถานะด้านบน

### Login และ session

- `src/app/LoginForm.jsx:82` บังคับ `selectedTenant` และส่ง tenant เข้า `loginWithCarmenCredentials`; เมื่อสำเร็จเก็บ `businessUnit: {tenant, description}`
- `src/features/report/lib/reportApi.js:281` ส่ง `POST /api/login?adminToken=…` โดย body มี `Language`, `Tenant`, `Password`, `UserName`
- `src/features/report/lib/carmenSession.js` เก็บ accessToken, username, businessUnit, user ใน localStorage โดย BU เป็น object เดียว
- Backend `Functions/FncLogin.cs:249` รองรับ Tenant ว่าง: สร้าง session Tenant ว่างและ token โดย `Permissions = null`; ข้อมูลผู้ใช้มาจากผล query ใน admin DB
- Branch Tenant ว่าง return ก่อนเข้า tenant-specific policy และ active checks ที่อยู่ใน branch login BU ปกติ เป็นข้อค้นพบสำหรับ audit เท่านั้น ไม่ใช่ flow ที่เลือกใช้ตามข้อกำหนดล่าสุด
- `getDefaultBusinessUnit` รองรับ `IsDefault/isDefault` ที่เป็น `true`, `1`, `"true"`, `"1"` และ fallback BU แรก ใช้ behavior นี้ต่อในการ login อัตโนมัติ
- `FncToken` ใส่ Language ใน token; `FncLanguage` ใช้ claim นี้ค้น translation resources ส่วน `TokenValidationHandler` ตรวจ token/session ก่อนตั้ง principal ยังไม่มี `Accept-Language` override ใน source ที่ตรวจ
- `GET /api/userTenant/tenantListIn/{adminToken}/{userName}` เป็น `[AllowAnonymous]` ใช้ค้น BU ก่อน login ปัจจุบัน ไม่ควรใช้รายการนี้เป็นหลักฐาน authorization สำหรับอ่านข้อมูล

### Tenant routing

`Functions/FncBase.cs:192` มี behavior ดังนี้:

1. ถ้า Tenant claim ไม่ว่าง: ไม่เปลี่ยน tenant แม้ส่ง `useTenant` อีกค่า
2. ถ้า Tenant claim ว่าง และ argument ว่าง: throw `TenantEmptyException`
3. ถ้า Tenant claim ว่าง และ argument มีค่า: set Tenant claim ของ principal ใน request

Helper นี้ไม่ได้ตรวจ membership ภายในตัวเอง จาก source ที่ตรวจจึงยังรับประกันไม่ได้ว่า endpoint ทุกตัวป้องกัน cross-tenant access งาน multi-BU ต้องตรวจ authorization เพิ่มเอง โดยไม่อาศัย helper นี้เป็นหลักฐานสิทธิ์

`Controllers/ReportV2Controller.cs` เรียก `ApplyTenantIfUseTenant("")` และ action ไม่รับ `useTenant` ขณะที่ frontend `buildUrl()` ใส่ query parameter นี้จาก session ให้ทุก authenticated request โดยปริยาย จึงมีความต่างระหว่าง URL ที่ส่งกับ behavior ของ controller

### Data และ calculation

- `Functions/FncReportV2.cs:958` ใช้ tenant DB เดียว โหลด definition ตาม reportId และตรวจ financial report permission + report access ของ tenant ปัจจุบัน
- Query actual ใช้ monthly history หรือ transaction aggregation สำหรับ daily/dimension report และ filter account/department/year; budget filter years/revisions
- API คืน `actualRows`, `budgetRows` ให้ frontend คำนวณรายงานต่อ ไม่ใช่ consolidated final cells
- `src/app/App.jsx` โหลด report data/master data/options/reports ผ่าน effects ที่ต้องเพิ่ม 
## 3. API contract ปัจจุบันหลัง Phase 2

| API | Phase 1 | Phase 2 |
|---|---|---|
| POST `/api/login` | Default/fallback Tenant และ Language EN | คง tenant-bound login |
| GET `/api/userTenant/tenantListIn/{adminToken}/{userName}` | Anonymous lookup ก่อน login | ไม่ใช้เป็น authorization |
| GET `/api/userTenant/UserName/{username}` หลัง login | API เดิมที่ต้อง authenticated | Dropdown ใช้ `Data` และ nested `Tenant` แสดง BU ที่ผูกกับ username; อ่าน `Permission[].Code` hex สำหรับ UI; backend ตรวจสิทธิ์จริงเมื่ออ่าน BU |
| GET `/api/reports`, `/api/reports/{id}` | อ่าน token BU | ส่ง `useTenant` เพื่ออ่าน BU ที่เลือก ตรวจ report access เดิม |
| GET `/api/report-master-data`, `/api/report-data`, `/api/report-periods`, `/api/report-options` | Contract เดิม + Accept-Language | Query/filter เดิม + `useTenant` สำหรับ BU context |
| POST `/api/dimension/search`, `/api/accountGroup/search`, `/api/DepartmentCategory/search` | Contract เดิม | Body เดิม + `useTenant` ใน query สำหรับ scoped lookup |
| POST `/api/reports`, `/api/reports/batch`; PUT/DELETE `/api/reports/{id}`; POST clone | Writes ใน BU เดียว | ส่ง `useTenant` ของ report owner; ตรวจ write permission เดิม ไม่ broadcast |
| GET history/version; POST restore | BU เดียว | ส่ง `useTenant` ของ report owner; version conflict/audit เดิม |
| `/api/user/search` และ API legacy อื่น | Routing เดิม | ไม่เพิ่มการสลับ BU ใน handler ของ Phase 2; scoped users มาจาก report-master-data |

```http
GET /api/reports?useTenant=BU_B
Authorization: <token with Tenant=BU_A>
Accept-Language: en
```

POST ใช้ query parameter แบบเดียวกัน เช่น `/api/accountGroup/search?useTenant=BU_B`; ไม่ใส่ tenants array ลง body หรือ `useTenant=BU_A,BU_B`

`useTenant` ต้องเป็น tenant identifier จาก inventory ไม่ใช่ description: ใน local session นี้ CarmenCloud ใช้ `carmencloud` และ paresa ใช้ `prod` Dropdown แสดง description แต่ส่ง identifier เดิม

ตัวอย่าง contract ของ Phase 2:

```http
GET /api/reports?useTenant=prod
GET /api/report-master-data?year=2026&useTenant=prod
GET /api/report-data?reportId=<report-id>&year=2026&period=2&revision=0&useTenant=prod
POST /api/accountGroup/search?useTenant=prod
PUT /api/reports/<report-id>?useTenant=prod
GET /api/reports/<report-id>/history?useTenant=prod
POST /api/reports/<report-id>/history/7/restore?useTenant=prod
```

Headers, search/write bodies และ reportId ใช้ contract เดิม; query รวม filters เดิมได้ Client ส่ง request แยกต่อ selected BU ไม่แก้ Tenant ใน token และไม่ aggregate ยอดรายงาน Inventory หลัง login ใช้ `/api/userTenant/UserName/{username}` พร้อม token ไม่ส่ง useTenant; tenantListIn ใช้เฉพาะก่อน login การอยู่ใน dropdown ไม่ใช่หลักฐาน authorization

Parameter ต้องระบุ BU เดียว; ค่าว่าง, duplicate `useTenant`, comma list หรือ slash ไม่ถูกต้องให้ 400 ในชุด API ที่รองรับ ไม่มี parameter ให้ใช้ BU ใน token ตามเดิม ไม่ rewrite URL/route

Token/session invalid ให้ 401; BU ไม่มี active membership หรือ Financial Report View ให้ 403 โดย frontend คง session ที่ยัง valid Report write/access validation และ optimistic concurrency ใช้ controller เดิม

หมายเหตุ: source audit ในหัวข้อ 2 บันทึก behavior ก่อน Phase 2; `ApplyTenantIfUseTenant` เดิมและ API นอก whitelist ไม่ถูกเปลี่ยนเป็น cross-BU routing ทั่วระบบ

## 4. Phase 1: Default-BU login / Language — Implement

1. หน้า Login เหลือ Username, Password และ Sign in ไม่มี dropdown BU หรือภาษา
2. Tenant list lookup ตาม Username ที่ trim เมื่อ blur/submit; รองรับ Enter/autofill และ reuse in-flight lookup ป้องกัน double submit
3. เลือก default ตัวแรกที่ IsDefault/isDefault เป็น 1/true/string true; ไม่มี default ใช้ BU แรก
4. Empty/error/invalid tenant ไม่เรียก login; ทิ้ง stale response เมื่อ Username เปลี่ยน ไม่ login ด้วย Tenant ว่าง
5. Login ส่ง Tenant ที่ resolve และ `Language: "EN"`; คง tenant-bound token/session ตามเดิม
6. Preferences บน title bar เพิ่ม Language คู่ Theme: English, Thai UI ยัง English เปลี่ยนเฉพาะภาษา API
7. เก็บ preference ระหว่าง session/reload; logout/login ใหม่เริ่ม English

Authenticated requests ส่ง Accept-Language: en/th; pending request key รวมภาษา Requests ที่เริ่มแล้วคงภาษา ณ ตอนส่ง

Backend เปลี่ยน request Language claim หลังตรวจ token/session สำเร็จ ไม่ออก tokenใหม่หรือเปลี่ยน permissions/tenant/session Header absent/unsupported คง token language

| Header | Request claim | Resource |
|---|---|---|
| en / en-US | EN | US |
| th / th-TH | TH | TH |

Normalize case/whitespace รองรับ single language tag; ไม่เพิ่ม q-values negotiation ข้อความ hardcode/resource missing ใช้ fallback เดิม ยังไม่รับประกันว่าทุกข้อความ API เปลี่ยนภาษา

Deploy backend header support ก่อน frontend และตรวจ CORS/preflight Client เดิมไม่มี header คง token language
## 5. Phase 2: BU selection และ report ownership — Implement

1. หลัง login เรียก `/api/userTenant/UserName/{username}` แสดงรายการ BU จาก `Data` โดยใช้ nested Tenant identifier/Description และ IsDefault; Permission Code แปลงตาม Carmen bit masks View=80, Add=40, Update=20, Delete=10 สำหรับ UI และตรวจ active membership + Financial Report View ที่ backend แยกต่อ useTenant
2. เลือก BU ใน session เป็นค่าเริ่มต้นถ้ายังมีสิทธิ์ ไม่เช่นนั้นใช้ permitted BU แรก; empty/error inventory แสดงข้อความ ไม่ใช้ anonymous list หรือเดา BU
3. BU dropdown เลือกหลายรายการได้ แสดง description เท่านั้นโดยใช้ tenant เป็น identifier แต่ละ option เป็น BU เท่านั้น ไม่มี Combine report หรือ `view all`
4. โหลด report catalogs แยก request ต่อ BU ครั้งละไม่เกินสองรายการพร้อมกัน และแสดงกลุ่ม Reports ของทุก BU ที่เลือก; BU ที่โหลดไม่สำเร็จแสดง error ไม่แทนด้วยข้อมูลจาก login BU
5. ใช้ report key `(tenant, reportId)` แยก selection/state แม้ reportId ซ้ำกัน; reportId ที่ส่ง backend ยังคงค่าเดิม
6. เมื่อเปิด report โหลด master data, dimensions, actual/budget และ filters ของ report owner ผ่าน API เดิม + useTenant; ป้องกัน stale response และล้างข้อมูลเก่าขณะเปลี่ยน BU
7. New Report เมื่อเลือกหลาย BU ต้องเลือก destination BU หนึ่งรายการจาก BU ที่มี setup permission; report/template เก็บใน BU นั้น ใช้ write permission เดิมของ Carmen ไม่สร้าง shared report
8. Save/import/clone/delete/history/restore ใช้ owner BU ของรายงาน ไม่ write ทุก BU ที่เลือก; การเปลี่ยน BU/report มี dirty-change confirmation และไม่สลับระหว่าง save/create ที่กำลังทำ
9. Report data/master data ของ API อยู่ใน memory เพื่อไม่ reuse localStorage จากคนหรือ BU อื่น; offline/demo persistence คงเดิม Refresh/reload คืน BU selection ที่เก็บระหว่าง session หลังตรวจ permitted inventory ใหม่; BU ที่หมดสิทธิ์ถูกถอดออก Login ใหม่ล้าง selection เดิมแล้วเริ่มจาก default BU ใน session

### Authorization และ request context

`ReportTenantHandler` ทำงานหลัง `TokenValidationHandler`; เฉพาะ report/lookup endpoints ที่ระบุในหัวข้อ 3 และมี useTenant ตรวจ authenticated shared identity ใน signed admin scope แล้วสร้าง principal สำเนาพร้อม `ReportTenant` claim

`FncBase.GetCurrentUserLogin()` อ่าน request ReportTenant ก่อน Tenant เดิม เพื่อให้ DB factory/controller/permission checks ใช้ BU ที่ได้รับอนุญาต Original Tenant/AccessToken/session/admin scope ไม่เปลี่ยน และ request ต่าง BU ไม่ share DB connection/context

ไม่เปิด cross-admin-scope access และไม่ข้าม financial report/view/access/write checks การเพิ่ม scoped endpoints อื่นในอนาคตต้องตรวจ callers/authorization ก่อน

### Phase 3: view all / Shared reports — ขอบเขตเดิมก่อน implementation

- เพิ่ม option `view all` ใน BU dropdown ให้แสดง Reports ของ permitted BUs ทั้งหมดพร้อมกลุ่ม Shared reports
- New Report ใน view all เก็บ central template ใน admin scope แยกจากทุก BU; regular BU selection ยังสร้างใน destination BU เดียว
- Central template เก็บ configuration เท่านั้น ไม่มีการ SUM, FX, elimination, ownership หรือ consolidated dashboard totals
- ก่อน implement ต้องกำหนด central storage migration, template permissions, version/history และ source binding ของ shared template; ไม่ใช้ localStorage เป็น authoritative storage
- Phase 2 APIs คง single-BU contract; งาน shared/consolidated ใหม่ใช้ `/api/shared-reports` ตาม implementation status ด้านบน

## 6. ข้อกำหนด accounting สำหรับงานรวมยอดในอนาคต (นอก Phase 2/3)

รายละเอียดนี้เป็น accounting readiness reference งานระดับ 1 มี local implementation ตาม status ด้านบน แต่ full consolidation/FX/elimination ยังอยู่นอกขอบเขต

| เรื่อง | กติกาที่ต้องตกลงก่อนรวมยอด |
|---|---|
| COA / departments / dimensions | Mapping แยกต่อ BU และ version; code เดียวกันไม่รับประกันความหมายเดียวกัน |
| Source reports | เลือก source report ต่อ BU แล้วตรวจโครงสร้าง/row/column semantics ตรงกันก่อนรวม ไม่ใช้ reportId/index/label อย่างเดียว |
| Currency | เริ่ม same currency เท่านั้น; mixed currency block จนกว่าจะมีกติกา FX |
| FX | ยังไม่คำนวณ; ต้องกำหนด rate source/date, average/closing/historical ตาม account class และ rounding |
| Elimination / ownership | ยังไม่คำนวณ; full consolidation ต้องกำหนด intercompany, adjustments, ownership และ method |
| Period / day / YTD | ตรวจ actual date range, fiscal calendar, timezone/business date ไม่สมมติ period number ตรงกัน |
| Budget revision | Map scenario กลาง เพราะ revision 0 อาจคนละ scenario |
| Revenue/cost signs | Normalize ตาม group policy |
| Missing mapping / data / failed BU | แยกจากศูนย์; completeness/warnings ระบุ missing BUs ไม่ export incomplete เป็น complete |
| Amount / precision | Backend decimal; ตกลง rounding และ reconcile additive measures ต่อ BU |
| Percent / ratios / non-additive KPI | รวม base measures แล้วคำนวณใหม่ ไม่ SUM/average percentages หรือ nonlinear final cells |
| Formula order | Preserve aggregate → row formulas → column formulas → mix percentages |
| Central config | Owner/permission/version/audit ใน admin scope; localStorage ไม่ authoritative |

ตัวอย่าง margin: กำไร 10/รายได้ 100 และกำไร 90/รายได้ 300 รวม = 100/400 = 25% ไม่ใช่ SUM percentages หรือ average 20%

Future combined response ต้องมี requested/included tenants, isComplete, asOf, mappingVersion, totals/byTenant และ warnings Unauthorized BU reject ไม่ลด selection เงียบ ๆ Timeout/unavailable ไม่ตีเป็นศูนย์ Dashboard partial ต้องแสดง missing BUs

Future performance: วัด cold/warm p50/p95, query/authorization/serialization time, payload/pool/concurrency; aggregate/filter server-side; bounded tenant workers และ independent DB connections; cancellation/timeouts; metadata/result cache แยก tenant/access/filter/version พร้อม invalidation/revoke; ตรวจ EXPLAIN ก่อนเพิ่ม index และค่อยเพิ่ม summary store เมื่อ query สดไม่ถึง SLA ยังไม่มี SLA ที่ยืนยันในรอบนี้
## 7. Performance ของ Phase 2

- Catalog requests จำกัดสอง BU พร้อมกัน; pending request deduplication key รวม token/language/method/URL/body ทำให้ useTenant ต่างกันไม่แชร์ผลลัพธ์
- อ่าน financial data เฉพาะ report ที่เปิด ไม่โหลด actual/budget ทุก BU เพื่อแสดง sidebar
- ป้องกัน response เก่าหลังเปลี่ยน selection/report/year และไม่ fallback ไป login BU เมื่อ scoped master lookup ล้มเหลว
- ใช้ existing query filters/aggregation/Server-Timing ต่อ ไม่มี result cache, schema/index migration หรือ performance SLA ที่ยืนยันแล้ว
- Membership/permissions ตรวจทุก scoped request เพื่อไม่ใช้สิทธิ์เก่าจาก frontend inventory; ต้องวัด admin DB load ก่อนเพิ่ม authorization cache


## 8. Roadmap และ rollout

| ระยะ | งาน | Exit criteria |
|---|---|---|
| 1 | Default-BU login + Language | default/fallback/stale/Enter/autofill; API language + reload/reset |
| 2 | BU multiselect + grouped Reports + useTenant request context | tenant isolation, reportId collision, per-BU permissions, explicit destination, stale response และ regression ผ่าน |
| 3 | Shared reports จาก sidebar + central templates | storage/permissions/version/history/source-binding contract ยืนยัน และ migration/rollback พร้อม |

Deploy backend support ก่อน frontend; Phase 2 ไม่มี database migration API ที่ไม่มี useTenant คง token context ตัว client เก่าที่ส่ง useTenant ตรงกับ token BU ยังคงอ่าน BU เดิม แต่ได้รับ membership/permission validation เพิ่มใน report endpoints

## 9. Acceptance / test matrix

| Case | Expected |
|---|---|
| Login UI/default/fallback | ไม่มี BU/Language dropdown; default flag รองรับ 1/true/string; ไม่มี default ใช้ BU แรก; Language EN |
| Empty/error tenant list | ไม่ login ด้วย Tenant ว่าง แสดง error |
| Stale username lookup / Enter / autofill / double submit | resolve user ปัจจุบันและ login ครั้งเดียว |
| Language English/Thai, reload/login ใหม่ | API language preference persists reload; login ใหม่ EN; UI English |
| Accept-Language absent/unsupported | คงภาษา token; token/tenant/session เดิม |
| BU inventory | เฉพาะ active membership + Financial Report View ใน admin scope เดียว |
| Dropdown BU | options เฉพาะ permitted BUs; ไม่มี Combine report/view all |
| เลือก BU A/B | Reports ทั้งสองกลุ่ม; partial catalog failure มีข้อความต่อ BU |
| reportId ซ้ำใน A/B | selection/data/draft/history แยก tenant key |
| GET/POST/PUT/DELETE/history | path เดิม + useTenant ของ owner BU; ไม่ rewrite routes |
| No useTenant / parameter invalid/duplicate | no parameter ใช้ token BU; invalid selection ให้ 400 |
| Unauthorized BU / expired session | 403 คง valid session; 401 กลับ login; ไม่ fallback BU |
| Switch selection/report เร็ว | ไม่เห็น stale catalog/master/financial data |
| Refresh/reload เมื่อเลือก CarmenCloud และ paresa | คงสอง BU; ตรวจ inventory ใหม่และถอด BU ที่หมดสิทธิ์ |
| Login ใหม่ / logout | ล้าง saved selection; login ใหม่เริ่ม default BU |
| Highlight รายงานชื่อเดียวกันข้าม BU | aria-current เฉพาะ report owner ที่เลือก; สีอ่านได้ใน Light/Dark |
| New Report หลาย BU | destination ชัดเจน สร้างในหนึ่ง BU เท่านั้น |
| Dirty draft / pending save/create | confirm discard และป้องกันเปลี่ยน context ระหว่าง write |
| Excel import/formulas/labels/report view | classification/formula references/multiline labels และ view/export behavior คงเดิม |
| Phase 3 / ระดับ 1 | Shared reports ใน sidebar เปิด workspace โดยคง BU selection/draft; schema ไม่พร้อมให้ capability gate; mapping/formulas/KPI และ incomplete output ผ่าน fixtures |

## 10. Verification และข้อจำกัด

ตรวจรอบสุดท้าย 8 ตุลาคม 2026: Frontend tests ผ่าน 182 เคสใน 14 files ครอบคลุม App, reportApi, BU hook/components, MultiSelectDropdown, history และ Phase 1; regression ของ Excel template import, fixtures, reportLogic และ ReportView ผ่าน Backend policy/language/access/query-filter tests ผ่าน 59 เคส และ WebApi/Test build ผ่าน

Frontend build ผ่าน โดยยังมี warning เดิมจาก critical CSS ที่หา stylesheet ใต้ dist/financial/assets ไม่พบ ไม่มีการแก้ deployment path ในงานนี้

React Doctor รอบล่าสุด 79/100 มี warnings เรื่อง array lookups ใน lists ขนาดเล็ก, loading reset ที่อยู่ใน finally แล้ว และ structuredClone ภายใน pure state updater ตรวจ source แล้วไม่เปลี่ยน calculation/undo logic เพื่อไล่คะแนนเครื่องมือ

Local runtime รอบสุดท้าย: backend กลับมาตอบสนองแล้ว Unauthenticated report-options ให้ 401; preflight `/api/reports?useTenant=prod` ให้ 200 และ CORS headers ข้อจำกัด IIS 404 จากรอบก่อนจึงไม่เป็น blocker ปัจจุบัน

ตรวจ authenticated workspace จริง: dropdown แสดง CarmenCloud/paresa; Reports สองกลุ่มโหลดสำเร็จ เปิด Balance Sheet Summary ของแต่ละ BU แล้ว company/period marker เปลี่ยนตาม BU (Carmen Hotel & Resorts เทียบกับบริษัท ภารีสา) และ paresa มีตัวเลข receivables โหลดได้ Refresh/reload ยังคงเลือกสอง BU

New Report เปิด destination dialog ที่มีสอง BU โดยยังไม่สร้างข้อมูล ตรวจ selected report highlight ใน Light/Dark แล้วคืน Light theme ตรวจ report selection แยก BU แม้ชื่อรายงานเหมือนกัน ไม่มี Combine report/view all

ยังไม่ได้สร้าง/แก้/ลบ/restore รายงานจริงหรือ revoke membership ใน runtime; write routing, destination, reportId collision, stale responses และ invalid tenant parameters ตรวจด้วย automated tests สิทธิ์ deny/revoke แบบ end-to-end กับผู้ใช้จำกัดสิทธิ์, DB reconciliation และ load/concurrency/p95/EXPLAIN ยังต้องตรวจตาม release acceptance ไม่มี deploy production

ข้อความ verification ในหัวข้อ 10 บันทึกผลวันที่ 8–9 ตุลาคมก่อนงาน shared/consolidated; สถานะใหม่วันที่ 12 ตุลาคมอยู่ต้นเอกสาร ส่วน FX/elimination ยังไม่ implement


Contract compatibility: tenantListIn ก่อน login คง behavior เดิม; dropdown หลัง login ใช้ UserName endpoint เดิม ไม่มี financialReport=true หรือ me/business-units endpoint; แต่ละ report request ใช้ useTenant และผ่าน authorization ที่ backend

ตรวจแก้ Access denied (2026-10-09): group lookup API เดิมตรวจ GL.AccountGrouping และ GL.DepartmentCategory แยกจาก Financial Report View เมื่อ optional lookup ส่ง 403 ให้เว้นรายการ group นั้นและโหลด report-master-data ต่อได้; 401/network/5xx และ report-master-data 403 ยังเป็น error ไม่ fallback ข้าม BU ไม่เพิ่มสิทธิ์หรือเปลี่ยน backend authorization
ตรวจแก้ BU inventory ของ admin (2026-10-09): UserName endpoint ต้องรองรับ tenant Connection ที่เป็น null/empty/whitespace หรือ JSON null และไม่ decrypt database username เมื่อไม่มี encrypted username; metadata ว่างไม่ใช่การอนุญาตอ่าน BU และ report authorization คงเดิม
