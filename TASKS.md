# TASKS.md

## API Migration Checklist

เป้าหมาย: เปลี่ยนข้อมูล mock/default/localStorage และ CSV upload ให้เป็นการดึงข้อมูลจาก API โดยยังคงรูปแบบข้อมูลให้เข้ากับ report engine เดิมก่อน เพื่อลดผลกระทบกับสูตร `R1/C1`, mapping, export Excel และ browser print

## Carmen API Reference

- Swagger UI: `https://dev.carmen4.com/Carmen.api/swagger/ui/index`
- Swagger JSON: `https://dev.carmen4.com/Carmen.API/swagger/docs/3.241`
- API base URL: `https://dev.carmen4.com/Carmen.API`
- Authentication flow:
  - Login API: `POST https://dev.carmen4.com/Carmen.API/api/login?adminToken={ADMIN_TOKEN}`
  - Body:
    ```json
    {
      "Tenant": "{TENANT}",
      "Password": "{PASSWORD}",
      "UserName": "{USER_NAME}"
    }
    ```
  - Response should return `AccessToken`
  - Use `AccessToken` for other Carmen API calls via `Authorization` header
  - Frontend can derive current user's report capability from login `Permissions` without adding another backend layer:
    - `GL.FinancialReport.Add`, `GL.FinancialReport.Update`, or `GL.FinancialReport.Delete` = can open `SETUP` and edit report configuration
    - `GL.FinancialReport.View` = can open `VIEW` reports
    - Phase 1 implementation uses the login user as the active user; full report access by assigned `UserId` still waits for report definitions/access API
  - Do not commit real `adminToken`, username, password, tenant, or `AccessToken` into repo files; keep them in local env/dev config only
- Phase 1 API approach:
  - ไม่สร้าง facade `GET /api/report-master-data` สำหรับข้อมูลที่ Carmen API มีอยู่แล้ว
  - Frontend เรียก Carmen API โดยตรงสำหรับข้อมูลที่ทำได้: company, users, departments, account codes, GL periods, และ budget revisions
  - ใช้ frontend adapter layer แปลง Carmen response ให้เป็น app shape เดิมก่อนส่งเข้า components/report engine
  - ข้อมูลที่ยังไม่มี endpoint ตรงหรือ response ยังไม่พร้อม เช่น account groups `L1-L4`, report definitions, และ report raw data ให้รอ API ใหม่ก่อน
  - เมื่อ API ใหม่พร้อม ค่อยเพิ่ม/เชื่อม endpoint เฉพาะส่วนที่ยังทำไม่ได้ โดยไม่กระทบ master data ที่เรียก Carmen API ได้แล้ว
- Implementation blocker note:
  - ยังไม่ควรเริ่ม implement frontend API migration จนกว่าจะตรวจว่า Carmen API endpoints ที่ใช้จริงเรียกได้ด้วย `Authorization` และ `useTenant` ที่ถูกต้อง
  - บาง endpoint ใน Swagger ยังไม่ตรงกับ shape ที่ app ต้องใช้ เช่น financial endpoints return เป็น `object`/`string` ไม่ใช่ `actuals`/`budgets` แบบ CSV-like rows
  - `GET /api/report-options`, `GET /api/report-data`, และ `GET /api/reports` ยังเป็น target/facade API ที่ออกแบบไว้สำหรับ frontend แต่ยังไม่ยืนยันว่ามีอยู่จริงครบใน Carmen API
  - `GET /api/report-master-data` ไม่ใช้เป็น facade ใน phase 1 สำหรับข้อมูลที่ Carmen API มีอยู่แล้ว ให้ compose จาก Carmen endpoints โดยตรงผ่าน adapter แทน
  - report definitions API สำหรับ `https://dev.carmen4.com/Carmen.API/api/financial/report` ยังอยู่ระหว่างสร้างตาม note ด้านล่าง จึงยังใช้แทน `defaultReports`/`localStorage` ไม่ได้
  - account groups `L1-L4` ยังไม่พบ direct endpoint ใน Swagger ต้อง confirm แหล่งข้อมูลจริงก่อน เช่น financial report setting, chart of accounts hierarchy, หรือ API ใหม่
  - period ต้องตรวจด้วย `GET /api/glPeriod/year/{year}` ก่อน เพราะ frontend ต้องใช้ `GlpNo`/`GlpDate` แทน calendar month assumption
  - budget revision ต้องตรวจว่า API คืน revision list จาก budget ได้จริง และเลือก default revision ได้อย่างชัดเจน
  - auth readiness ต้องตรวจ login API ก่อน แล้วนำ `AccessToken` ที่ได้ไปลองเรียก company/department/account/period endpoints ให้ผ่านก่อนเริ่มแก้ React code
  - ก่อนเริ่ม implement ทุกครั้ง ให้ verify endpoint availability, auth, request body, response sample, และ adapter mapping ก่อนแก้ React code
