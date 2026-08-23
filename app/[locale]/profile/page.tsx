import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CustomerProfilePage } from '@/components/profile/CustomerProfilePage';

export default function ProfilePage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--sp-canvas)]">
      <Header />
      <CustomerProfilePage />
      <Footer />
    </div>
  );
}
