import React from 'react';
import { redirect } from 'next/navigation';
import { AmbientBackground } from '@/components/common/AmbientBackground';
import { Header } from '@/components/common/Header';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { AdminNavbar } from '@/components/admin/AdminNavbar';
import { getCurrentProfile } from '@/lib/server/session';
import { isAdminEmail } from '@/lib/server/authz';

export default async function AdminPage() {
  const profile = await getCurrentProfile();
  if (!profile || !isAdminEmail(profile.email)) {
    redirect('/');
  }

  return (
    <div className="app-shell min-h-screen text-[var(--color-text-primary)] pb-24 md:pb-24">
      <AmbientBackground />
      <Header />
      <main className="relative z-10">
        <AdminDashboard />
      </main>
      <AdminNavbar />
    </div>
  );
}