- Carmen API ส่วนใหญ่รับ `Authorization` header และ optional `useTenant` query ตาม Swagger
- ถ้า Carmen API response ไม่ตรงกับ shape ที่ frontend ต้องใช้ ให้ทำ adapter หรือ backend facade ก่อนส่งเข้า report engine

## 1. Lookup / Dropdown / Mock Data ที่ควรเปลี่ยนเป็น API

Phase 1: ไม่ทำ unified `GET /api/report-master-data` ก่อน ให้ดึงเฉพาะ master data ที่ Carmen API มีอยู่แล้วโดยตรง และใช้ adapter ใน frontend รวมเป็น `masterData` shape เดิม ส่วนที่ยังไม่มี endpoint ตรงให้รอ API ใหม่

- [x] เปลี่ยน `masterData.companyProfile` เป็น API
  - Original target API: `GET /api/report-master-data` (phase 1 ไม่สร้าง facade ถ้า Carmen API มีข้อมูลนี้แล้ว)
  - Carmen API path: `GET https://dev.carmen4.com/Carmen.API/api/company`
  - Phase 1 source: เรียก Carmen API ตรงผ่าน frontend adapter ยังไม่ต้องสร้าง `GET /api/report-master-data`
  - Carmen response model: `Carmen.Models.ViewCompany`
  - Mapping ที่ต้องใช้: `companyProfile.name <- HotelName`
  - Return: `companyProfile: { name: string }`

- [ ] เปลี่ยน users สำหรับ role selector, access modal, และ assigned user display เป็น API
  - Original target API: `GET /api/report-master-data` (phase 1 ไม่สร้าง facade ถ้า Carmen API มีข้อมูลนี้แล้ว)
  - Carmen API path: `GET https://dev.carmen4.com/Carmen.API/api/user`
  - Carmen API search path: `POST https://dev.carmen4.com/Carmen.API/api/user/search`
  - Phase 1 source: เรียก Carmen API ตรงผ่าน frontend adapter สำหรับ user list; role/access ยังต้อง derive จาก permission หรือ API เพิ่ม
  - Carmen response model: `Carmen.Query.ViewPagedResult[Carmen.Models.ViewUser]`
  - Mapping ที่ต้องใช้: `id <- UserId`, `name <- UserName`, `isActive <- Active`
  - หมายเหตุ: `role` ไม่มีใน `ViewUser` ตรง ๆ ต้อง map จาก permission เช่น `GET /api/permission/{tenant}/{userName}` หรือกำหนดใน financial report access layer เพิ่ม
  - Phase 1 implemented: derive active login user role from login response `Permissions` (`GL.FinancialReport.View/Add/Update/Delete`) and replace local role checks in frontend with permission checks
  - Phase 1 limitation: not a full user list/access mapping yet; report definitions still use local `assignedUsers`, so Carmen `UserId` access filtering needs the report definitions/access API before it can be enforced exactly
  - Return: `users: [{ id: string, name: string, role: "Admin" | "User", isActive?: boolean }]`

- [x] เปลี่ยน departments สำหรับ global `DEPT` dropdown และ row mapping selector เป็น API
  - Original target API: `GET /api/report-master-data` (phase 1 ไม่สร้าง facade ถ้า Carmen API มีข้อมูลนี้แล้ว)
  - Carmen API path: `GET https://dev.carmen4.com/Carmen.API/api/department`
  - Carmen API search path: `POST https://dev.carmen4.com/Carmen.API/api/department/search`
  - Phase 1 source: เรียก Carmen API ตรงผ่าน frontend adapter ยังไม่ต้องสร้าง `GET /api/report-master-data`
  - Carmen response model: `Carmen.Query.ViewPagedResult[Carmen.Models.ViewDepartment]`
  - Mapping ที่ต้องใช้: `id <- DeptCode`, `name <- Description`
  - Return: `depts: [{ id: string, name: string }]`
  - `id` ต้องเป็น department code ที่ frontend ใช้ filter ได้ เช่น `"101"`

