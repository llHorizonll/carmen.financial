# แผน implementation: Shared templates และ consolidated management reporting

วันที่ 12 ตุลาคม 2026 · อ้างอิง `consolidated-financial-report-readiness.md`

## Branch และขอบเขต

- Frontend: `codex/consolidated-financial-report` สร้างจาก local `phase3`
- Backend: `codex/consolidated-financial-report` สร้างจาก local `codex/phase2`
- เอกสาร readiness ที่ยังไม่ commit ถูกเก็บไว้บน frontend branch ใหม่; backend working tree สะอาดก่อนสร้าง branch ไม่มี commit/push/deploy ในรอบวางแผน
- เริ่มระดับ 1: shared templates, per-BU mapping, same-currency consolidation และ dashboard ที่ใช้ผลรายงานชุดเดียวกัน ไม่รวม FX/elimination/ownership หรือการ replicate `glhis`/`jv`

## 1. Central storage และ lifecycle

- เก็บ shared definition, participating tenants, mappings, access และ version/history ใน Carmen Admin DB ภายใต้ signed admin scope ใช้ report definition shape และ lifecycle rules เดิมเป็นฐาน
- แยก storage/API ของ shared templates จาก tenant reports เพื่อไม่ให้ owner tenant, CRUD, history และ `useTenant` เดิมเปลี่ยนความหมาย
- ใช้ stable mapping row key แยกจาก positional `R#`; column source อ้าง tenant identifiers ไม่ใช่ชื่อแสดงผล Clone ต้องคัดลอก binding ให้สัมพันธ์กับ row keys ใหม่
- Save config/mapping/access พร้อม history ใน transaction และใช้ optimistic concurrency; restore ต้องตรวจ schema, mappings และสิทธิ์ปัจจุบันก่อนใช้งาน
- ก่อนเขียน migration ตรวจ Admin DB conventions และขอบเขต admin database จริง; migration ต้องมี apply/rollback และทดสอบใน dev ก่อน ห้ามใช้ tenant install script กับ Admin DB โดยไม่ตรวจ target
- Shared view/edit access ไม่ทำให้ได้สิทธิ์อ่าน BU เพิ่ม ผู้ที่ดูผลต้องผ่าน active membership + Financial Report View ทุก BU ที่ template ใช้; write ต้องผ่าน shared edit policy

## 2. Tenant queries และ consolidated data contract

- แยกส่วน query ที่จำเป็นจาก `FncReportV2` ให้รับ tenant context และ mapping อย่างชัดเจน ใช้ wrapper เดิมสำหรับรายงานหนึ่ง BU; ไม่เปลี่ยน principal/Tenant claim กลางระหว่าง parallel workers
- Query `glhis` หรือ `jv` ตาม business rules ของชนิดรายงานเดิม Filter/aggregate ใน Tenant DB ด้วย decimal และ independent connections จำกัดเริ่มต้นสอง BU พร้อมกัน ตรวจ cancellation/timeouts
- Aggregate ต่อ stable report row และ data column ตาม per-BU mapping ก่อนรวม; ใช้ per-BU values ชุดเดียวสำหรับ breakdown และ combined scope ไม่จับคู่ account codes ข้าม BU โดยตรง
- Data columns เลือก scope ได้เป็น tenant เดียวหรือ participating tenants ทั้งหมด; Formula columns ใช้ `C#` ตามเดิม Row formulas ใช้ `R#` ตามเดิม ไม่เพิ่ม syntax ชื่อ BU ในสูตร
- Reuse `buildReportData` โดยเพิ่มทางเข้าของ mapped base values สำหรับ shared mode แล้วใช้ row formulas → column formulas → percentages ตามเดิม ไม่ส่ง final per-BU percentages มารวม ไม่สร้าง formula engine อีกชุดใน backend
- Contract ใหม่ต้องระบุ config/mapping version, filters, requested/included tenants, completeness, warnings, per-BU base values และ combined base values; กำหนด endpoint/DTO จริงก่อนเชื่อม frontend โดยไม่แก้ single-BU response
- Authorization failure reject ทั้ง request; data unavailable แสดง incomplete พร้อม missing BUs ห้ามใช้ศูนย์แทน source ที่ล้มเหลวหรือคำนวณ cell ที่อ้างว่าครบทั้งกลุ่ม
- ตรวจ currency/date-range/scenario/sign compatibility ก่อน calculate; v1 block incompatible configuration ไม่มี implicit FX conversion

## 3. Shared reports จาก sidebar, setup และ dashboard

