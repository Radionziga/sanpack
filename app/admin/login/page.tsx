'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, KeyRound, LoaderCircle, LockKeyhole, Mail, ShieldCheck, TriangleAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { SanpackLogo } from '@/components/ui/SanpackLogo';

export default function AdminLoginPage() {
  const router = useRouter();
  const { login, resetPassword, error: authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resetNotice, setResetNotice] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    setResetNotice('');
    try {
      await login(email, password);
      router.push('/admin');
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось войти. Проверьте данные и повторите попытку.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    setErrorMessage('');
    setResetNotice('');
    setIsResetting(true);
    try {
      await resetPassword(email);
      setResetNotice(`Письмо для смены пароля отправлено на ${email.trim().toLowerCase()}.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось отправить письмо. Повторите попытку.');
    } finally {
      setIsResetting(false);
    }
  };

  const visibleError = errorMessage || authError;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--sp-canvas)] p-4 sm:p-6">
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-[var(--sp-line)] bg-[var(--sp-surface)] md:grid md:min-h-[540px] md:grid-cols-[0.88fr_1.12fr]">
        <section className="relative flex flex-col justify-between overflow-hidden bg-[var(--sp-brand-deep)] p-6 text-[var(--sp-on-brand-deep)] sm:p-8 md:p-10">
          <div className="relative z-10">
            <SanpackLogo variant="white" className="h-7" />
            <p className="mt-4 max-w-xs text-sm leading-6 text-white/68">Управление каталогом, заявками и промо-материалами SANPACK.</p>
          </div>

          <div className="relative z-10 mt-12 space-y-3 md:mt-0">
            <div className="flex items-center gap-3 border-t border-white/14 py-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-white/9"><ShieldCheck className="size-4" aria-hidden="true" /></span>
              <div><p className="text-xs font-bold">Защищённая сессия</p><p className="mt-0.5 text-[11px] text-white/55">Вход через Firebase Authentication</p></div>
            </div>
            <div className="flex items-center gap-3 border-t border-white/14 py-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-white/9"><LockKeyhole className="size-4" aria-hidden="true" /></span>
              <div><p className="text-xs font-bold">Контролируемые изменения</p><p className="mt-0.5 text-[11px] text-white/55">Ошибка записи никогда не считается успехом</p></div>
            </div>
          </div>

          <div className="pointer-events-none absolute -bottom-24 -right-20 size-72 rounded-full border border-white/8" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-10 -right-6 size-48 rounded-full border border-white/8" aria-hidden="true" />
        </section>

        <section className="flex flex-col justify-center p-6 sm:p-8 md:p-12">
          <div className="mx-auto w-full max-w-sm">
            <Link href="/ru" className="mb-8 inline-flex min-h-10 items-center gap-2 text-xs font-bold text-[var(--sp-ink-tertiary)] transition-colors hover:text-[var(--sp-brand)]">
              <ArrowLeft className="size-4" aria-hidden="true" /> Вернуться на сайт
            </Link>
            <h1 className="font-extended text-2xl font-bold tracking-[-0.025em] text-[var(--sp-ink)]">Вход в панель</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--sp-ink-secondary)]">Введите email и пароль аккаунта, созданного в Firebase Authentication.</p>

            {visibleError && (
              <div className="mt-5 flex items-start gap-2 rounded-lg border border-red-300/40 bg-red-500/8 px-3 py-3 text-xs leading-5 text-[var(--sp-danger)]" role="alert">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{visibleError}</span>
              </div>
            )}
            {resetNotice && (
              <div className="mt-5 rounded-lg border border-emerald-500/30 bg-emerald-500/8 px-3 py-3 text-xs leading-5 text-[var(--sp-success)]" role="status">
                {resetNotice} Откройте ссылку из письма, задайте новый пароль и вернитесь на эту страницу.
              </div>
            )}

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <label className="block text-xs font-bold text-[var(--sp-ink)]">
                Email
                <span className="relative mt-1.5 block">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--sp-ink-muted)]" aria-hidden="true" />
                  <input type="email" required autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@sanpack.uz" className="min-h-12 w-full rounded-lg border border-[var(--sp-control-border)] bg-[var(--sp-control)] pl-10 pr-3 text-sm font-normal text-[var(--sp-ink)] outline-none placeholder:text-[var(--sp-ink-muted)] focus:border-[var(--sp-brand)]" />
                </span>
              </label>

              <label className="block text-xs font-bold text-[var(--sp-ink)]">
                Пароль
                <span className="relative mt-1.5 block">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--sp-ink-muted)]" aria-hidden="true" />
                  <input type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="min-h-12 w-full rounded-lg border border-[var(--sp-control-border)] bg-[var(--sp-control)] pl-10 pr-3 text-sm font-normal text-[var(--sp-ink)] outline-none focus:border-[var(--sp-brand)]" />
                </span>
              </label>

              <button type="submit" disabled={isLoading} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[var(--sp-brand)] px-4 font-compact text-xs font-bold text-[var(--sp-on-brand)] transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60">
                {isLoading ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <LockKeyhole className="size-4" aria-hidden="true" />}
                {isLoading ? 'Проверка доступа…' : 'Войти в панель'}
              </button>
              <button type="button" onClick={() => void handlePasswordReset()} disabled={isResetting || !email.trim()} className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-[var(--sp-control-border)] px-4 font-compact text-xs font-bold text-[var(--sp-ink-secondary)] transition-colors hover:border-[var(--sp-brand)] hover:text-[var(--sp-brand)] disabled:cursor-not-allowed disabled:opacity-50">
                {isResetting ? 'Отправка письма…' : 'Восстановить пароль'}
              </button>
            </form>

            <p className="mt-5 text-[11px] leading-5 text-[var(--sp-ink-tertiary)]">Регистрация на сайте отключена. Новые аккаунты создаются владельцем проекта в Firebase.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