- [x] เปลี่ยน account codes สำหรับ Edit Mapping modal เป็น API
  - Original target API: `GET /api/report-master-data` (phase 1 ไม่สร้าง facade ถ้า Carmen API มีข้อมูลนี้แล้ว)
  - Carmen API path: `GET https://dev.carmen4.com/Carmen.API/api/accountCode`
  - Carmen API search path: `POST https://dev.carmen4.com/Carmen.API/api/accountCode/search`
  - Phase 1 source: เรียก Carmen API ตรงผ่าน frontend adapter; ยังต้อง normalize account `Type` ให้ report logic ใช้ได้
  - Carmen enum paths: `GET https://dev.carmen4.com/Carmen.API/api/enum/EnumAccountNature`, `GET https://dev.carmen4.com/Carmen.API/api/enum/EnumAccountType`
  - Carmen response model: `Carmen.Query.ViewPagedResult[Carmen.Models.ViewAccountCode]`
  - Mapping ที่ต้องใช้: `id <- AccCode`, `name <- Description`, `type <- Type`
  - หมายเหตุ: app เดิมใช้ type สั้น เช่น `"I"`/`"B"` แต่ Carmen `Type` เป็น enum เช่น `Income`, `BalanceSheet`, `Statistic`, `Header`, `Total`; ต้องมี adapter แปลงเป็น category ที่ app ใช้
  - Return: `accCodes: [{ id: string, name: string, type: string }]`
  - `type` ใช้ filter หมวดบัญชี เช่น `"I"` สำหรับ income statement หรือ `"B"` สำหรับ balance sheet

- [ ] เปลี่ยน account groups `L1-L4` สำหรับ group selector เป็น API
  - Original target API: `GET /api/report-master-data` (ยังไม่ใช้ใน phase 1; รอ API/source สำหรับข้อมูลที่ Carmen API ไม่มี)
  - Carmen API direct path: ยังไม่พบ endpoint ใน Swagger
  - หมายเหตุ: ยังไม่มี group ของ chart of accounts, หรือ financial report setting
  - Phase 1 status: ยังไม่ implement ส่วนนี้ รอ API ใหม่หรือ source ที่ confirm แล้วสำหรับ `L1-L4`
  - Return: `groups: { L1: [{ id, name }], L2: [{ id, name }], L3: [{ id, name }], L4: [{ id, name }] }`

- [ ] เปลี่ยน report definitions จาก `defaultReports` และ `localStorage` เป็น API
  - API: `GET /api/reports`
  - Write APIs for setup mode should belong to the same report definitions resource:
    - `POST /api/reports` for create blank / create from OCR template
    - `PUT /api/reports/:id` for saving report details, rows, columns, category, access, status, and theme
    - `DELETE /api/reports/:id` for delete report
    - `POST /api/reports/:id/clone` for clone report
  - Note: ถ้า phase แรกต้องการแค่ view report จาก API สามารถทำเฉพาะ `GET /api/reports` ก่อนได้ แต่ถ้า `SETUP` mode ยังแก้ไขข้อมูลได้ ต้องมี write APIs ชุดนี้ด้วย
  - Carmen API direct path: ยังไม่พบ endpoint ใน Swagger **กำลังจะไปสร้าง API เป็น https://dev.carmen4.com/Carmen.API/api/financial/report ยังไม่เสร็จ
  - Phase 1 status: ยังไม่ implement ส่วนนี้ รอ API ใหม่ `https://dev.carmen4.com/Carmen.API/api/financial/report` ให้พร้อมก่อน
  - Return: `reports: ReportDefinition[]`
  - `ReportDefinition` ต้องมี `id`, `name`, `companyName`, `category`, `assignedUsers`, `isActive`, `periodFormat`, `customDateLabel?`, `customPeriodLabel?`, `theme`, `columns`, `rows`
  - `columns` ต้องมี field ที่ใช้ปัจจุบัน เช่น `id`, `label`, `isActive`, `isFormula`, `isPercent`, `formatAsPercent?`, `formula?`, `targetCol?`, `yearMode?`, `periodMode?`, `type?`, `width?`
  - `rows` ต้องมี field ที่ใช้ปัจจุบัน เช่น `id`, `desc`, `isActive`, `isHeader`, `isTotal`, `dept`, `groupLevel`, `groups`, `accCodes`, `percentBase`, `formula`, `indent`

