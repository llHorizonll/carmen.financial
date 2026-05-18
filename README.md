# Carmen Financial BI Hub

โปรเจกต์นี้คือแอป React สำหรับงาน BI/Financial Reporting ที่รันผ่าน Vite และใช้ `lucide-react` เป็นชุดไอคอนหลัก

## เทคโนโลยีที่ใช้
- Vite
- React
- Tailwind CSS
- lucide-react
- Browser APIs เช่น `localStorage`, `FileReader`, `Blob`, `window.print()`

## ติดตั้ง

```bash
npm install
```

## รันโปรเจกต์

```bash
npm run dev
```

เปิด URL ที่ Vite แสดงผล เช่น `http://localhost:5173`

## สร้างไฟล์โปรดักชัน

```bash
npm run build
```

## รันทดสอบ

```bash
npm run test
```

ถ้าต้องการโหมดเฝ้าดูการเปลี่ยนแปลง ใช้:

```bash
npm run test:watch
```

## ดูตัวอย่างไฟล์ build

```bash
npm run preview
```

## โครงสร้างสำคัญของโปรเจกต์
- `src/main.jsx` คือจุดเริ่มต้นของแอป React
- `src/app/App.jsx` คือไฟล์แอปหลักของโปรเจกต์
- `src/features/report/components/` เก็บส่วนที่แยกออกมาแล้ว เช่น หน้าดูรายงาน, หน้าตั้งค่า, และโมดัล
- `src/features/report/data/` เก็บ default report และ template builders
- `src/hooks/` เก็บ hook สำหรับ state persistence
- `src/features/report/lib/reportLogic.js` เก็บ helper และ business logic ที่ทดสอบได้
- `src/features/report/lib/normalizeCode.js` เก็บกติกาการ normalize รหัสที่ใช้ร่วมกัน
- `src/features/report/components/*.test.jsx` ทดสอบ component ที่แยกออกมา เช่น `ReportView`, `AccessModal`, `EditMappingModal`, และ `MultiSelectDropdown`

## ชุดทดสอบที่มีอยู่
- ทดสอบการ parse CSV และการอ่านตัวเลข
- ทดสอบการ format period และเวลาแสดงผล
- ทดสอบการสร้าง report template, clone report และ OCR starter report
- ทดสอบ OCR starter scaffold และข้อมูลเริ่มต้นของ report ที่ import จากภาพ/PDF
- ทดสอบ CSV parsing สำหรับไฟล์ GL และ Budget รวมถึงการอัปเดต master data
- ทดสอบ flow อัปโหลดไฟล์ผ่าน input จริงของแอป พร้อม mock `FileReader`
- ทดสอบการคำนวณรายงานจริงจากข้อมูล GL / Budget / Formula / Percent
- ทดสอบการลบและย้ายแถว/คอลัมน์พร้อมการแก้ reference อัตโนมัติ
- ทดสอบการ rewrite reference ตอนลบหรือย้าย row/column แบบเจาะจง
- ทดสอบการสร้าง HTML สำหรับ export Excel
- ทดสอบการ render ของ component รายงานหลัก
- ทดสอบ component ฝั่งตั้งค่า เช่น `ReportDetailsPanel`, `ColumnsConfigurator`, และ `RowsConfigurator`
- ทดสอบ flow หลักของแอป เช่น สลับ `VIEW`/`SETUP` และเปลี่ยน role ผู้ใช้

## คู่มือการใช้งานแบบย่อ
1. เปิดแอปแล้วจะเจอหน้า `VIEW` สำหรับดูรายงาน
2. ใช้แถบ `SETUP` เพื่อแก้ไขโครงสร้างรายงาน
3. อัปโหลดไฟล์ GL CSV และ Budget CSV เพื่อเติมข้อมูลจริง
4. ใช้ OCR Import เพื่อสร้างโครงรายงานจากภาพหรือ PDF
5. กำหนดสิทธิ์การเข้าถึงรายงานตามผู้ใช้
6. Export เป็น Excel หรือสั่งพิมพ์จากเบราว์เซอร์ได้

## Business Logic และ Feature ที่ควรรู้

