# Multi-BU Financial Comparison

วันที่: 15 ตุลาคม 2026  
สถานะ: Implement ใน local branch แล้ว — กำลังตรวจรับก่อน deployment  
แทนที่: แผน Combined BU Reporting วันที่เดียวกัน

## สถานะการส่งมอบ

อัปเดตผลตรวจ local: 16 ตุลาคม 2026 — frontend 295 tests / 35 files, build ผ่าน; backend 66 tests และ C# compile ผ่าน; React Doctor ไม่พบ issue ใน changed files ดู [ผล validation](./2026-10-15-multi-bu-financial-comparison-validation.md)

Runtime 16 ตุลาคม: รัน backend branch นี้ที่ localhost:49249 แล้ว; CarmenCloud 1 BU เทียบ SQL ผ่านและวัดเวลาเบื้องต้นแล้ว คู่ CarmenCloud/paresa ได้ 403 เพราะ membership ของ local backend ไม่มี paresa โอมให้พักการตรวจ runtime ที่เหลือไว้ก่อน จึงยังไม่ยืนยัน 2/5 BU หรือ production readiness มีรายงาน QA แยก `qa-multi-bu-single-20261016` สำหรับตรวจย้อนหลัง

- [x] Frontend: Mapping Review, ข้อเสนอจับคู่/ยืนยันเป็นชุด, BU/Department filter, ตารางหัวกลุ่ม BU และ optional Total
- [x] Backend: บันทึก mapping ใน RowJson, authorize ทุก source BU, อ่านข้อมูลด้วย template เจ้าของโดยไม่ต้องมี report สำเนา
- [x] เพิ่ม `includeMappingGroups=true` ใน master-data API สำหรับ lookup ภายใต้ Financial Report View โดยไม่ต้องมีสิทธิ์จัดการ Account/Department Group
- [x] ก่อน create/save/batch ที่มี buMappings ตรวจ capability `multiBuComparison: true` จาก report-options เพื่อกัน backend เก่าทิ้ง mapping โดยไม่แจ้ง
- [x] Vite ใช้ 127.0.0.1:5174 และ strictPort; ไม่กระทบ project ที่ใช้ 5173
- [x] Export หัวกลุ่ม BU และ print layout แยกกลุ่มพร้อม Description
- [x] Browser ตรวจ component ด้วยข้อมูลจำลอง: 2/5 BU, จอ desktop/390px, bulk confirm และ mark not applicable
- [x] DBX read-only ตรวจพบ RowJson เป็น longtext และตรวจ metadata currency จากตัวอย่างฐาน dev; ไม่มี write/migration
- [ ] Authenticated runtime กับ backend ใหม่และข้อมูล 2 BU ภายใต้ admin scope เดียวกัน พร้อมเทียบยอด SQL
- [ ] วัด performance API จริง 1/2/5 BU และตรวจ printed output จริง
- [ ] Backup, deployment และ production acceptance

เครื่องนี้ขาด Microsoft.WebApplication.targets จึงตรวจ compile C# ด้วย temporary no-op WebApplication target นอก repo แทนการ build/package เว็บเต็มรูปแบบ ไม่ได้เปลี่ยน project เพื่อข้ามข้อจำกัด และยังไม่ยืนยัน deployment

Comparison ใช้ตารางความหนาแน่นคงที่เพื่อให้หัว BU และตัวเลขตรงกัน; zoom control เดิมยังใช้กับรายงาน BU เดียว ส่วน comparison ใช้ horizontal scroll

Checklist ด้านล่างเป็นเกณฑ์ตรวจรับทั้งหมด ไม่ใช่การยืนยันว่าทดสอบ production แล้ว รายงานผลตรวจ local ดู `2026-10-15-multi-bu-financial-comparison-validation.md`

## 1. เป้าหมายและขอบเขต

ให้คนที่คุ้นเคยกับ Excel เปิด financial report เดิม เลือกหลาย BU แล้วเปรียบเทียบตัวเลขข้างกันได้ โดยไม่สร้าง report สำเนา ไม่สร้างคอลัมน์ต่อ BU เอง และไม่ map ทุก BU ใหม่ตั้งแต่ต้น