- [ ] เพิ่ม API options สำหรับ dropdown ที่เป็นค่าคงที่ของระบบ
  - API: `GET /api/report-options`
  - Carmen API direct path: ยังไม่พบ endpoint ใน Swagger
  - Return: `themes`, `periodFormats`, `accountCategories`, `columnTypes`, `yearModes`, `periodModes`, `rowTypes`, `indentLevels`
  - ตัวอย่าง return:
    ```json
    {
      "themes": [{ "id": "blue", "label": "Classic Blue" }],
      "periodFormats": [
        { "id": "standard", "label": "Standard (Period : YYYY-MM)" }
      ],
      "accountCategories": [
        { "id": "ALL", "label": "All Categories" },
        { "id": "I", "label": "Income Statement" },
        { "id": "B", "label": "Balance Sheet" }
      ],
      "columnTypes": [
        { "id": "AC", "label": "Actual" },
        { "id": "ACC", "label": "Actual Accumulated" },
        { "id": "BUD", "label": "Budget" },
        { "id": "BUDACC", "label": "Budget Accumulated" }
      ],
      "yearModes": [
        { "id": "current", "label": "Current" },
        { "id": "-1", "label": "Prev" }
      ],
      "periodModes": [
        { "id": "current", "label": "Current" },
        { "id": "-1", "label": "Prev" },
        { "id": "FY", "label": "FY" },
        { "id": "Q1", "label": "Q1" },
        { "id": "Q2", "label": "Q2" },
        { "id": "Q3", "label": "Q3" },
        { "id": "Q4", "label": "Q4" }
      ],
      "rowTypes": [
        { "id": "D", "label": "Data" },
        { "id": "H", "label": "Header" },
        { "id": "F", "label": "Formula" }
      ],
      "indentLevels": [
        { "id": 0, "label": "Lvl 0" },
        { "id": 1, "label": "Lvl 1" },
        { "id": 2, "label": "Lvl 2" },
        { "id": 3, "label": "Lvl 3" }
      ]
    }
    ```

- [ ] เพิ่ม API สำหรับ year, period, และ budget revision selector
  - API: `GET /api/report-periods`
  - Carmen API path: `GET https://dev.carmen4.com/Carmen.API/api/glPeriod`
  - Carmen API year path: `GET https://dev.carmen4.com/Carmen.API/api/glPeriod/year/{year}`
  - Phase 1 source: เรียก Carmen API ตรงผ่าน frontend adapter สำหรับ period metadata
  - Carmen API search path: `POST https://dev.carmen4.com/Carmen.API/api/glPeriod/search`
  - Carmen budget source path: `GET https://dev.carmen4.com/Carmen.API/api/budget`
  - Carmen budget search path: `POST https://dev.carmen4.com/Carmen.API/api/budget/search`
  - Phase 1 source: เรียก Carmen budget API ตรงผ่าน frontend adapter สำหรับ revision list ถ้า response คืน `Revisions`
  - Mapping ที่ต้องใช้: `years <- distinct GlpYear`, `periods <- GlpNo`, `budgetRevisions <- ViewBudget.Revisions`
  - Period source of truth:
    - Use `GET /api/glPeriod/year/{year}` for the selected year
    - Use `GlpNo` as the period id/value sent to report data APIs
    - Use `GlpDate` for period label/date display because fiscal periods may not match calendar months
    - Use `GlpStatus` if the UI needs close/open/partial status
    - Do not assume `P1 = January` in frontend logic
  - Revision source of truth:
    - Revision is budget revision only
    - Actual/GL data does not use revision
    - Budget data fetch must send revision
    - Default revision can be `0` only when the API does not provide a better default
  - Return: `years: string[]`, `periods: [{ id: string, label: string, month: number }]`, `budgetRevisions: [{ id: string, label: string }]`

## 2. เปลี่ยน CSV Upload เป็น API Fetch

- [ ] เปลี่ยน GL CSV upload flow เป็นการดึง actual data จาก API
  - เดิม: `FileReader -> parseGlCsvText -> setEngineData`
  - ใหม่: `fetch /api/report-data -> setEngineData(response.actuals)`

