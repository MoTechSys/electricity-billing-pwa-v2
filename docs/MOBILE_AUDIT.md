# تدقيق توافق الهاتف + PWA — Mobile & PWA Audit

تاريخ: 2026-06-09 | المُنفّذ: Clow2 | الاستضافة: `/billing` (basePath) عبر Caddy

## المشاكل المكتشفة (Issues Found)

| # | المشكلة | الجذر التقني | الخطورة |
|---|---------|--------------|---------|
| 1 | تجاوز أفقي (horizontal overflow) يقص العناوين العربية | لا يوجد `overflow-x-hidden` على `html/body` + الشريط الجانبي `fixed` يتسرّب | 🔴 حرجة |
| 2 | الشريط الجانبي يظهر شريطاً أزرق على الحافة في الجوال | breakpoint `lg:` (1024px) متأخر، والـ `aside` يحجز مساحة flex | 🔴 حرجة |
| 3 | الكروت الإحصائية (5) تُعرض عمودين مضغوطين فتُقص | `grid-cols-2` على أصغر شاشة | 🔴 حرجة |
| 4 | جداول البيانات تُقص (عمود الحالة/التاريخ) | `table w-full` يضغط الأعمدة بدل التمرير | 🟠 عالية |
| 5 | Service Worker يفشل 404 | يُسجّل على `/sw.js` بدل `/billing/sw.js` | 🟠 عالية (PWA) |
| 6 | manifest + الأيقونات مسارات خاطئة | `/manifest.json`, `/icons/...` بدون بادئة `/billing` | 🟠 عالية (PWA) |
| 7 | `themeColor` في metadata يعطي warning | يجب أن يكون في `viewport` export | 🟡 متوسطة |
| 8 | `maximumScale: 1` يمنع التكبير (وصولية) | قيمة صارمة | 🟡 متوسطة |

## المرجع المعتمد
`osoul-aldiafa-site` — نمط mobile-first سليم: `grid-cols-1` → `md:/lg:`، شريط بـ `hidden md:`، `viewport` export صحيح.