**Flow หลัก:** เปิด report → เลือก BU → Apply → ดูแต่ละ BU ข้างกัน

**การตั้งค่าครั้งแรก:** ผู้มีสิทธิ์ Setup ตรวจข้อเสนอ mapping เป็นตาราง ยืนยันรายการที่ตรงกันเป็นชุด และแก้เฉพาะข้อยกเว้น เมื่อบันทึกแล้วผู้ดูรายงานไม่ต้องเข้า Setup อีก

### ข้อตกลง

- Compare เป็นพฤติกรรมหลักเมื่อเลือกหลาย BU; เลือก BU เดียวใช้หน้าตาเดิม
- Total เป็นตัวเลือกปิดไว้เริ่มต้น เปิดแล้วเพิ่มกลุ่มคอลัมน์รวมท้ายตาราง
- ใช้ชุดคอลัมน์ที่มองเห็นของ report เดิมซ้ำภายใต้แต่ละ BU ไม่เพิ่ม physical columns ใน Setup
- Report, layout, สูตร และสิทธิ์แก้ไขอยู่ใน BU เจ้าของเดิม
- โอมอนุญาตให้ปรับ backend เท่าที่จำเป็นแล้ว
- V1 ใช้สกุลเงินเดียวและ fiscal calendar ที่เข้ากันได้ ไม่แปลงสกุลเงิน
- ไม่ทำ FX, intercompany elimination, ownership, consolidation adjustments หรือสูตรเปรียบเทียบข้าม BU แบบอิสระ
- ไม่เพิ่ม AI/fuzzy matching, mapping กลางข้ามทุก report, หรือ workflow นำเข้าใหม่ใน V1
- ไม่บังคับเลือก source report ของแต่ละ BU; ใช้ template ต้นทางกับข้อมูลบัญชีของแต่ละ BU โดยตรง

แนวทางนี้แทนแผนเดิมที่เน้น A+B เป็นค่าเริ่มต้น และแทนข้อจำกัด “ไม่มี combine report” ใน readiness เดิมเฉพาะระยะใหม่นี้ ไม่เปลี่ยน scope งานที่เสร็จแล้ว

### Branch และจุดเริ่มต้น

| Repo | Branch งาน | Branch ต้นทาง | Commit ต้นทาง |
| --- | --- | --- | --- |
| Frontend | `codex/multi-bu-financial-comparison` | `phase3` | `c2e9954` |
| Backend | `codex/multi-bu-financial-comparison` | `codex/phase2` | `470b89c4` |

เปลี่ยนชื่อ branch ทั้งสอง repo ให้ตรงกับฟีเจอร์ Multi-BU Financial Comparison แล้ว ทั้งสอง repo clean ก่อนสร้าง branch แยก

## 2. ประสบการณ์ผู้ใช้และ Mapping

### View: ใช้งานเหมือนตาราง Excel

