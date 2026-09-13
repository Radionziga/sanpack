import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AnalyticsDashboard } from '@/components/admin/AnalyticsDashboard';

export default function AdminAnalyticsPage() {
  return <div className="admin-page">
    <AdminPageHeader title="Аналитика" description="Посещения, интерес к товарам, источники трафика и путь до успешно отправленной заявки. Без имён, телефонов и customer-профилей." />
    <AnalyticsDashboard />
  </div>;
}
