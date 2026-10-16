# Multi-BU Financial Comparison — Validation

ตรวจล่าสุด: 16 ตุลาคม 2026 (Asia/Bangkok)

สถานะ: implementation และ automated local validation ผ่าน; ยังไม่ผ่าน authenticated runtime acceptance และยังไม่ deploy

## Runtime local — 16 ตุลาคม 2026

โอมให้พักขั้นตอนตรวจ runtime ที่เหลือหลังพบข้อจำกัด membership; 2/5 BU ยังไม่ถือว่าผ่าน

- รัน IIS Express จาก source branch นี้ที่ `http://localhost:49249`; report-options ยืนยัน `multiBuComparison: true`
- Frontend local config ใช้ `/Carmen.LocalApi` ผ่าน Vite proxy ไป backend นี้ เพราะเรียกข้ามพอร์ตโดยตรงติด OPTIONS 405; production config ไม่เปลี่ยน
- Login และเรียก API จริงผ่าน session ใน browser โดยไม่แสดง token/credentials
- สร้างรายงาน QA แยก `qa-multi-bu-single-20261016` ใน CarmenCloud ผ่าน API มี 3 rows; รายงานเดิมไม่ถูกแก้
- DBX dev ยืนยันรายงาน QA นี้มี 3 rows; รายงาน QA multi-BU ที่ถูกปฏิเสธไม่มี rows ค้าง
- เทียบปี 2026 งวด 2: บัญชี 1011001 ได้ 852,197.39 และ 1021004 ได้ -770,000.00 ตรง SQL `SUM(Amt2)` จาก vglhis และ API source totals; สูตร R1-R2 ได้ 1,622,197.39, C1*2 และ Mix % คำนวณตรง
- Source read ของ owner BU ส่ง actualRows 6 records; legacy response 4,882 bytes, comparison response 8,532 bytes (ขนาด UTF-8 JSON ที่อ่านแล้ว ไม่ใช่ compressed wire bytes)

| API path | รอบแรก warm median (5 requests) | รอบยืนยัน warm median (5 requests) |
| --- | ---: | ---: |
| เส้นทางเดิม, 1 BU | 206.2 ms | 242.7 ms |
| Comparison, 1 BU | 235.5 ms | 216.2 ms |

แต่ละชุดเรียก 6 ครั้ง ตัดครั้งแรกออกจาก median; วัด browser fetch จนอ่าน body ผ่าน local Vite proxy รวม network/response parse overhead และเก็บ Server-Timing ของ backend ผลยังแปรปรวน และไม่มี baseline จาก binary ก่อนแก้ จึงยังยืนยันเกณฑ์ regression ไม่เกิน 10% ไม่ได้ ไม่ใช่การวัด UI Apply/render ทั้ง flow

ทดสอบ `carmencloud + paresa` ได้ HTTP 403 ก่อนอ่าน source financial data เพราะ paresa ไม่อยู่ใน membership ของ session/admin ที่ local backend ใช้ ต้องแก้ environment/membership ให้ถูกต้องก่อนตรวจคู่จริง ไม่ใช่เพียงเพิ่ม row mapping ไม่มีการเพิ่มสิทธิ์หรือข้าม authorization

พบและแก้ bug ขณะตรวจ: Add/Update/Batch/Clone report คืน UnauthorizedAccessException ผ่าน generic error handler เป็น 401 ทำให้ frontend ล้าง session ตอน source BU ถูกปฏิเสธ เพิ่ม catch เฉพาะให้คืน 403; compile C# และ 66 tests ผ่านซ้ำ ผล runtime source denial คืน 403 และเรียก report-options ต่อได้ด้วย session เดิม การสร้างรายงานที่อ้าง paresa ถูกยืนยันว่าเปลี่ยนจาก 401 เป็น 403 หลังแก้

Backend local ยังรันอยู่ ไม่มี production deployment รายงาน QA single-BU ยังอยู่เพื่อให้ตรวจย้อนหลังได้ ชุดหน้า HTML ทดสอบชั่วคราวถูกนำออกหลังหยุดตรวจ

## ผลตรวจล่าสุด

| รายการ | ผล | ขอบเขต |
| --- | --- | --- |
| Frontend regression | 35 files, 295 tests ผ่าน | รวม App integration, mapping review, comparison, API capability guard, Excel import guardrails และ engine เดิม |
| Frontend production build | ผ่าน | critical CSS มี selector warnings เดิม 10 รายการ; ไม่ใช่ build failure |
| Backend tests | 66 tests ผ่าน, ไม่มี skip | comparison policy, definition contract, tenant routing, query planner, access policy, financial query filters |
| Backend C# compile | ผ่าน | ใช้ temporary no-op WebApplication target นอก repo เพราะเครื่องขาด Microsoft.WebApplication.targets; ไม่ใช่การยืนยัน full web build/package |
| React Doctor changed files | ไม่พบ issues, score 80/100 | สแกน 20 files รวม untracked; คะแนนไม่ใช่การยืนยันทั้ง repository |
| Git whitespace checks | ผ่านทั้งสอง repo | มีเพียง LF/CRLF warnings ของ Git |
| Vite | listen 127.0.0.1:5174 | port 5174, strictPort=true; ตรวจ localhost HTTP 200 และ Login render ในรอบก่อนหน้า; ไม่เปลี่ยน port 5173 |