- [ ] Titlebar ยังคุมขอบเขต BU สำหรับ navigation; BU filter ใน report เลือก BU ที่จะนำมาเทียบจริง
- [ ] Filter แสดง BU ที่เลือกใน titlebar และมีสิทธิ์อ่าน พร้อมสถานะ พร้อม / ยังไม่ได้ตั้งค่า / ต้องตรวจ mapping
- [ ] เข้า report ครั้งแรกเลือก BU เจ้าของถ้าเลือกได้ มิฉะนั้นเลือก BU แรกที่พร้อม; ไม่เลือกทุก BU อัตโนมัติ
- [ ] ต้องเลือกอย่างน้อยหนึ่ง BU; เลือกหลาย BU แล้วจัดกลุ่มคอลัมน์ตาม BU โดยอัตโนมัติ
- [ ] เรียง BU เจ้าของก่อนถ้าถูกเลือก ตามด้วยลำดับใน BU catalog; Total อยู่ท้าย
- [ ] หนึ่ง BU แสดงชุดคอลัมน์เดิม เช่น Actual / Budget / Variance / Mix % โดยไม่ให้ผู้ใช้สร้างซ้ำ
- [ ] รักษาหัวคอลัมน์หลายบรรทัดเดิม แล้วเพิ่มหัว BU เหนือขึ้นไปอีกชั้น
- [ ] ใช้ Description ร่วมกันหนึ่งคอลัมน์และ freeze ทางซ้าย เลื่อนแนวนอนเพื่อดู BU เพิ่ม
- [ ] ใช้ช่อง Department filter เดิม โดยจัดรายการแยก BU และเก็บค่าคู่ tenant/code; ค่าเริ่มต้น All ไม่เพิ่มข้อจำกัดเหนือ row mapping
- [ ] เปลี่ยน BU แล้วตัดค่า filter ที่ใช้ไม่ได้ออก แต่ไม่ลบ mapping; ต้อง Apply ใหม่ก่อนเปลี่ยนผลลัพธ์
- [ ] จดจำ BU ที่เลือกและ Total toggle ต่อผู้ใช้/report ใน browser; ไม่เขียน preferences การดูลง report definition และต้องตรวจสิทธิ์ใหม่เมื่อ restore
- [ ] Apply แสดง snapshot ของ BU/filters ล่าสุด; เปลี่ยนตัวเลือกค้างไว้ต้องไม่ทำให้ header อ้างว่าเป็นข้อมูลชุดใหม่
- [ ] ผู้ดูเห็นสถานะ mapping ที่ไม่พร้อม พร้อมคำแนะนำให้ผู้ดูแลตั้งค่า; ผู้มี Setup เปิดหน้า review ต่อได้

ตัวอย่างกรณี report มี Actual เพียงคอลัมน์เดียว และผู้ใช้เปิด Total:

| รายการ | BU A | BU B | BU C | Total |
| --- | ---: | ---: | ---: | ---: |
| Revenue | 100 | 200 | 300 | 600 |
| Expense | 80 | 150 | 210 | 440 |
| Profit | 20 | 50 | 90 | 160 |
| Margin | 20% | 25% | 30% | 26.67% |

ถ้า report มี Actual/Budget/Variance จะได้ `BU A [Actual | Budget | Variance]`, `BU B [...]` และ optional `Total [...]` โดยไม่เพิ่มสูตรใหม่ใน template

### Setup: ช่วยจับคู่ แล้วแก้เฉพาะข้อยกเว้น

- [ ] เพิ่มหน้า Mapping Review เป็นตาราง: แถวคือบรรทัดรายงาน คอลัมน์คือ BU แสดงรหัสที่ map และสถานะ
- [ ] เลือก cell เพื่อแก้ Account/Department/Group/Dimension ด้วย selector เดิมที่ระบุ BU ชัดเจน
- [ ] ปุ่มตรวจข้อเสนอเป็นชุดให้ยืนยันเฉพาะรายการที่จับคู่ชัดเจน; มีตัวกรองแสดงเฉพาะรายการต้องตรวจ
- [ ] Report เก่าใช้ mapping เดิมเป็นฐานของ BU เจ้าของ ไม่ต้องตั้งค่าใหม่
- [ ] สร้างข้อเสนอให้ BU ใหม่จากรหัสตรงกัน ตรวจชื่อและประเภทบัญชีประกอบ; ชื่อเทียบแบบ trim/case-insensitive ไม่ใช้ชื่ออย่างเดียวจับคู่
- [ ] ชื่อหรือประเภทไม่ตรง รหัสหาย หรือมีหลาย candidate ให้เป็น “ต้องตรวจ” ไม่ยืนยันอัตโนมัติ
- [ ] Group ต้องตรวจความหมายและสมาชิกด้วย; Dimension ต้องตรวจ definition/ความหมายและรหัส ไม่ถือว่า dim1 ตรงกันเพราะตำแหน่งเดียวกัน
- [ ] ข้อเสนอทั้งหมดยังไม่ active จนผู้มีสิทธิ์ยืนยันเป็นชุดหรือแก้และบันทึก; ห้ามแอบ copy mapping ใหม่ในจังหวะ View
- [ ] ถ้าต้นทางไม่จำกัด Department/Dimension ให้รักษาความหมาย All; ถ้าจงใจไม่ใช้ BU นั้นในบาง row ให้ผู้ตั้งค่าระบุ “ไม่ใช้กับ BU นี้” อย่างชัดเจน
- [ ] แต่ละ data row ต้องยืนยัน mapping ครบหรือระบุไม่ใช้ก่อน BU นั้นพร้อมดู; Header/Formula/Total ไม่ต้อง map ใหม่
- [ ] แยก “ยังไม่ map”, “ไม่ใช้กับ BU นี้” และ “map แล้วแต่ไม่มี transaction”; ไม่แทนทั้งหมดด้วยศูนย์
- [ ] ใช้ tenant เป็นส่วนของ identity ทุก mapping และตรวจ mapping ซ้ำ/Group-versus-codes แยกต่อ BU
- [ ] บันทึก mapping ครั้งเดียวต่อ report แล้ว reuse; เปลี่ยน titlebar ไม่ลบ mapping
- [ ] เมื่อแก้ row mapping ให้คำนวณสถานะ readiness ใหม่; source master ที่เปลี่ยนจนรหัสใช้ไม่ได้ต้องเตือนและ block BU นั้นจนแก้
- [ ] Save/load/clone/history รักษา mapping และสถานะการยืนยัน; localStorage ไม่เป็น authoritative storage ของ mapping

