"use client";

import { useState, useRef, useEffect } from 'react';
import { Users, Film, Play, LogOut, Settings, Menu, X } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

export default function AdminSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMobileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const menuItems = [
    { icon: Film, label: "Dashboard", path: "/admin" },
    { icon: Play, label: "Content Library", path: "/admin/content" },
    { icon: Users, label: "Users", path: "/admin/users" },
    { icon: Play, label: "Analytics", path: "/admin/analytics" },
    { icon: Settings, label: "Settings", path: "/admin/settings" },
  ];

  const handleLogout = () => {
    localStorage.removeItem('isAdmin');
    router.push('/login');
  };

  const sidebarContent = (
    <div className="p-4 md:p-8 flex flex-col h-full">
      <div className="flex items-center justify-between gap-3 mb-8 md:mb-12">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 md:w-10 md:h-10 bg-red-600 rounded-2xl flex items-center justify-center shrink-0">
            <span className="text-white text-2xl md:text-3xl font-black tracking-[-3px]">N</span>
          </div>
          <div>
            <div className="font-semibold text-xl md:text-2xl tracking-tight">Netflix</div>
            <div className="text-[10px] text-zinc-500 -mt-1">ADMIN PANEL</div>
          </div>
        </div>
        <button onClick={() => setMobileOpen(false)} className="lg:hidden text-zinc-400 hover:text-white cursor-pointer">
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="space-y-1 mb-10 flex-1">
        {menuItems.map((item, index) => (
          <button
            key={index}
            onClick={() => router.push(item.path)}
            className={`flex items-center gap-3 w-full px-4 py-3 md:py-3.5 rounded-2xl text-sm transition ${
              pathname === item.path ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </nav>

      <button
        onClick={handleLogout}
        className="flex items-center gap-3 w-full px-4 py-3 md:py-3.5 rounded-2xl text-sm text-red-400 hover:bg-red-950 hover:text-red-300 transition"
      >
        <LogOut className="h-4 w-4" />
        Logout
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 text-zinc-400 hover:text-white bg-zinc-950/80 backdrop-blur p-2.5 rounded-xl border border-zinc-800 cursor-pointer">
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <div ref={ref} className={`fixed top-0 left-0 z-50 h-full w-64 bg-zinc-950 border-r border-zinc-800 transform transition-transform duration-300 lg:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {sidebarContent}
      </div>

      {/* Desktop sidebar */}
      <div className="w-72 border-r border-zinc-800 bg-zinc-950 h-screen sticky top-0 hidden lg:flex flex-col">
        {sidebarContent}
      </div>
    </>
  );
}
