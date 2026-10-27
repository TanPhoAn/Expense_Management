# PocketFlow — Quản Lý Chi Tiêu Cá Nhân Thông Minh

PocketFlow là ứng dụng quản lý thu chi và tài chính cá nhân được thiết kế hiện đại, tối ưu cho thị trường Việt Nam (hỗ trợ tiếng Việt đầy đủ, định dạng tiền tệ VND không làm tròn sai số, múi giờ `Asia/Ho_Chi_Minh` UTC+7).

---

## 🛠 Công Nghệ Sử Dụng (Mandatory Stack)

- **Framework**: [Next.js](https://nextjs.org/) (App Router, React Server Components & Route Handlers)
- **Ngôn ngữ**: [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
- **Styling & UI**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) + [Lucide Icons](https://lucide.dev/)
- **Cơ sở dữ liệu**: [Neon PostgreSQL](https://neon.tech/) (Serverless Postgres with Connection Pooling)
- **ORM & Migrations**: [Drizzle ORM](https://orm.drizzle.team/) & Drizzle Kit
- **Xác thực dữ liệu**: [Zod](https://zod.dev/) & [React Hook Form](https://react-hook-form.com/)
- **Biểu đồ**: [Recharts](https://recharts.org/)
- **Bảo mật & Phiên**: [jose](https://github.com/panva/jose) (Stateless encrypted JWT in HTTP-only cookies) + [bcryptjs](https://github.com/dcodeIO/bcrypt.js)
- **Kiểm thử**: [Vitest](https://vitest.dev/) (Unit Tests) & [Playwright](https://playwright.dev/) (E2E Tests)
- **Triển khai**: [Vercel](https://vercel.com/)

---

## 🌟 Tính Năng Chính

1. **Bảng điều khiển thông minh**:
   - **Chi tiêu hôm nay**: Luôn tính đúng ngày hiện tại theo múi giờ `Asia/Ho_Chi_Minh` (kể cả khi đang chọn xem tháng khác).
   - **Tổng thu nhập tháng & Tổng chi tiêu tháng**: Tính tổng thực tế từ database theo tháng được chọn.
   - **Số dư còn lại**: Bằng Thu nhập - Chi tiêu (cho phép hiển thị âm khi thâm hụt).
2. **Ghi chép giao dịch nhanh (Quick-Add Modal)**:
   - Gợi ý danh mục tự động dựa trên từ khóa mô tả (VD: gõ *"Đi ăn trưa"* -> tự gợi ý *"Ăn uống"*; gõ *"Lương tháng 10"* -> tự gợi ý *"Lương"*).
   - Nhập tiền VND chuẩn xác, ngăn ngừa lỗi làm tròn số thực (IEEE-754).
3. **Sổ giao dịch (Transaction Ledger)**:
   - Phân trang, tìm kiếm theo mô tả tiếng Việt (không dấu / có dấu).
   - Lọc theo loại (Thu/Chi), khoảng ngày, danh mục.
   - Chỉnh sửa và xóa giao dịch an toàn (ảnh hưởng ngay lập tức đến mọi báo cáo tài chính).
4. **Quản lý danh mục**:
   - 12 danh mục mặc định chuẩn hệ thống (Ăn uống, Di chuyển, Mua sắm, Tiện ích, Sức khỏe, Lương, Thưởng, Đầu tư...).
   - Tạo danh mục tùy biến per-user với bảng màu nhận diện trực quan.
   - Ngăn chặn xóa danh mục đang có giao dịch phát sinh.
5. **Biểu đồ trực quan**:
   - Xu hướng thu chi 6 tháng (Bar Chart).
   - Cơ cấu phân bổ chi tiêu theo danh mục (Donut Chart).

---

## 🚀 Cài Đặt & Khởi Chạy

### 1. Cài đặt dependencies
```bash
npm install
```

### 2. Cấu hình biến môi trường
Tạo file `.env.local` từ mẫu `.env.example`:
```env
DATABASE_URL="postgresql://user:password@ep-sample-pooler.ap-southeast-1.aws.neon.tech/pocketflow?sslmode=require"
DIRECT_DATABASE_URL="postgresql://user:password@ep-sample.ap-southeast-1.aws.neon.tech/pocketflow?sslmode=require"
AUTH_SECRET="your-ultra-secure-random-secret-key-at-least-32-chars"
```

### 3. Tạo schema & Migration cơ sở dữ liệu
```bash
# Tạo migration SQL từ Drizzle schema
npm run db:generate

# Áp dụng migration vào Neon PostgreSQL
npm run db:migrate

# Seed danh mục mặc định tiếng Việt
npm run db:seed
```

### 4. Chạy môi trường phát triển (Development)
```bash
npm run dev
```
Truy cập ứng dụng tại: `http://localhost:3000`

### 5. Chạy kiểm thử tự động
```bash
# Chạy Unit Tests với Vitest
npm test

# Chạy End-to-End Tests với Playwright
npm run test:e2e
```

---

## 📁 Cấu Trúc Mã Nguồn

```
pocketflow/
├── drizzle/                     # Migration SQL tự động
├── public/                      # Static assets
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── (auth)/              # Đăng nhập & Đăng ký
│   │   ├── (dashboard)/         # Tổng quan, Giao dịch, Danh mục
│   │   └── api/v1/              # Typed REST API endpoints
│   ├── components/ui/           # shadcn/ui primitives
│   ├── features/                # Domain features
│   │   ├── transactions/        # QuickAddModal, Services
│   │   ├── categories/          # Services & Suggestion Engine
│   │   └── dashboard/           # Charts, Summary Services
│   ├── lib/                     # Hạ tầng dùng chung
│   │   ├── db/                  # Drizzle ORM client, schema, seed
│   │   ├── auth/                # Session & Password hashing
│   │   ├── validations/         # Zod schemas
│   │   └── utils/               # Tiền tệ VND, Múi giờ VN
│   ├── middleware.ts            # Edge Auth Protection Middleware
│   └── types/                   # TypeScript interfaces
├── tests/                       # Unit & E2E tests
├── drizzle.config.ts            # Drizzle Kit config
└── vitest.config.ts             # Vitest config
```

---

## 📡 Chi Tiết API Endpoints (Phase 2 Server Contract)

Tất cả các API yêu cầu xác thực phiên đăng nhập qua HTTP-Only cookie `pocketflow_session` (ngoại trừ các endpoint xác thực). Mọi giao dịch và danh mục đều tự động lọc theo `userId` từ phiên.

### 1. Giao Dịch (Transactions)

- **`POST /api/v1/transactions`**: Tạo mới giao dịch.
  ```bash
  curl -X POST http://localhost:3000/api/v1/transactions \
    -H "Content-Type: application/json" \
    -b "pocketflow_session=<TOKEN>" \
    -d '{
      "description": "Đi ăn trưa",
      "amount": "55000",
      "type": "EXPENSE",
      "categoryId": "b1494602-0e22-4841-8f43-b248a3fec023",
      "transactionDate": "2026-10-27",
      "note": "Ăn cùng đồng nghiệp"
    }'
  ```

- **`GET /api/v1/transactions`**: Danh sách giao dịch có phân trang và bộ lọc.
  ```bash
  curl "http://localhost:3000/api/v1/transactions?page=1&pageSize=20&type=EXPENSE&startDate=2026-10-01&endDate=2026-10-31" \
    -b "pocketflow_session=<TOKEN>"
  ```

- **`GET /api/v1/transactions/[id]`**: Chi tiết 1 giao dịch theo ID.
- **`PUT /api/v1/transactions/[id]`** hoặc **`PATCH /api/v1/transactions/[id]`**: Cập nhật từng phần hoặc toàn phần giao dịch.
- **`DELETE /api/v1/transactions/[id]`**: Xóa giao dịch của người dùng.

### 2. Danh Mục (Categories)

- **`GET /api/v1/categories`**: Lấy danh mục hệ thống mặc định (`userId IS NULL`) và danh mục riêng của người dùng.
- **`POST /api/v1/categories`**: Tạo danh mục tùy chỉnh per-user.
- **`PATCH /api/v1/categories/[id]`** / **`PUT /api/v1/categories/[id]`**: Cập nhật danh mục riêng (ngăn chặn chỉnh sửa danh mục hệ thống).
- **`DELETE /api/v1/categories/[id]`**: Xóa danh mục riêng (bảo vệ danh mục hệ thống và chặn xóa danh mục đang có giao dịch phát sinh).
- **`GET /api/v1/categories/suggest?q=...`**: Gợi ý danh mục tiếng Việt thông minh qua từ khóa mô tả.

### 3. Báo Cáo & Thống Kê (Dashboard)

- **`GET /api/v1/dashboard/summary?month=YYYY-MM`**: Tổng hợp `todayExpense`, `monthlyIncome`, `monthlyExpense`, `remainingBalance`.
- **`GET /api/v1/dashboard/expense-breakdown?month=YYYY-MM`**: Cơ cấu chi tiêu theo từng danh mục kèm tỷ lệ phần trăm (`%`).
- **`GET /api/v1/dashboard/trends?month=YYYY-MM`**: Xu hướng chi tiêu theo từng ngày trong tháng (`dailyExpenseTrend`) hoặc theo số tháng gần nhất (`months=6`).