## 3. Backend, Engine และการแสดงผล

จุดหลัก: frontend API/adapters, mapping components, report calculation/render/export; backend ReportV2 controller/functions/DTOs ใช้ component/token workflow ของ repo และไม่ขยาย App.jsx เกินจำเป็น

### API และ Persistence

จาก source ปัจจุบัน `/api/report-data` ค้น report และใช้ mapping ของ tenant ใน request จึงเรียก BU B ด้วย report ID ของ A ตรง ๆ ไม่ได้

- [ ] เพิ่ม optional `buMappings` ใน row DTO เก็บ tenant, mapping fields เดิม และสถานะยืนยัน/ไม่ใช้
- [ ] ใช้ RowJson เดิม ตรวจเส้นทาง deserialize/serialize/adapters ก่อนยืนยันว่าไม่ต้อง schema migration
- [ ] เก็บ mapping เก่าของ owner เป็น baseline; การอ่าน definition เก่ายังให้ผลเดิมและไม่ต้อง bulk migration
- [ ] ขยาย `/api/report-data` ด้วย optional `sourceTenants` และ department filters ที่ระบุ tenant; request เดิมคง behavior/response เดิม
- [ ] ใช้ `useTenant` เป็น BU เจ้าของ report อ่าน definition จากเจ้าของครั้งเดียว แล้วใช้ mapping ที่บันทึกไว้ดึง source data แต่ละ BU
- [ ] Response แบบหลาย BU แยก datasets และ metadata ตาม tenant ไม่ flatten จนสูญเสีย identity
- [ ] Server ตรวจสิทธิ์ดู report ต้นทาง และ active membership + Financial Report View ทุก source BU; client ส่งรหัส BU มาไม่ได้แปลว่ามีสิทธิ์
- [ ] แก้ mapping ต้องมี Setup ของ owner และ View ของ source BU ไม่ต้องมี Setup ของ source BU
- [ ] ใช้ DB context แยก BU ไม่สลับ shared principal/session ระหว่างงานขนาน
- [ ] ตรวจ readiness ของ saved mapping ฝั่ง server ด้วย ไม่รับ unconfirmed mapping จาก View request
- [ ] ตรวจ currency, fiscal calendar/period และ Budget Revision ของทุก BU ไม่ fallback เงียบ ๆ; metadata ไม่พอให้แจ้งว่าไม่พร้อมเปรียบเทียบ
- [ ] BU ใด timeout/ไม่มีสิทธิ์/metadata ไม่พร้อม ให้ Apply ทั้งชุดล้มเหลว พร้อมเหตุผลแยก BU; ไม่เผยแพร่ผลบางส่วนหรือ Total ไม่ครบ
- [ ] เมื่อ Apply ล้มเหลวอาจคงผลสำเร็จล่าสุดไว้ แต่ต้องระบุว่าเป็นผลเดิม และไม่แทน header/filters ของผลเดิมด้วยชุดที่ล้มเหลว

