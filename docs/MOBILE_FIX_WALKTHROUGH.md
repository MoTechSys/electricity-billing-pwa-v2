# دليل إصلاح توافق الهاتف + PWA

تاريخ: 2026-06-09 | الحالة: ✅ مكتمل

## ما تم إصلاحه (Changes)

### 1. الجذر (Root overflow guard)
- `src/app/globals.css`: أضفت `html, body { max-width:100%; overflow-x:hidden }` + `* { box-sizing:border-box }`.
- `src/app/layout.tsx`: أضفت `overflow-x-hidden` على `<body>`.

### 2. الشريط الجانبي (Sidebar — AppShell.tsx)
- غيّرت breakpoint من `lg:` إلى `md:` (الجوال/التابلت يحصلون على drawer + hamburger).
- الحاوية الجذر: `flex w-full max-w-full overflow-x-hidden`.
- `aside`: `max-w-[80vw] shrink-0`، يختفي بـ `translate-x-full` عند الإغلاق على الجوال.
- `main`: `flex-1 min-w-0 w-full` (يمنع تجاوز flex).

### 3. شبكات الكروت (Dashboard grids)
- الكروت الإحصائية: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-5` (كانت `grid-cols-2`).
- العنوان: `text-xl sm:text-2xl` + `flex-wrap`.

### 4. الجداول (Tables — Dashboard + Subscribers + Archive)
- `table w-full` → `w-full min-w-[600px]` داخل `overflow-x-auto` → تمرير أفقي بدل القص.

### 5. PWA
- `manifest.json`: `start_url`/`scope`/`id`/`icons` كلها تحت `/billing/` + فصل `purpose: any` و`maskable`.
- `ServiceWorkerRegistration.tsx`: يُسجّل `/billing/sw.js` مع `scope: '/billing/'`.
- `public/sw.js`: كل المسارات المخبأة (offline, manifest, icons, api, static) بادئتها `/billing/` + رفع نسخة الكاش لـ `v3`.
- `layout.tsx`: نقلت `themeColor` إلى `viewport` export، أضفت `viewportFit:cover`، رفعت `maximumScale` لـ 5 (وصولية).

## التحقق (Verification)
| الاختبار | النتيجة |
|----------|---------|
| `/billing` | HTTP 200 ✓ |
| `/billing/manifest.json` | HTTP 200 ✓ |
| `/billing/sw.js` | HTTP 200 ✓ |
| `/billing/icons/icon-192.png` | HTTP 200 ✓ |
| لقطة جوال 390px — تجاوز أفقي | ✓ اختفى |
| لقطة جوال — عناوين مقصوصة | ✓ ظهرت كاملة |
| لقطة جوال — تسرّب الشريط الجانبي | ✓ اختفى |
| لقطة جوال — الكروت عمود واحد | ✓ |
| البناء (production) | ✓ نجح |

## ملاحظة
وضع الإنتاج إلزامي (`next build` + `next start`). وضع dev يكسر الترطيب (hydration) مع basePath.
