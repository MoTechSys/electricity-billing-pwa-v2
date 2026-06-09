'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { IconHome, IconUsers, IconArchive, IconSettings, IconBolt } from '@/components/Icons';


export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { href: '/dashboard', label: 'لوحة التحكم', icon: '📊' },
    { href: '/subscribers', label: 'المشتركون', icon: '👥' },
    { href: '/invoices/new', label: 'إصدار فاتورة', icon: '📝' },
    { href: '/invoices/archive', label: 'أرشيف الفواتير', icon: '📁' },
    { href: '/settings', label: 'الإعدادات', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen flex w-full max-w-full overflow-x-hidden">
      {/* Sidebar — desktop only (mobile uses bottom nav) */}
      <aside className="hidden md:flex md:flex-col md:static inset-y-0 right-0 z-50 w-64 shrink-0 bg-gradient-to-b from-blue-900 to-indigo-900 text-white">
        <div className="p-4 border-b border-blue-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-lg">⚡</div>
            <div>
              <h2 className="font-bold text-sm">نظام فواتير الكهرباء</h2>
              <p className="text-blue-200 text-xs">Motech</p>
            </div>
          </div>
        </div>

        <nav className="p-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                pathname.startsWith(item.href)
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-blue-100 hover:bg-blue-800'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 min-h-screen w-full">
        {/* Top bar */}
        <header className="bg-white shadow-sm border-b p-4 flex items-center justify-between no-print">
          <div className="md:hidden flex items-center gap-2 font-extrabold text-gray-800">
            <span className="text-xl">⚡</span>
            <span className="text-sm">فواتير الكهرباء</span>
          </div>
          <div className="text-sm text-gray-500">نظام الفواتير</div>
        </header>

        <div className="p-4 lg:p-6 has-bottom-nav">
          {children}
        </div>
      </main>

      {/* Floating bottom nav — mobile only */}
      <nav className="bottom-nav md:hidden">
        <Link href="/dashboard" className={`nav-item ${pathname.startsWith('/dashboard') ? 'active' : ''}`}>
          <IconHome className="nav-icon w-5 h-5" />
          <span>الرئيسية</span>
        </Link>
        <Link href="/subscribers" className={`nav-item ${pathname.startsWith('/subscribers') ? 'active' : ''}`}>
          <IconUsers className="nav-icon w-5 h-5" />
          <span>المشتركون</span>
        </Link>
        <div className="nav-center">
          <Link href="/invoices/new" className="fab" aria-label="إصدار فاتورة"><IconBolt className="w-6 h-6" /></Link>
        </div>
        <Link href="/invoices/archive" className={`nav-item ${pathname.startsWith('/invoices/archive') ? 'active' : ''}`}>
          <IconArchive className="nav-icon w-5 h-5" />
          <span>الأرشيف</span>
        </Link>
        <Link href="/settings" className={`nav-item ${pathname.startsWith('/settings') ? 'active' : ''}`}>
          <IconSettings className="nav-icon w-5 h-5" />
          <span>الإعدادات</span>
        </Link>
      </nav>
    </div>
  );
}