### Engine และ Formula References

- [ ] Compare: คำนวณ 4 pass แยกต่อ BU ด้วย template เดียว แล้วนำผลมาเรียงข้างกัน
- [ ] คง R/C references ใน template เดิม สูตร C1-C2 ต้องอ้างภายใน BU เดียวกัน ไม่เลื่อนไป BU ถัดไป
- [ ] ใช้ identity สำหรับ rendered cell เป็น tenant + row ID + template column ID; ไม่เพิ่ม physical columns หรือ renumber template
- [ ] Total: รวมข้อมูลฐานที่ผ่าน mapping ของแต่ละ BU แล้วคำนวณ 4 pass ใหม่; ไม่บวกผล Formula/Mix % ที่คำนวณเสร็จแล้ว
- [ ] ข้อมูลแต่ละ BU ต้องผ่าน mapping ของตัวเองก่อนรวม ห้ามนำ source rows ของ B ไป match กับ mapping ของ A
- [ ] สำหรับค่าเฉลี่ย/ratio ใช้สูตรจากตัวตั้งและตัวหาร; ไม่ SUM ค่าเฉลี่ยสำเร็จรูป ถ้า report ไม่มีฐานที่พอคำนวณ Total อย่างถูกต้อง ให้ระบุ Total ไม่รองรับพร้อมเหตุผล
- [ ] หนึ่ง BU ใช้ output และสูตรเดิม รวม hidden columns ที่เป็น dependency ของสูตร
- [ ] “ไม่ใช้กับ BU นี้” แสดงขีดและมีค่า contribution เป็นศูนย์; “ยังไม่ map” ไม่อนุญาตให้ BU นั้น Apply

### Excel / Print

- [ ] Export รูปแบบตารางที่ผู้ใช้เห็นจริง มีหัวกลุ่ม BU และคอลัมน์เดิมใต้แต่ละกลุ่ม รวม Total เฉพาะเมื่อเปิด
- [ ] รักษา newline, Total styling, indent, ตัวเลขและเปอร์เซ็นต์ตาม theme/report เดิม
- [ ] Print ใช้ผล Apply ล่าสุด ระบุ BU, currency และช่วงเวลา; ตารางกว้างแบ่งแนวนอนตามกลุ่ม BU พร้อม Description ซ้ำ ไม่ย่อจนตัวเลขอ่านไม่ได้
- [ ] จำกัดการเปลี่ยน export/print เฉพาะที่จำเป็นสำหรับ comparison; Excel import เดิมต้องไม่เปลี่ยน

### Performance

- [ ] เก็บ baseline เวลา Apply, response size และ request count สำหรับ 1/2/5 BU
- [ ] Reuse master data ตาม tenant/year ภายใน session และจำกัด source reads พร้อมกันเริ่มต้นที่ 2 BU
- [ ] Cache key รวม user, owner tenant/report/version, source tenants และ data filters; view preferences ต้องไม่ทำให้ใช้ข้อมูลผิด scope
- [ ] Toggle Total ใช้ dataset ของ Apply ล่าสุดโดยไม่ fetch ซ้ำเมื่อ dataset รองรับ
- [ ] กัน response เก่าทับชุดใหม่เมื่อเปลี่ยน report/filters หรือ session
- [ ] วัด query timing ต่อ BU และ render cost ของตารางกว้าง ไม่ log token/ข้อมูลการเงิน
- [ ] ไม่เพิ่ม dependency/index/refactor engine นอก scope ถ้าไม่มีหลักฐานจำเป็น

## 4. Checklist ทดสอบและเกณฑ์รับงาน

### ลดงานตั้งค่าของผู้ใช้

