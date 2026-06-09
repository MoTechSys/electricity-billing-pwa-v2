'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

interface User {
  id: string;
  fullName: string;
  username: string;
  role: string;
}

export default function AppShell({ children, user }: { children: React.ReactNode; user: User }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { href: '/dashboard', label: 'لوحة التحكم', icon: '📊' },
    { href: '/subscribers', label: 'المشتركون', icon: '👥' },
    { href: '/invoices/new', label: 'إصدار فاتورة', icon: '📝' },
    { href: '/invoices/archive', label: 'أرشيف الفواتير', icon: '📁' },
    { href: '/settings', label: 'الإعدادات', icon: '⚙️' },
  ];

  const handleLogout = async () => {
    await fetch('/billing/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    localStorage.removeItem('auth-token');
    window.location.href = '/billing/login';
  };

  return (
    <div className="min-h-screen flex w-full max-w-full overflow-x-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 right-0 z-50 w-64 max-w-[80vw] shrink-0 bg-gradient-to-b from-blue-900 to-indigo-900 text-white transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
        <div className="p-4 border-b border-blue-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-lg">⚡</div>
            <div>
              <h2 className="font-bold text-sm">نظام فواتير الكهرباء</h2>
              <p className="text-blue-200 text-xs">{user.fullName}</p>
            </div>
          </div>
        </div>

        <nav className="p-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
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

        <div className="absolute bottom-4 left-4 right-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-200 hover:bg-red-900/30 transition"
          >
            <span className="text-lg">🚪</span>
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 min-h-screen w-full">
        {/* Top bar */}
        <header className="bg-white shadow-sm border-b p-4 flex items-center justify-between no-print">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="text-sm text-gray-500">
            {user.role === 'admin' ? 'مدير النظام' : 'موظف الفوترة'}
          </div>
        </header>

        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
