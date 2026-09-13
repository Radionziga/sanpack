import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AnalyticsDashboard } from '@/components/admin/AnalyticsDashboard';

export default function AdminAnalyticsPage() {
  return <div className="admin-page">
    <AdminPageHeader title="Аналитика" description="Что происходит на сайте: откуда приходят посетители, какие товары их интересуют и сколько людей доходят до заявки. Без имён, телефонов и профилей клиентов." />
    <AnalyticsDashboard />
  </div>;
}