คำสั่ง frontend:

```powershell
bun run test -- --maxWorkers=2 --testTimeout=15000
bun run build
npx react-doctor@latest --verbose --scope changed --base HEAD --include-untracked
git diff --check
```

Backend ใช้ Visual Studio 2022 MSBuild compile Carmen.WebApi และ build Carmen.WebApi.Test แล้วรัน xUnit เฉพาะคลาส:

- ReportBuComparisonTests
- ReportDefinitionContractTests
- ReportTenantRoutingTests
- ReportDataQueryPlannerTests
- ReportAccessPolicyTests
- FinancialReportQueryFiltersTests

## หลักฐานพฤติกรรมจาก tests

- แต่ละ BU ใช้ template เดียวและ mapping ของตัวเอง; ไม่ต้องมี report สำเนาใน source BU
- C references อยู่ภายใน BU; Total คำนวณสูตรและเปอร์เซ็นต์ใหม่จากฐาน เช่น Profit 70 / Revenue 300 = 23.33%
- แยก notApplicable (แสดงขีด) จากไม่มี transaction (ศูนย์); ไม่ยอม Apply mapping ที่ไม่พร้อม
- ข้อเสนอ mapping ต้องตรงและไม่กำกวม; ต้องยืนยันก่อนใช้งาน; ตรวจ master ที่ถูกลบและ scope ของ dimension
- สลับ Total ไม่ fetch ซ้ำ; response เก่าไม่ทับ snapshot ใหม่; ล้มเหลวแล้วเก็บ snapshot เดิม
- Save/create/batch ที่มี buMappings ต้องตรวจ `/api/report-options` ว่าส่ง `multiBuComparison: true` ก่อน mutation; backend เก่าถูกปฏิเสธเพื่อป้องกัน mapping หาย
- Backend ตรวจสิทธิ์ source BU ทั้งหมด, currency/fiscal calendar compatibility และ budget scopes
- Export HTML รักษาหัวกลุ่ม BU, newline และเปอร์เซ็นต์; regression ของ Excel import เดิมผ่าน

## Browser และฐานข้อมูลที่ตรวจไปแล้ว (15 ตุลาคม)

- Fixture UI ใช้ component จริง: desktop และ viewport 390px, 2/5 BU, horizontal scroll, bulk confirm และแก้ mapping/notApplicable
- ตรวจ overflow และหัวคอลัมน์; ไม่พบ document overflow ใน fixture ที่ตรวจ
- DBX read-only ตรวจ RowJson เป็น longtext และ currency metadata ตัวอย่าง; ไม่มี database write
- ตัวอย่างฐานข้อมูลอยู่คนละ admin scope จึงไม่ใช่หลักฐานการเทียบยอดหลาย BU จริง
- ไม่ได้ยืนยัน end-to-end หลัง login ด้วย backend ใหม่ และไม่ได้เปิดผล export ใน Microsoft Excel หรือดู printed output จริง

## Checklist ก่อน pilot

- [ ] เตรียม backend รุ่นใหม่ใน local/staging ที่เข้าถึงได้ และยืนยัน capability flag
- [ ] ใช้ account มี Financial Report View อย่างน้อย 2 BU ใน admin scope เดียวกัน; Setup เฉพาะ owner report
- [ ] สำรอง report definitions ก่อนบันทึก mapping ใหม่
- [ ] Setup → bulk confirm/แก้ข้อยกเว้น → save → reload → View → Apply และเทียบยอด SQL ผ่าน DBX ด้วยช่วงเวลา/filters เดียวกัน
- [ ] ตรวจ forbidden source BU, mapping/master เปลี่ยน, currency/calendar ต่างกัน และ failure โดยไม่มี partial result
- [ ] วัด baseline/response size/request count/Apply time 1/2/5 BU; single-BU median ไม่ช้าลงเกิน 10%; ตรวจ Server-Timing ต่อ source
- [ ] เปิด export ใน Excel จริง ตรวจหัวกลุ่ม/format/สูตรที่แสดง และ print preview/PDF ทุก BU โดย Description ไม่หาย
- [ ] ทดสอบ rollback frontend โดยคง backend ที่รักษา buMappings ได้

## ข้อจำกัดและ rollout

Total รองรับฐานที่บวกกันได้ และ ratio/average ที่เขียนเป็นสูตรจากฐาน รายการสถิติที่เป็นค่าเฉลี่ยสำเร็จรูปยังไม่มี metadata พอให้ตรวจและปิด Total อัตโนมัติ ต้อง review report ก่อนเปิด Total; ห้ามถือว่า Total ใช้ได้กับทุก report

Frontend local ปัจจุบันใช้ backend branch นี้ที่ localhost:49249 ผ่าน Vite proxy สำหรับการตรวจ; production rollout ยังต้อง deploy backend ก่อน frontend ตามแผน โดยมีการอนุมัติ deployment แยกต่างหาก

ไม่มี commit/push/production deployment หรือ database migration; มีเพียงการสร้างรายงาน QA single-BU ผ่าน API ตามรายการด้านบน
