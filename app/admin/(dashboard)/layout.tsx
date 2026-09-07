import AdminShell from '@/components/admin/AdminShell';
import { requireAdmin } from '@/lib/auth/server';
import { canAccessAdminPath, getAdminLandingPath } from '@/lib/auth/adminCapabilities';
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
  const allowed = canAccessAdminPath(admin.role, pathname);

  return <AdminShell adminEmail={admin.email} adminRole={admin.role}>
    {allowed ? children : (
      <section role="alert" className="sp-alert sp-alert-danger max-w-2xl text-sm">
        <h1 className="font-extended text-lg font-bold">Раздел недоступен</h1>
        <p className="mt-2">У вашей роли нет прав на просмотр или изменение этого раздела. Выберите доступный раздел в меню либо обратитесь к владельцу магазина.</p>
      </section>
    )}
  </AdminShell>;
}
