import { BagDesignerAdmin } from '@/components/admin/BagDesignerAdmin';

export default function BagDesignerAdminPage() {
  return <main className="admin-page"><header className="admin-page-header"><div><h1 className="admin-page-title">Конструктор пакета</h1><p className="admin-page-description">Настройте модуль и работайте с заявками на индивидуальные макеты.</p></div></header><BagDesignerAdmin /></main>;
}