- [ ] Report ที่ COA/Department/Dimension ตรงกันทั้งหมด ตั้งค่า BU ใหม่ผ่าน review และยืนยันเป็นชุดได้ ไม่ต้องเปิดแก้ทีละ row
- [ ] ข้อมูลต่างกันแสดงเฉพาะข้อยกเว้นพร้อมเหตุผล ไม่เลือก candidate ที่กำกวมเอง
- [ ] หลัง setup ครั้งแรก ผู้มี View เปิด report → เลือก BU → Apply ได้โดยไม่เข้า Setup
- [ ] ไม่ต้องสร้าง report สำเนา คอลัมน์ หรือสูตรเพิ่มเติมต่อ BU
- [ ] Save/reload/clone/history รักษา mapping; ถอน BU จาก titlebar แล้วเลือกกลับไม่สูญเสีย mapping
- [ ] Preferences ของผู้ดูไม่แก้ template และ restore แล้วตรวจสิทธิ์ใหม่

### ตัวเลขและสูตร

- [ ] ทุก cell ของ BU A/B ใน Compare เท่ากับเปิด BU เดียวด้วย template/mapping/filters เดียวกัน
- [ ] A Revenue 100, Expense 80 และ B Revenue 200, Expense 150 → Compare แสดง Profit 20/50 และ Margin 20%/25%
- [ ] เปิด Total ได้ Revenue 300, Expense 230, Profit 70 และ Margin 23.33%; ปิด Total แล้วผล BU เดิมไม่เปลี่ยน
- [ ] Actual/Budget/Variance/Mix % ใช้ C references ภายใน BU ถูกต้อง แม้เพิ่ม/ลด/เปลี่ยนลำดับ BU
- [ ] Row formula, hidden-column dependencies, !REF!, prior year, YTD และ Daily ไม่ถดถอย
- [ ] Account/Department รหัสเหมือนกันแต่คนละ BU ไม่ปะปน; A ใช้ 4100 และ B ใช้ 5100 อยู่ row เดียวกันได้
- [ ] Group/Dimension คนละความหมายแม้รหัสหรือ slot เหมือนกันต้องถูกตรวจพบ
- [ ] Unmapped ไม่เป็นศูนย์; confirmed mapping ที่ไม่มี transaction เป็นศูนย์; explicitly not-applicable เป็นขีด
- [ ] ต่าง currency/calendar, metadata ไม่พอ หรือ revision ใช้ไม่ได้ ต้อง block พร้อมเหตุผล

### UI, Export และ Failure

- [ ] 1 BU หน้าตาเดิม; 2/5 BU มีหัวกลุ่มถูกต้อง Description ค้างซ้ายและเลื่อนแนวนอนได้
- [ ] Multiline labels เช่น TODAY\nActual, M-T-D, Y-T-D ยังถูกต้องใต้หัว BU
- [ ] Filter เปลี่ยนค้างไว้ไม่เปลี่ยน header ของผลเก่าจน Apply สำเร็จ
- [ ] เปลี่ยน BU แล้ว Department selections ไม่รั่วข้าม BU; ไม่มี BU ที่เลือกต้อง Apply ไม่ได้
- [ ] Excel มีจำนวน/ลำดับกลุ่มและตัวเลขตรงหน้าจอ รวมเฉพาะ Total ที่เปิด
- [ ] Print หลาย BU อ่านได้ แสดง Description กับกลุ่มที่ถูกต้อง และ report เดี่ยวไม่ถดถอย
- [ ] Timeout/403/source ล้มเหลวไม่แสดง snapshot ใหม่ที่ไม่ครบ และไม่ export ผลเก่าภายใต้ชื่อ filters ใหม่
- [ ] เปลี่ยน report/filter รวดเร็วแล้ว response เก่าไม่ทับผลล่าสุด

### Security และ Verification

