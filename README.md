# PocketFlow — Quản Lý Chi Tiêu Cá Nhân Thông Minh

PocketFlow là ứng dụng quản lý thu chi và tài chính cá nhân được thiết kế hiện đại, tối ưu cho thị trường Việt Nam (hỗ trợ tiếng Việt đầy đủ, định dạng tiền tệ VND không làm tròn sai số, múi giờ `Asia/Ho_Chi_Minh` UTC+7).

---

## 🛠 1. Công Nghệ Sử Dụng (Mandatory Stack)

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, React Server Components & Route Handlers)
- **Ngôn ngữ**: [TypeScript](https://www.typescriptlang.org/) (Strict Mode bật toàn diện)
- **Styling & UI**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) + [Lucide Icons](https://lucide.dev/)
- **Cơ sở dữ liệu**: [Neon PostgreSQL](https://neon.tech/) (Serverless Postgres with Connection Pooling)
- **ORM & Migrations**: [Drizzle ORM](https://orm.drizzle.team/) & Drizzle Kit
- **Xác thực dữ liệu**: [Zod](https://zod.dev/) & [React Hook Form](https://react-hook-form.com/)
- **Biểu đồ**: [Recharts](https://recharts.org/)
- **Bảo mật & Phiên**: [jose](https://github.com/panva/jose) (Stateless encrypted JWT in HTTP-only cookies) + [bcryptjs](https://github.com/dcodeIO/bcrypt.js)
- **Kiểm thử**: [Vitest](https://vitest.dev/) (Unit Tests) & [Playwright](https://playwright.dev/) (E2E Tests)
- **Triển khai**: [Vercel](https://vercel.com/) (Serverless Node.js Runtime)

---

## 🏛 2. Kiến Trúc Ứng Dụng (Architecture)

PocketFlow hoạt động hoàn toàn trên mô hình Single Deployment (Monolithic Next.js Fullstack), không sử dụng backend rời (như Spring Boot hay Express riêng biệt):

```mermaid
flowchart TD
    Client["Browser / Mobile Client (React & Tailwind)"]
    EdgeMW["Vercel Edge Middleware (Route Protection & Session Guard)"]
    NextServer["Next.js Server (Route Handlers & Server Logic)"]
    NeonPooler["Neon Connection Pooler (PgBouncer - Port 6543)"]
    NeonDB["Neon PostgreSQL Database (Compute & Storage)"]

    Client -->|"HTTP Requests + Cookies"| EdgeMW
    EdgeMW -->|"Authenticated"| NextServer
    NextServer -->|"import 'server-only' / Drizzle ORM"| NeonPooler
    NeonPooler -->|"TCP Pool"| NeonDB
```

- **Mọi tương tác cơ sở dữ liệu** đều được bảo vệ trong tầng `server-only`, không bao giờ bundle xuống phía client.
- **Bảo mật đa người dùng**: Mọi query SELECT, UPDATE, DELETE đều bắt buộc lọc theo `userId` lấy từ JWT session cookie đã xác thực. Không bao giờ tin tưởng client-supplied `userId`.
- **Số học tài chính**: Cột `amount` lưu dưới dạng `NUMERIC(15, 2)`. Toàn bộ phép cộng trừ tính tổng được quy đổi sang `BigInt` (đơn vị xu nhỏ nhất) trước khi thực hiện để triệt tiêu sai số dấu phẩy động IEEE-754.

---

## 🐘 3. Thiết Lập Neon PostgreSQL (Neon Setup)

### 3.1. Tạo Project trên Neon
1. Đăng ký/Đăng nhập tại [https://neon.tech](https://neon.tech).
2. Nhấn **New Project**:
   - **Project name**: `pocketflow`
   - **Postgres version**: `16` (hoặc mới nhất)
   - **Region**: Chọn vùng gần Việt Nam nhất (VD: `ap-southeast-1` - Singapore).

### 3.2. Lấy Connection String
Neon cung cấp hai loại URL trong mục **Dashboard -> Connection Details**:
1. **Pooled Connection String (`-pooler`)**:
   - Thích hợp cho Vercel Serverless Functions nhằm tái sử dụng kết nối (tránh cạn kiệt connection pool khi có nhiều request đồng thời).
   - Đặt cho biến `DATABASE_URL`.
2. **Direct Connection String (không có `-pooler`)**:
   - Kết nối trực tiếp đến PostgreSQL compute node.
   - Dùng khi chạy schema migrations (`drizzle-kit` DDL) để tránh lỗi transaction locking của PgBouncer.
   - Đặt cho biến `DIRECT_DATABASE_URL`.

---

## 🔐 4. Cấu Hình Biến Môi Trường (Environment Variables)

Xem mẫu đầy đủ tại [`.env.example`](file:///.env.example).

| Tên biến | Phạm vi | Mô tả & Ví dụ |
| :--- | :---: | :--- |
| `DATABASE_URL` | **Server-Only** | Connection string Neon có pooling. Ví dụ: `postgresql://user:pass@ep-xyz-pooler.ap-southeast-1.aws.neon.tech/pocketflow_db?sslmode=require` |
| `DIRECT_DATABASE_URL` | **Server-Only** | Connection string Neon trực tiếp (dùng chạy migration). Ví dụ: `postgresql://user:pass@ep-xyz.ap-southeast-1.aws.neon.tech/pocketflow_db?sslmode=require` |
| `AUTH_SECRET` | **Server-Only** | Chuỗi ngẫu nhiên tối thiểu 32 ký tự dùng ký token JWT phiên làm việc. Tạo bằng: `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | **Public / Client** | URL gốc của ứng dụng (VD: `https://pocketflow.vercel.app`). Chỉ các biến an toàn cho client mới dùng tiền tố `NEXT_PUBLIC_`. |

> [!CAUTION]
> **TUYỆT ĐỐI KHÔNG** đặt tiền tố `NEXT_PUBLIC_` cho `DATABASE_URL`, `DIRECT_DATABASE_URL` hoặc `AUTH_SECRET`. Việc này sẽ khiến Next.js bundle mật khẩu vào mã JavaScript gửi xuống trình duyệt!

---

## 🗄 5. Quản Lý Migration Cơ Sở Dữ Liệu (Migrations Lifecycle)

Drizzle Kit được cấu hình để quản lý phiên bản schema an toàn:

### 5.1. Tạo mới Migration
Khi thay đổi file [`src/lib/db/schema/index.ts`](file:///src/lib/db/schema/index.ts):
```bash
npm run db:generate
```
Lệnh này sẽ sinh file SQL mới trong thư mục `drizzle/`.

### 5.2. Kiểm tra (Review) Migration
Trước khi áp dụng, nhà phát triển **bắt buộc kiểm tra** nội dung file `.sql` vừa sinh ra trong thư mục `drizzle/` để tránh các thao tác nguy hiểm (như `DROP TABLE`, `DROP COLUMN` không chủ đích).

### 5.3. Áp dụng Migration vào Cơ sở dữ liệu
```bash
# Áp dụng các file migration chưa chạy
npm run db:migrate

# Khởi tạo dữ liệu mẫu (12 danh mục tiếng Việt chuẩn)
npm run db:seed
```

### 5.4. Quy trình triển khai Production & Khôi phục khi lỗi
- **Không chạy migration tự động độc lập trên từng instance Serverless**: Chỉ áp dụng migration từ một quy trình CI/CD tập trung hoặc chạy thủ công có kiểm soát trước khi deploy phiên bản code mới.
- **Xử lý sự cố (Rollback / Recovery)**:
  - Neon hỗ trợ tính năng **Point-in-Time Recovery (PITR)** và **Database Branching**.
  - Trước khi chạy migration lớn trên production, hãy tạo một Neon branch tạm: `neon branches create --name backup-before-migration`.
  - Nếu migration thất bại: có thể khôi phục trạng thái database về branch sao lưu trong vài giây.

---

## ☁️ 6. Hướng Dẫn Triển Khai Lên Vercel (Vercel Deployment)

### 6.1. Kết nối Repository với Vercel
1. Đăng nhập [https://vercel.com](https://vercel.com).
2. Nhấn **Add New... -> Project**.
3. Chọn Git repository: `TanPhoAn/Expense_Management` (hoặc repo của bạn).

### 6.2. Cấu hình Project Settings
- **Framework Preset**: `Next.js`
- **Root Directory**: `./` (để mặc định nếu repo ở root, hoặc trỏ đúng thư mục project nếu dùng monorepo)
- **Node.js Version**: Chọn `20.x` (trong Settings -> General -> Node.js Version)
- **Build Command**: `next build` (mặc định)
- **Output Directory**: `.next` (mặc định)
- **Install Command**: `npm install` (mặc định)

### 6.3. Cài đặt Environment Variables trên Vercel
Vào tab **Settings -> Environment Variables** và thêm các biến sau:
1. `DATABASE_URL` -> Connection string Neon (Pooled)
2. `DIRECT_DATABASE_URL` -> Connection string Neon (Direct)
3. `AUTH_SECRET` -> Chuỗi bí mật 32 ký tự
4. `NEXT_PUBLIC_APP_URL` -> URL domain của Vercel (VD: `https://pocketflow.vercel.app`)

*Lưu ý: Bạn có thể cấu hình giá trị riêng cho Production, Preview và Development để các bản Preview branch sử dụng riêng database branch của Neon, tránh ghi đè dữ liệu Production.*

### 6.4. Kích hoạt Deploy
Nhấn **Deploy**. Vercel sẽ tự động tải dependencies, chạy kiểm tra TypeScript, build tối ưu hóa và phát hành ứng dụng ra CDN toàn cầu.

---

## 🧪 7. Kiểm Thử & Kiểm Tra Chất Lượng Mã Nguồn

```bash
# 1. Chạy toàn bộ 112 Unit Tests (Bao gồm logic tài chính, chống làm tròn, phân quyền dữ liệu)
npm test

# 2. Kiểm tra nghiêm ngặt kiểu dữ liệu TypeScript
npm run typecheck

# 3. Kiểm tra định dạng và chuẩn mã nguồn ESLint
npm run lint

# 4. Kiểm thử End-to-End (Playwright)
npm run test:e2e

# 5. Chạy thử nghiệm Production Build tại local
npm run build
```

---

## ✅ 8. Danh Sách Kiểm Tra Sau Triển Khai (Production Verification)

Sau khi Vercel thông báo deploy thành công, thực hiện quy trình kiểm tra thực tế:

- [ ] **Kiểm tra Health Endpoint**: Truy cập `https://<domain>/api/health` -> Phải trả về JSON `{ status: "ok", db: "connected", latencyMs: ..., timezone: "Asia/Ho_Chi_Minh" }`.
- [ ] **Đăng ký tài khoản mới**: Truy cập `/register`, nhập thông tin -> Tài khoản được tạo thành công và chuyển hướng vào Dashboard.
- [ ] **Tải danh mục mặc định**: Kiểm tra giao diện ghi chép có sẵn 12 danh mục tiếng Việt (Ăn uống, Di chuyển, Lương, v.v.).
- [ ] **Tạo giao dịch Thu & Chi**:
  - Nhập chi tiêu: `Đi ăn trưa`, số tiền `55.000 đ` -> Lưu thành công.
  - Nhập thu nhập: `Lương tháng`, số tiền `15.000.000 đ` -> Lưu thành công.
- [ ] **Xác thực độ chính xác số liệu Dashboard**:
  - Thẻ *Chi tiêu hôm nay* hiển thị đúng `55.000 đ`.
  - Thẻ *Thu tháng này* hiển thị đúng `15.000.000 đ`.
  - Thẻ *Chi tháng này* hiển thị đúng `55.000 đ`.
  - Thẻ *Số dư còn lại* hiển thị đúng `14.945.000 đ`.
- [ ] **Chỉnh sửa & Xóa giao dịch**: Sửa lại số tiền giao dịch và kiểm tra biểu đồ + số dư cập nhật tức thì.
- [ ] **Tính cô lập dữ liệu (Multi-tenant Isolation)**: Đăng xuất và đăng ký tài khoản thứ 2 trên trình duyệt ẩn danh. Đảm bảo tài khoản thứ 2 **không nhìn thấy** bất kỳ giao dịch nào của tài khoản thứ nhất.
- [ ] **Bảo mật Logs**: Xem log trên Vercel Runtime Logs, đảm bảo không có chuỗi kết nối database hay token nào bị in ra.

---

## 🛠 9. Xử Lý Sự Cố Thường Gặp (Troubleshooting)

| Hiện tượng | Nguyên nhân khả dĩ | Hướng khắc phục |
| :--- | :--- | :--- |
| **Lỗi `500 Internal Server Error` khi gọi API** | Chưa điền biến `DATABASE_URL` hoặc `AUTH_SECRET` trên Vercel | Kiểm tra tab Environment Variables trên Vercel, đảm bảo biến có sẵn trong môi trường Production và trigger redeploy. |
| **Lỗi kết nối `connection timeout` tới Neon** | Vượt quá số lượng kết nối tối đa | Đảm bảo `DATABASE_URL` sử dụng connection string có tiền tố `-pooler` (cổng 6543 / PgBouncer). |
| **Lỗi migration `prepared statement already exists`** | Dùng Pooled connection để chạy DDL migrations | Đặt biến `DIRECT_DATABASE_URL` trỏ vào endpoint trực tiếp (không có `-pooler`) khi chạy `npm run db:migrate`. |
| **Cảnh báo `Dynamic server usage` lúc build** | Next.js kiểm tra static render trên các route có đọc cookies | Đây là cơ chế phân tích tĩnh bình thường của Next.js App Router với các route động (`ƒ Dynamic`). Không ảnh hưởng đến runtime. |

---

## ⚠️ 10. Giới Hạn Đã Biết (Known Limitations)

- **Rate Limiting**: Phiên bản hiện tại chưa tích hợp Redis rate limiter. Đăng nhập liên tục chưa bị khóa IP.
- **Tính năng mở rộng**: Chưa hỗ trợ liên kết tự động tài khoản ngân hàng (Open Banking API) và chưa có giao dịch định kỳ (Recurring transactions) theo đúng phạm vi cam kết của Phase 1–5.