- [ ] เปลี่ยน Budget CSV upload flow เป็นการดึง budget data จาก API
  - เดิม: `FileReader -> parseBudgetCsvText -> setBudgetData`
  - ใหม่: `fetch /api/report-data -> setBudgetData(response.budgets)`

- [ ] เพิ่ม API สำหรับดึงข้อมูล actual และ budget เข้า report engine
  - API: `GET /api/report-data?year=YYYY&period=P&revision=R&deptIds=comma-separated`
  - Carmen actual current candidate: `POST https://dev.carmen4.com/Carmen.API/api/financial/ac`
  - Carmen actual accumulated candidate: `POST https://dev.carmen4.com/Carmen.API/api/financial/acc`
  - Carmen actual PTD/YTD candidates: `POST https://dev.carmen4.com/Carmen.API/api/financial/ptd`, `POST https://dev.carmen4.com/Carmen.API/api/financial/ytd`
  - Carmen budget candidates: `POST https://dev.carmen4.com/Carmen.API/api/financial/ptdbg`, `POST https://dev.carmen4.com/Carmen.API/api/financial/ytdbg`, `POST https://dev.carmen4.com/Carmen.API/api/financial/getBudgetOfDate`
  - Carmen report candidates: `POST https://dev.carmen4.com/Carmen.API/api/financialreport/PL`, `POST https://dev.carmen4.com/Carmen.API/api/financialreport/BS`
  - Request model candidates: `ExcelParamType1`, `ExcelParamType2`, `ExcelParamType3`, `ExcelParamType6`, `ExcelParamType7`, `ParamPLReport`, `ParamBSReport`
  - Phase 1 status: ยังไม่ implement ส่วนนี้ถ้า Carmen API ยังไม่สามารถคืน `actuals`/`budgets` แบบที่ report engine ใช้ได้ ให้รอ API/facade ใหม่ก่อน
  - หมายเหตุ: Carmen financial endpoints return เป็น `object` หรือ `string` ตาม Swagger ไม่ใช่ raw CSV-like rows; ต้องมี adapter/facade แปลงเป็น `actuals` และ `budgets` shape ด้านล่าง หรือปรับ report engine ให้เรียก endpoint aggregate โดยตรง
  - ถ้า `deptIds` ว่าง ให้ return ทุก department ที่ user มีสิทธิ์เห็น
  - API ควร return ข้อมูลอย่างน้อยปีที่เลือกและปีก่อนหน้า เพราะ column รองรับ `yearMode: "-1"` และ `periodMode: "-1"`, `Q1-Q4`, `FY`
  - Return:
    ```json
    {
      "request": {
        "year": "2026",
        "period": "2",
        "revision": "0",
        "deptIds": ["101"]
      },
      "actuals": [
        {
          "year": "2026",
          "deptcode": "101",
          "acccode": "4001",
          "accname": "Room Revenue",
          "acctype": "I",
          "group1": "REVENUE",
          "group2": "ROOMS",
          "group3": "ROOM REVENUE",
          "group4": "ROOM SALES",
          "amt1": 0,
          "amt2": 0,
          "amt3": 0,
          "amt4": 0,
          "amt5": 0,
          "amt6": 0,
          "amt7": 0,
          "amt8": 0,
          "amt9": 0,
          "amt10": 0,
          "amt11": 0,
          "amt12": 0,
          "bfamt1": 0,
          "bfamt2": 0,
          "bfamt3": 0,
          "bfamt4": 0,
          "bfamt5": 0,
          "bfamt6": 0,
          "bfamt7": 0,
          "bfamt8": 0,
          "bfamt9": 0,
          "bfamt10": 0,
          "bfamt11": 0,
          "bfamt12": 0
        }
      ],
      "budgets": [
        {
          "year": "2026",
          "revision": "0",
          "deptcode": "101",
          "acccode": "4001",
          "accname": "Room Revenue",
          "acctype": "I",
          "group1": "REVENUE",
          "group2": "ROOMS",
          "group3": "ROOM REVENUE",
          "group4": "ROOM SALES",
          "amt1": 0,
          "amt2": 0,
          "amt3": 0,
          "amt4": 0,
          "amt5": 0,
          "amt6": 0,
          "amt7": 0,
          "amt8": 0,
          "amt9": 0,
          "amt10": 0,
          "amt11": 0,
          "amt12": 0,
          "budacc1": 0,
          "budacc2": 0,
          "budacc3": 0,
          "budacc4": 0,
          "budacc5": 0,
          "budacc6": 0,
          "budacc7": 0,
          "budacc8": 0,
          "budacc9": 0,
          "budacc10": 0,
          "budacc11": 0,
          "budacc12": 0
        }
      ]
    }
    ```

