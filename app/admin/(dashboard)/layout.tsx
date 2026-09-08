import AdminShell from '@/components/admin/AdminShell';
import { requireAdmin } from '@/lib/auth/server';
import { getAdminLandingPath } from '@/lib/auth/adminCapabilities';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();
  const pathname = (await headers()).get('x-sanpack-admin-path') || '/admin';
  if (pathname === '/admin' && admin.role !== 'super_admin' && admin.role !== 'viewer') {
    redirect(getAdminLandingPath(admin.role));
  }
  return <AdminShell adminEmail={admin.email} adminRole={admin.role}>
    {children}
  </AdminShell>;
}
