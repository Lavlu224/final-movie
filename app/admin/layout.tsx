"use client";

import AdminSidebar from '@/components/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex">
      <AdminSidebar />
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