### 1) การสลับโหมดการทำงาน
- `VIEW` ใช้สำหรับแสดงผลรายงาน
- `SETUP` ใช้สำหรับแก้ไขโครงสร้างรายงานและ mapping

### 2) การจำลองบทบาทผู้ใช้
- เลือกผู้ใช้จากเมนู `View As Role`
- ถ้าไม่ใช่ Admin ระบบจะกรองรายงานที่มีสิทธิ์ให้ดูเฉพาะรายงานที่ถูก assign

### 3) การจัดการข้อมูลหลัก
- เก็บ master data เช่น company profile, users, departments, groups และ account codes
- ข้อมูลเหล่านี้ถูกจำไว้ใน `localStorage` เพื่อเปิดแอปใหม่แล้วยังอยู่

### 4) การนำเข้าข้อมูล GL
- อัปโหลดไฟล์ CSV ของรายการบัญชีจริง
- ระบบจะอ่านคอลัมน์, แยกข้อมูล, หา department/account/group และอัปเดต master data
- ข้อมูลนี้ถูกใช้เป็นฐานในการคำนวณรายงาน

### 5) การนำเข้าข้อมูล Budget
- อัปโหลดไฟล์ Budget CSV แยกจาก GL
- ระบบจะเก็บ budget data และนำไปใช้กับคอลัมน์ประเภท budget ในรายงาน

### 6) การคำนวณรายงาน
- รายงานแต่ละบรรทัดถูกกำหนดได้ว่าเป็น Data, Header หรือ Formula
- ระบบรองรับการอ้างอิงแถวและคอลัมน์แบบ `R1`, `C1`
- มีการปรับ reference อัตโนมัติเมื่อย้ายหรือ ลบแถว/คอลัมน์

### 7) การตั้งค่ารายงาน
- เปลี่ยนชื่อรายงาน
- เปลี่ยนชื่อบริษัทที่แสดงผล
- เปลี่ยนธีมสีของรายงาน
- กำหนดรูปแบบวันที่และรอบบัญชี
- เปิด/ปิดสถานะรายงาน

### 8) การกำหนดสิทธิ์รายงาน
- เลือกผู้ใช้ที่สามารถเห็นรายงานนี้ได้
- ใช้ร่วมกับ role simulation เพื่อทดสอบสิทธิ์ก่อนใช้งานจริง

### 9) การจัดการแถวและคอลัมน์
- เพิ่ม ลบ ย้าย หรือ clone รายงาน
- เพิ่มแถว data/header/formula
- เพิ่มคอลัมน์ report logic ตามช่วงเวลา, budget, formula หรือ percent
- ตั้งค่า width, label, type และ target column

### 10) การ map ข้อมูลรายละเอียด
- ผูกข้อมูลกับ department codes
- ผูก account codes
- ผูก group ระดับ L1 ถึง L4
- แก้ mapping ได้ผ่าน modal แบบเลือกหลายรายการ

### 11) OCR Import
- นำเข้าจากภาพหรือ PDF
- ระบบจะสร้างแม่แบบรายงานเริ่มต้นให้จากการอ่านข้อมูล

### 12) การ Export และ Print
- Export เป็นไฟล์ Excel-compatible `.xls`
- พิมพ์รายงานผ่าน `window.print()`
- มี layout สำหรับ print โดยเฉพาะ

### 13) ธีมรายงาน
- เลือกสีของรายงานได้ 3 แบบ
- ธีมมีผลกับ header, subtotal และ total row

## หมายเหตุสำหรับนักพัฒนา
- Business logic หลักถูกรวมอยู่ใน `src/app/App.jsx` และ `src/features/report/lib/reportLogic.js`
- ตอนนี้ UI หลักถูกแยกออกเป็น component ย่อยแล้ว เช่น report view, setup panel, access modal, และ mapping modal
- ตอนนี้ logic สำคัญบางส่วนถูกย้ายไปอยู่ใน `src/features/report/lib/reportLogic.js` เพื่อให้ทดสอบได้ง่ายขึ้น
- ถ้าจะปรับโครงสร้างต่อไป แนะนำแยก helper, hooks, และ engine logic ออกเป็นไฟล์ย่อยทีละส่วน