- [ ] View-only ดูได้แต่ยืนยัน mapping ไม่ได้; owner Setup ไม่ทำให้ได้สิทธิ์ source BU อัตโนมัติ
- [ ] ปลอม source tenant/owner report หรือส่ง BU ที่ไม่มี mapping ถูก server ปฏิเสธ
- [ ] ถอน membership/permission หลังตั้งค่าแล้ว request ใหม่ถูกปฏิเสธ ไม่อ่าน cache ข้ามสิทธิ์
- [ ] Concurrent requests ไม่ทำให้ tenant context ข้ามกัน; session หมดอายุใช้ flow เดิม
- [ ] เพิ่ม tests สำหรับ mapping suggestions/readiness, adapters, API authorization, tenant isolation และ per-BU/Total calculations
- [x] รัน `excelTemplateImport.test.js`, `excelTemplateImport.fixtures.test.js`, `reportLogic.test.js`, `ReportView.test.jsx` ตาม Excel guardrails
- [x] รัน tests ของ Mapping/ReportSetup/BusinessUnitReports/API และ comparison/export ที่เปลี่ยน
- [x] Build frontend, compile C# backend และตรวจ React diagnostics ตาม workflow repo (full WebApplication build/package ยังติด tooling ตามข้อจำกัดด้านบน)
- [ ] Runtime VIEW/SETUP ด้วยอย่างน้อย 2 BU และเทียบยอด SQL read-only ผ่าน DBX ด้วย dataset เดียวกัน
- [ ] วัด 1/2/5 BU ด้วยเงื่อนไขเดิม; single-BU median ไม่ช้ากว่า baseline เกิน 10%; source concurrency ไม่เกิน 2
- [ ] เปิด/ปิด Total ไม่ยิง data request ซ้ำและไม่ทำให้ Compare เปลี่ยนค่า

**เกณฑ์รับงาน:** ผู้ดูที่คุ้น Excel ใช้ report เดิมเลือก BU เพื่อเทียบได้ทันทีหลัง setup ครั้งเดียว ไม่ต้องสร้างคอลัมน์/สูตรเอง; ทุก BU ตรง single-BU baseline; optional Total ถูกต้อง; mapping อยู่ครบ; สิทธิ์ไม่รั่ว; import/report เดิมผ่าน regression

## 5. ลำดับส่งมอบและ Rollback

1. เก็บ single-BU baseline และสร้าง fixtures ของ BU ที่รหัสตรง/ต่าง/กำกวม
2. เพิ่ม mapping persistence/readiness และ backend source data แยก BU พร้อม authorization tests
3. เพิ่ม Mapping Review/ข้อเสนอจับคู่/ยืนยันเป็นชุด แล้วตรวจ save/reload
4. เพิ่ม BU filter, grouped columns และ engine แยก BU โดยยังใช้สูตร template เดิม
5. เพิ่ม optional Total, Excel/Print, performance verification และ runtime acceptance
6. อัปเดต readiness document และ deploy backend ก่อน frontend หลังได้รับอนุมัติ deployment
7. Pilot report เดียวกับ 2 BU และสำรอง definitions ก่อนเปิดใช้จริง แล้วค่อยตรวจ 5 BU

- [x] สร้าง branch แยกทั้ง frontend/backend แล้ว
- [x] บันทึกแผนพร้อม implementation/test checklists
- [ ] สำรอง report definitions ก่อนใช้ mapping ใหม่จริง
- [ ] ทดสอบ rollback frontend โดยคง backend ที่อ่าน buMappings ได้; หลีกเลี่ยง backend เก่าที่อาจลบฟิลด์เมื่อ save
- [ ] หากจำเป็นต้องเปลี่ยน schema ให้เพิ่ม migration/backup/rollback ที่ review ได้ก่อนดำเนินการ

Branch แยกโค้ดได้ แต่ไม่ย้อน database/deployment ต้องสำรองและมี rollback แยกต่างหาก

**ข้อจำกัดที่ยังไม่พิสูจน์ใน runtime:** ความสอดคล้องของ master data ระหว่าง BU, metadata compatibility, serialization ทุกเส้นทางกับ backend ที่รันจริง และ performance ต้องตรวจใน pilot แม้ automated tests ผ่านแล้ว โค้ด frontend/backend เปลี่ยนแล้วใน local branch; ยังไม่มี database write หรือ deployment

**Total:** ฐานข้อมูลต้องเป็นค่าที่บวกกันได้; ratio/average ต้องคำนวณจากสูตรและฐานที่ครบ ยังไม่มี metadata เพื่อตรวจและปิด Total อัตโนมัติสำหรับสถิติที่เป็นค่าเฉลี่ยสำเร็จรูป ต้อง review report ก่อนเปิดใช้
