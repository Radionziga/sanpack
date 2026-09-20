import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { PriceManager } from '@/components/admin/PriceManager';
import { requireAdmin } from '@/lib/auth/server';
import { hasAdminCapability } from '@/lib/auth/adminCapabilities';
import { listPriceHistory } from '@/lib/pricing/priceManagerServer';

export default async function AdminPricesPage() {
  const admin = await requireAdmin();
  let initialHistory: Awaited<ReturnType<typeof listPriceHistory>> = [];
  let initialHistoryError = '';
  if (hasAdminCapability(admin.role, 'pricing.write')) {
    try {
      initialHistory = await listPriceHistory();
    } catch {
      initialHistoryError = 'История обновлений цен временно недоступна.';
    }
  }
  return <div className="admin-page space-y-6">
    <AdminPageHeader
      title="Цены"
      description="Скачайте актуальный Excel, измените базовые цены и загрузите файл обратно. SANPACK покажет точный список изменений до записи в каталог."
    />
    <PriceManager initialHistory={initialHistory} initialHistoryError={initialHistoryError} />
  </div>;
}
