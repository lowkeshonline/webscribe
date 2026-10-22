import React from 'react';
import { Header } from '@/components/common/Header';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { AdminNavbar } from '@/components/admin/AdminNavbar';
import { AuthModal } from '@/components/auth/AuthModal';

export default function AdminPage() {
  return (
    <div className="app-shell min-h-screen text-[var(--color-text-primary)] pb-28">
      <Header />
      <main>
        {/* Sign-in gate lives inside AdminDashboard, so /admin is the only entry to sign in. */}
        <AdminDashboard />
      </main>
      <AuthModal />
      <AdminNavbar />
    </div>
  );
}