## 3. Frontend Implementation Tasks

- [x] เพิ่ม API client layer เช่น `src/features/report/lib/reportApi.js`
  - Functions ที่ควรมี: `fetchReportMasterData`, `fetchReportOptions`, `fetchReportPeriods`, `fetchReports`, `fetchReportData`
  - Phase 1 adjustment: `fetchReportMasterData` ไม่ต้องเรียก facade เดียว แต่ให้ compose จาก Carmen API ตรง เช่น `fetchCompany`, `fetchUsers`, `fetchDepartments`, `fetchAccountCodes`, `fetchGlPeriods`, `fetchBudgetRevisions`
  - เพิ่ม `src/features/report/lib/reportAdapters.js` สำหรับ normalize Carmen fields เป็น app shape เดิม

- [ ] เปลี่ยน initial state ใน `App.jsx`
  - โหลด `masterData`, `reports`, `engineData`, `budgetData` จาก API
  - Phase 1: โหลด `masterData` เฉพาะส่วนที่ Carmen API พร้อมก่อน ได้แก่ company, users, departments, account codes, periods, revisions
  - Phase 1: ยังไม่โหลด `reports`, `engineData`, `budgetData` จาก API ถ้า report definitions/report data API ยังไม่พร้อม ให้ใช้ของเดิมไว้ก่อน
  - เพิ่ม loading/error state ตอน API fail

- [ ] เปลี่ยนปุ่ม `GL` และ `BUD`
  - จาก file input เป็นปุ่ม refresh/sync data
  - กดแล้วเรียก `/api/report-data` ด้วย filter ปัจจุบัน

- [ ] เปลี่ยน `handleApplyFilters`
  - หลัง apply year/period/revision/dept ให้ fetch report data ใหม่
  - จากนั้นให้ `buildReportData` คำนวณด้วยข้อมูล API ล่าสุด

- [ ] ปรับ period/date display logic ให้รองรับ fiscal period จาก API
  - โหลด period metadata จาก `GET /api/glPeriod/year/{year}`
  - เก็บ selected period เป็น `GlpNo`
  - ใช้ `GlpDate` แทนการคำนวณเดือนเองใน `formatAutoPeriod`
  - ปรับ report header labels เช่น `displayDateLabel` และ `displayPeriodLabel` ให้ใช้ period metadata
  - ตรวจ column logic ที่ใช้ `periodMode: "current"`, `"-1"`, `Q1-Q4`, `FY` เพื่อให้ทำงานกับ fiscal period order จาก `GlpNo`
  - ไม่ assume ว่า period 1-12 เท่ากับ January-December

- [ ] แยก revision handling ให้เป็น budget-only ใน frontend data flow
  - ส่ง `revision` เฉพาะตอน fetch budget/report data ที่เกี่ยวกับ budget
  - ไม่ใช้ `revision` เป็นเงื่อนไขกับ actual/GL data
  - สร้าง revision dropdown จาก budget revisions ที่ API คืนมา
  - fallback เป็น revision `0` เฉพาะเมื่อ API ไม่คืน revision list

- [ ] ปรับ Rows Configurator ให้พร้อมกับ Carmen API master data
  - Keep row config shape เดิม: `dept`, `accCodes`, `groupLevel`, `groups`, `formula`, `percentBase`
  - ใช้ frontend adapter normalize Carmen fields เช่น `DeptCode`, `AccCode`, `Description`, `Type` ก่อนเข้า row mapping UI
  - Disable หรือ mark pending สำหรับ group selector `L1-L4` จนกว่าจะมี API/source ที่ confirm แล้ว
  - Validate manual mapping codes กับ `masterData.depts` และ `masterData.accCodes`
  - แสดง warning ใน row summary ถ้ามี department/account code ที่ไม่พบใน master data
  - คง formula references `R1`, `R2`, `% Base` และ rewrite logic เดิมไว้ก่อน