- ปุ่ม Shared reports ใน sidebar เปิด central workspace โดยไม่เปลี่ยน BU selection หรือทิ้ง draft; ไม่มี view all ใน BU dropdown การเปิด template ใช้ participating tenants ที่บันทึกไว้
- แยก report identity แบบ shared ออกจาก `(tenant, reportId)` และแยก draft/loading/history state ไม่ให้ shared mode fallback ไป login BU
- New shared template เก็บส่วนกลาง; regular report ยังเลือก destination BU เดียวตามเดิม
- เพิ่ม mapping editor เลือก BU แล้ว reuse tenant-scoped account/department/group/dimension selectors มี explicit not-applicable ต่อ Data row; Formula/Total rows ใช้สูตรกลาง
- เพิ่ม column source selector, mapping readiness และ per-BU preview พร้อมตรวจ overlapping mappings โดย reuse warning logic เดิม รายการซ้ำที่ตั้งใจต้องแจ้งชัดก่อน save
- ย้าย/ลบ rows และ columns ต้องรักษา mappings, source scopes และ smart formula reference syncing; pending/dirty writes ใช้ guard เดิม
- Report/Excel/print แสดง BUs และ completeness/warnings; dashboard KPI อ้าง stable row/column keys ของ calculated result เดียวกัน ไม่ใช้ position เป็น binding
- ก่อนเขียน UI ใช้ Astryx discovery และ project UI skills ตามกฎ repository; ไม่เปลี่ยน import behavior หรือทำ shell redesign

## 4. Verification และ rollout

- Fixture: Room Revenue CarmenCloud 100,000 + paresa 80,000 = 180,000; F&B 20,000 + 30,000 = 50,000; row total `R1+R2` = 230,000; ตรวจทั้ง combined scope และ `C1+C2`
- Ratio fixture: profit 10/100 และ 90/300 ให้ combined margin 25%; ตรวจไม่ double count combined/per-BU scopes หรือ `glhis`/`jv`
- Mapping tests: stable keys หลัง reorder/clone/restore, same codes ต่าง BU, missing/not-applicable/overlap, wrong tenant source และ incompatible currency/period/scenario
- Security/lifecycle: shared ACL, cross-admin isolation, revoked membership, hidden BU, version conflicts และ atomic save/history; malformed source mappings ต้องถูก reject ที่ backend
- Failure tests: timeout/partial/stale/cancel ไม่กลายเป็น complete หรือ zero; dashboard/report/export มีผลและสถานะตรงกัน
- รัน frontend tests ที่เกี่ยวข้อง รวม Excel import, fixtures, reportLogic และ ReportView ตาม guardrails; backend policy/query/lifecycle tests และ builds ทั้งสอง repository หลังแต่ละ phase สมบูรณ์
- Dev reconciliation ต้องเทียบ actual/budget กับรายงานเดี่ยวของแต่ละ BU; วัด p95/concurrency/admin authorization load ก่อนกำหนด SLA และ release
- Rollout: dev migration → backend shared API → frontend ตรวจ capability ก่อนแสดง Shared mode → acceptance → production change แยกต่างหาก Rollback frontend/backend ก่อนพิจารณาถอด tables; เก็บ definitions/history ที่มีข้อมูลไว้เพื่อไม่ทำข้อมูลสูญหาย

## จุดที่ต้องปิดก่อน implementation ที่เกี่ยวข้อง

- Admin storage conventions, permission policy ของ shared editors, stable identifiers ที่เข้ากับ reference syncing และ endpoint/DTO contract ต้องตรวจ/กำหนดในงานออกแบบ phase 1 ไม่ใช่ข้อเท็จจริงที่มีอยู่แล้ว
- เลือกรายงาน/BU dev และ expected totals สำหรับ reconciliation พร้อม currency, sign, fiscal calendar และ budget scenario policies ที่ฝ่ายบัญชียืนยัน
- ตั้ง SLA จาก workload จริง; ไม่เพิ่ม cache/reporting store หรือ index ก่อนมีผลวัด

## สถานะ implementation วันที่ 12 ตุลาคม 2026

มี source implementation ของ central lifecycle/ACL/version/history, schema scripts, explicit tenant query contexts, shared mapping/setup, calculation และ dashboard KPI แล้วบน branch ทั้งสอง repository API contract และผล verification ปัจจุบันดูต้นเอกสาร readiness

Frontend 280 tests และ backend 77 tests ผ่าน พร้อม builds และ browser fixtures ของ table/dashboard/export/print/mobile ไม่มีการ apply migration, เขียนข้อมูลจริง, commit/push หรือ production deploy ยังต้องตรวจ Admin DB migration/lifecycle, authenticated revoke/isolation, DB reconciliation และ workload/SLA จริงก่อน release

Defaults ที่ใช้: group selections เป็น code snapshots; budget revisions ต้องมี semantics ตรงกันและยืนยันผ่าน config (ยังไม่ remap); query cancellation ตรวจระหว่าง batches ส่วน SQL ที่กำลังทำใช้ provider timeout; calculation reuse JavaScript engine เดิม จึงต้อง reconcile decimal/rounding ก่อน accounting acceptance

อัปเดต 14 ตุลาคม 2026: โอมแจ้งว่า apply migration ใน Admin DB แล้ว เปลี่ยนทางเข้าเป็น Shared reports ใน sidebar และเอา view all ออก การตรวจ migration/schema/lifecycle กับ DB จริงยังไม่ได้ทำโดย agent