- [ ] เพิ่ม report config CRUD API สำหรับ setup mode
  - Note: รายการนี้เป็น frontend implementation task สำหรับ write APIs ของ `GET /api/reports` ข้างบน ไม่ใช่ API resource คนละชุด
  - Target API: `POST /api/reports`
  - Target API: `PUT /api/reports/:id`
  - Target API: `DELETE /api/reports/:id`
  - Target API: `POST /api/reports/:id/clone`
  - Carmen API candidate: `GET/POST https://dev.carmen4.com/Carmen.API/api/report`
  - Carmen API candidate: `GET/PUT/DELETE https://dev.carmen4.com/Carmen.API/api/report/{id}`
  - Carmen financial setting candidate: `GET/PUT https://dev.carmen4.com/Carmen.API/api/financialreport/setting/{id}`
  - Return report object shape เดียวกับ `GET /api/reports`

- [ ] เก็บ `localStorage` เป็น fallback ชั่วคราวเท่านั้น
  - ถ้า API สำเร็จ ให้ใช้ API เป็น source of truth
  - ถ้า API fail ให้แสดง error ชัดเจน

## 4. Test / Acceptance Criteria

- [ ] เปิดแอปแล้ว role dropdown, report list, dept dropdown, mapping selector แสดงข้อมูลจาก API
- [ ] กด refresh/sync แล้ว actuals และ budgets เข้า report engine แทน CSV upload
- [ ] เปลี่ยน year/period/revision/dept แล้วรายงานคำนวณใหม่ถูกต้อง
- [ ] Setup mode ยังแก้ rows, columns, category, access ได้
- [ ] Formula row, percent base, column formula, export Excel และ print ยังทำงานเหมือนเดิม
- [ ] API fail แล้ว UI แสดง error และไม่ทำให้รายงานพัง

## Assumptions

- Backend/API จะเป็นตัวเชื่อม MariaDB และ frontend จะเรียกผ่าน HTTP เท่านั้น
- Shape ของ `actuals` และ `budgets` ตั้งใจให้ใกล้กับข้อมูล CSV เดิม เพื่อให้ `buildReportData()` ใช้ต่อได้โดยแก้น้อยที่สุด
- `report-options` เป็น API-backed ตามคำขอ dropdown/lookup ทั้งหมด แม้บางค่าเป็น UI enum ที่สามารถคงไว้ใน frontend ได้

## 3.1 Additional FRD v5.23 Requirements (API/DB only, no CSV scope)

- [ ] Add `day` as a first-class filter in API data flow
  - Include `day` in report query params for daily and PTD column types (`DAC`, `PTD`, `DACBG`, `PTDBG`)
  - Keep monthly/YTD types (`AC`, `ACC`, `BC`, `BCC`) independent from day filter
  - Validate day range from selected fiscal period metadata before API call

- [ ] Add report header metadata fields from FRD to report definition API model
  - Add `owner` (creator user id)
  - Add `overrideDateDisplay` and `overridePeriodDisplay`
  - Keep `periodFormat` and `theme` persisted in report definition payload

- [ ] Add `reportType` support (`Monthly` / `Daily`) in setup and engine/API flow
  - Persist `reportType` per report via report definition API
  - Use report type to show/hide day selector and daily-only column behaviors
  - Enforce compatible column types per report type in setup validation

- [ ] Add multi-dimensional mapping support in row schema and adapter
  - Persist row-level dimensions (e.g., `dim1`, `dim2`) via report definition API
  - Apply `AND` logic when multiple dimensions are selected on a row
  - Keep this logic in Pass 1 aggregation before formula passes

- [ ] Enforce FRD mapping conflict rules in Rows Configurator
  - Prevent mutually exclusive mapping mixes on same row (`DeptGrp` vs `Dept`, `Grp` vs explicit `accCodes`)
  - Prevent duplicate composite mappings that would double count (same effective rule combination)
  - When `groupLevel` changes, show warning and reset incompatible previous group mappings

- [ ] Add stronger formula error-state contract from FRD
  - Keep smart renumbering for row/column reorder and delete
  - Convert broken references to `!REF!` and surface clearly in setup UI
  - Prevent save when unresolved broken references remain

- [ ] Extend report access API contract for FRD access semantics
  - Keep `assignedUsers` authorization list
  - Persist `owner` separately and prevent accidental owner loss on update
  - Ensure non-authorized users cannot load report detail data from API
