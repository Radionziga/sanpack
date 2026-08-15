'use client';

import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch, type UseFormRegisterReturn } from 'react-hook-form';
import { z } from 'zod';
import { Check, Image as ImageIcon, Loader2, Moon, Palette, RotateCcw, Save, Sun, Type, Upload } from 'lucide-react';
import { SanpackRepository } from '@/lib/repositories/sanpackRepository';
import { accessibleForeground, contrastRatio, normalizeHex } from '@/lib/theme/colors';
import { SanpackLogo } from '@/components/ui/SanpackLogo';
import type { SiteSettings } from '@/types';

const DEFAULT_PRIMARY = '#0F6E43';
const DEFAULT_SECONDARY = '#DCE9AF';

const settingsFormSchema = z.object({
  logo: z.string().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Укажите цвет в формате #RRGGBB.'),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Укажите цвет в формате #RRGGBB.'),
  borderRadius: z.number().int().min(0).max(32),
  themeMode: z.enum(['light', 'dark']),
  fontPair: z.enum(['brand', 'modern', 'editorial', 'neutral']),
});

type SettingsForm = z.infer<typeof settingsFormSchema>;
type PreviewStyle = CSSProperties & Record<`--${string}`, string>;

const fontPairs = [
  {
    value: 'brand',
    title: 'Фирменная',
    description: 'MTS Wide + MTS Text',
    heading: "'MTS Wide', var(--font-manrope), sans-serif",
    body: "'MTS Text', var(--font-inter), sans-serif",
  },
  {
    value: 'modern',
    title: 'Современная',
    description: 'Manrope + Inter',
    heading: 'var(--font-manrope), sans-serif',
    body: 'var(--font-inter), sans-serif',
  },
  {
    value: 'editorial',
    title: 'Редакционная',
    description: 'Roboto Slab + Inter',
    heading: 'var(--font-roboto-slab), serif',
    body: 'var(--font-inter), sans-serif',
  },
  {
    value: 'neutral',
    title: 'Нейтральная',
    description: 'Inter + Inter',
    heading: 'var(--font-inter), sans-serif',
    body: 'var(--font-inter), sans-serif',
  },
] as const;

function ColorField({
  label,
  description,
  value,
  error,
  onChange,
  inputProps,
}: {
  label: string;
  description: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  inputProps: UseFormRegisterReturn;
}) {
  const normalized = normalizeHex(value, label.includes('Дополнительный') ? DEFAULT_SECONDARY : DEFAULT_PRIMARY);
  const foreground = accessibleForeground(normalized);

  return (
    <div className="rounded-lg border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] p-4">
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 size-8 shrink-0 rounded-md border border-black/10"
          style={{ backgroundColor: normalized }}
          aria-hidden="true"
        />
        <div>
          <h3 className="text-sm font-bold text-[var(--sp-ink)]">{label}</h3>
          <p className="mt-1 text-xs leading-5 text-[var(--sp-ink-tertiary)]">{description}</p>
        </div>
      </div>
      <div className="mt-4 flex gap-3">
        <input
          type="color"
          value={normalized}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          aria-label={`Выбрать: ${label}`}
          className="h-11 w-14 cursor-pointer rounded-lg border border-[var(--sp-control-border)] bg-[var(--sp-control)] p-1"
        />
        <label className="min-w-0 flex-1 text-xs font-bold text-[var(--sp-ink)]">
          <span className="sr-only">HEX-код: {label}</span>
          <input
            {...inputProps}
            aria-invalid={Boolean(error)}
            className="admin-control font-mono text-sm font-normal uppercase"
          />
        </label>
      </div>
      {error ? (
        <span className="mt-2 block text-xs text-[var(--sp-danger)]">{error}</span>
      ) : (
        <p className="mt-2 text-xs text-[var(--sp-ink-secondary)]">
          Контраст текста: {contrastRatio(normalized, foreground).toFixed(2)}:1
        </p>
      )}
    </div>
  );
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [notice, setNotice] = useState('');
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SettingsForm>({
    resolver: zodResolver(settingsFormSchema),
    mode: 'onSubmit',
    reValidateMode: 'onBlur',
    defaultValues: {
      logo: '',
      primaryColor: DEFAULT_PRIMARY,
      secondaryColor: DEFAULT_SECONDARY,
      borderRadius: 8,
      themeMode: 'light',
      fontPair: 'brand',
    },
  });

  const logo = useWatch({ control, name: 'logo', defaultValue: '' });
  const primaryColor = useWatch({ control, name: 'primaryColor', defaultValue: DEFAULT_PRIMARY });
  const secondaryColor = useWatch({ control, name: 'secondaryColor', defaultValue: DEFAULT_SECONDARY });
  const borderRadius = useWatch({ control, name: 'borderRadius', defaultValue: 8 });
  const themeMode = useWatch({ control, name: 'themeMode', defaultValue: 'light' });
  const fontPair = useWatch({ control, name: 'fontPair', defaultValue: 'brand' });
  const selectedFonts = fontPairs.find((pair) => pair.value === fontPair) || fontPairs[0];

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [currentCompany, setCurrentCompany] = useState<SiteSettings['company'] | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const settings = await SanpackRepository.getSettings();
        if (!active) return;
        setCurrentCompany(settings.company || null);
        reset({
          logo: settings.company?.logo || '',
          primaryColor: settings.design?.primaryColor || DEFAULT_PRIMARY,
          secondaryColor: settings.design?.designVersion === 2
            ? settings.design.secondaryColor || DEFAULT_SECONDARY
            : DEFAULT_SECONDARY,
          borderRadius: settings.design?.borderRadius ?? 8,
          themeMode: settings.design?.themeMode || 'light',
          fontPair: settings.design?.fontPair || 'brand',
        });
      } catch (error) {
        if (active) setPageError(error instanceof Error ? error.message : 'Не удалось загрузить настройки.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [reset]);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    setPageError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'uploads');
      const res = await fetch('/api/admin/media', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || 'Не удалось загрузить логотип');
      }
      const data = await res.json();
      if (data.file?.url) {
        setValue('logo', data.file.url, { shouldDirty: true });
        setNotice('Логотип загружен. Нажмите «Сохранить настройки» для применения на сайте.');
      }
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Ошибка при загрузке логотипа');
    } finally {
      setUploadingLogo(false);
    }
  }

  const save = handleSubmit(async (values) => {
    setPageError('');
    setNotice('');
    const design: SiteSettings['design'] = {
      primaryColor: normalizeHex(values.primaryColor),
      secondaryColor: normalizeHex(values.secondaryColor, DEFAULT_SECONDARY),
      borderRadius: values.borderRadius,
      themeMode: values.themeMode,
      fontPair: values.fontPair,
      designVersion: 2,
    };
    const company = {
      ...(currentCompany || {}),
      logo: values.logo?.trim() || '',
    };
    try {
      await SanpackRepository.saveSettings({ design, company } as Partial<SiteSettings>);
      setNotice('Настройки сохранены. Логотип, цвета, тема, шрифты и геометрия успешно обновлены.');
      router.refresh();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Настройки не сохранены.');
    }
  });

  const previewStyle: PreviewStyle = {
    '--preview-primary': normalizeHex(primaryColor),
    '--preview-on-primary': accessibleForeground(primaryColor),
    '--preview-secondary': normalizeHex(secondaryColor, DEFAULT_SECONDARY),
    '--preview-on-secondary': accessibleForeground(normalizeHex(secondaryColor, DEFAULT_SECONDARY)),
    '--preview-radius-outer': `${(borderRadius ?? 8) + Math.min(borderRadius ?? 8, 8)}px`,
    '--preview-radius': `${borderRadius ?? 8}px`,
    '--preview-radius-inner': `${Math.max(0, (borderRadius ?? 8) - 2)}px`,
    '--preview-heading': selectedFonts.heading,
    '--preview-body': selectedFonts.body,
  };

  return (
    <div className="admin-page mx-auto max-w-6xl space-y-6">
      <header className="border-b border-[var(--sp-line)] pb-5">
        <h1 className="font-extended text-2xl font-bold tracking-[-0.025em] text-[var(--sp-ink)]">Внешний вид и брендинг</h1>
        <p className="mt-1.5 max-w-3xl text-sm leading-6 text-[var(--sp-ink-secondary)]">
          Настройте логотип магазина, два акцентных цвета, тему оформления, шрифтовую пару и геометрию интерфейса.
        </p>
      </header>

      {(pageError || notice) && (
        <p className={`rounded-lg border px-4 py-3 text-sm ${pageError ? 'border-red-300/50 bg-red-500/8 text-[var(--sp-danger)]' : 'border-emerald-500/30 bg-emerald-500/8 text-[var(--sp-success)]'}`} role={pageError ? 'alert' : 'status'}>
          {pageError || notice}
        </p>
      )}

      {loading ? (
        <p className="py-12 text-center text-sm text-[var(--sp-ink-tertiary)]">Загрузка настроек…</p>
      ) : (
        <form onSubmit={save} className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-5">
            {/* Logo Settings Section */}
            <section className="rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface)] p-5 md:p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <ImageIcon className="mt-0.5 size-5 text-[var(--sp-brand)]" aria-hidden="true" />
                  <div>
                    <h2 className="font-extended text-lg font-bold text-[var(--sp-ink)]">Логотип сайта</h2>
                    <p className="mt-1 text-xs leading-5 text-[var(--sp-ink-tertiary)]">
                      Загрузите SVG или PNG файл логотипа. Логотип сохраняет свои оригинальные цвета и не перекрашивается при смене темы сайта.
                    </p>
                  </div>
                </div>

                {logo && (
                  <button
                    type="button"
                    onClick={() => setValue('logo', '', { shouldDirty: true })}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] px-2.5 py-1 text-xs font-semibold text-[var(--sp-ink-secondary)] hover:text-red-600 transition-colors shrink-0"
                    title="Сбросить к стандартному векторному логотипу"
                  >
                    <RotateCcw className="size-3" />
                    <span>Сбросить</span>
                  </button>
                )}
              </div>

              {/* Logo Preview Boxes (Light & Dark) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="rounded-xl border border-[var(--sp-line)] bg-white p-4 flex flex-col items-center justify-center gap-2 min-h-[90px]">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">На светлом фоне</span>
                  <SanpackLogo src={logo || undefined} variant="green" className="h-7" />
                </div>
                <div className="rounded-xl border border-zinc-800 bg-[#0F172A] p-4 flex flex-col items-center justify-center gap-2 min-h-[90px]">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">На тёмном фоне / в футере</span>
                  <SanpackLogo src={logo || undefined} variant="white" className="h-7" />
                </div>
              </div>

              {/* Upload & Path inputs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--sp-brand)] px-4 text-xs font-bold text-[var(--sp-on-brand)] hover:brightness-105 shadow-sm transition-all shrink-0">
                  {uploadingLogo ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                  <span>{uploadingLogo ? 'Загрузка...' : 'Загрузить SVG / PNG'}</span>
                  <input
                    type="file"
                    accept=".svg,.png,.webp,.jpg,.jpeg"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                    className="sr-only"
                  />
                </label>

                <div className="min-w-0 flex-1">
                  <input
                    type="text"
                    {...register('logo')}
                    placeholder="Или укажите прямую ссылку / путь к логотипу..."
                    className="admin-control text-xs w-full"
                  />
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface)] p-5 md:p-6">
              <div className="flex items-start gap-3">
                <Palette className="mt-0.5 size-5 text-[var(--sp-brand)]" aria-hidden="true" />
                <div>
                  <h2 className="font-extended text-lg font-bold text-[var(--sp-ink)]">Акцентные цвета</h2>
                  <p className="mt-1 text-xs leading-5 text-[var(--sp-ink-tertiary)]">Основной цвет управляет действиями и навигацией. Дополнительный — промо-акцентами, метками и контрастными CTA.</p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <ColorField
                  label="Основной акцент"
                  description="Главные кнопки, ссылки и активные состояния."
                  value={primaryColor}
                  error={errors.primaryColor?.message}
                  onChange={(value) => setValue('primaryColor', value, { shouldDirty: true, shouldValidate: true })}
                  inputProps={register('primaryColor')}
                />
                <ColorField
                  label="Дополнительный акцент"
                  description="Промо-элементы, бейджи и вторые действия."
                  value={secondaryColor}
                  error={errors.secondaryColor?.message}
                  onChange={(value) => setValue('secondaryColor', value, { shouldDirty: true, shouldValidate: true })}
                  inputProps={register('secondaryColor')}
                />
              </div>
            </section>

            <section className="rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface)] p-5 md:p-6">
              <fieldset>
                <legend className="font-extended text-lg font-bold text-[var(--sp-ink)]">Цветовая схема</legend>
                <p className="mt-1 text-xs leading-5 text-[var(--sp-ink-tertiary)]">Светлая схема использует белые и мягкие серые поверхности. Тёмная — глубокие нейтральные оттенки без чистого чёрного.</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {([
                    { value: 'light', title: 'Светлая', description: 'Воздушная и нейтральная', icon: Sun },
                    { value: 'dark', title: 'Тёмная', description: 'Мягкий контраст без #000', icon: Moon },
                  ] as const).map((option) => {
                    const Icon = option.icon;
                    const selected = themeMode === option.value;
                    return (
                      <label key={option.value} className={`relative flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${selected ? 'border-[var(--sp-brand)] bg-[color-mix(in_srgb,var(--sp-brand)_8%,var(--sp-surface))]' : 'border-[var(--sp-line)] hover:border-[var(--sp-line-strong)]'}`}>
                        <input type="radio" value={option.value} {...register('themeMode')} className="sr-only" />
                        <Icon className="mt-0.5 size-5 text-[var(--sp-brand)]" aria-hidden="true" />
                        <span>
                          <span className="block text-sm font-bold text-[var(--sp-ink)]">{option.title}</span>
                          <span className="mt-1 block text-xs text-[var(--sp-ink-tertiary)]">{option.description}</span>
                        </span>
                        {selected && <Check className="absolute right-3 top-3 size-4 text-[var(--sp-brand)]" aria-hidden="true" />}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </section>

            <section className="rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface)] p-5 md:p-6">
              <fieldset>
                <div className="flex items-start gap-3">
                  <Type className="mt-0.5 size-5 text-[var(--sp-brand)]" aria-hidden="true" />
                  <div>
                    <legend className="font-extended text-lg font-bold text-[var(--sp-ink)]">Шрифтовая пара</legend>
                    <p className="mt-1 text-xs leading-5 text-[var(--sp-ink-tertiary)]">Готовые пары поддерживают кириллицу и латиницу. Шрифты хранятся в сборке и не зависят от внешнего Google Fonts API.</p>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {fontPairs.map((pair) => {
                    const selected = fontPair === pair.value;
                    return (
                      <label key={pair.value} className={`relative cursor-pointer rounded-lg border p-4 transition-colors ${selected ? 'border-[var(--sp-brand)] bg-[color-mix(in_srgb,var(--sp-brand)_8%,var(--sp-surface))]' : 'border-[var(--sp-line)] hover:border-[var(--sp-line-strong)]'}`}>
                        <input type="radio" value={pair.value} {...register('fontPair')} className="sr-only" />
                        <span className="block text-xl font-bold text-[var(--sp-ink)]" style={{ fontFamily: pair.heading }}>Aa Бб</span>
                        <span className="mt-2 block text-sm font-bold text-[var(--sp-ink)]" style={{ fontFamily: pair.body }}>{pair.title}</span>
                        <span className="mt-1 block text-xs text-[var(--sp-ink-tertiary)]" style={{ fontFamily: pair.body }}>{pair.description}</span>
                        {selected && <Check className="absolute right-3 top-3 size-4 text-[var(--sp-brand)]" aria-hidden="true" />}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </section>

            <section className="rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface)] p-5 md:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-extended text-lg font-bold text-[var(--sp-ink)]">Скругление</h2>
                  <p className="mt-1 text-xs leading-5 text-[var(--sp-ink-tertiary)]">0 px создаёт строгую геометрию, 32 px — мягкий интерфейс. Пилюли остаются только там, где форма передаёт смысл.</p>
                </div>
                <output className="min-w-14 rounded-md border border-[var(--sp-line)] bg-[var(--sp-control)] px-2 py-1 text-center font-mono text-xs text-[var(--sp-ink)]">{borderRadius} px</output>
              </div>
              <input type="range" min="0" max="32" step="1" {...register('borderRadius', { valueAsNumber: true })} className="mt-5 w-full accent-[var(--sp-brand)]" aria-label="Глобальное скругление" />
            </section>
          </div>

          <aside className="sticky top-6 rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface)] p-4 shadow-[var(--sp-shadow-raised)]">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="font-compact text-xs font-bold text-[var(--sp-ink)]">Живой предпросмотр</h2>
              <span className="text-[10px] uppercase tracking-[0.08em] text-[var(--sp-ink-tertiary)]">{themeMode === 'dark' ? 'Тёмная' : 'Светлая'}</span>
            </div>
            <div
              style={previewStyle}
              className={`overflow-hidden rounded-[var(--preview-radius-outer)] border p-4 ${themeMode === 'dark' ? 'border-[#2B332E] bg-[#0F1311] text-[#F3F5F4]' : 'border-[#DCE2DE] bg-[#F6F7F6] text-[#151B18]'}`}
            >
              <div className={`rounded-[var(--preview-radius)] border p-4 shadow-sm ${themeMode === 'dark' ? 'border-[#2B332E] bg-[#151A17]' : 'border-[#DCE2DE] bg-white'}`} style={{ fontFamily: 'var(--preview-body)' }}>
                <span className="inline-flex rounded-[var(--preview-radius-inner)] bg-[var(--preview-secondary)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--preview-on-secondary)]">Новинка</span>
                <div className={`mt-3 aspect-[16/7] rounded-[var(--preview-radius-inner)] ${themeMode === 'dark' ? 'bg-[#0B0F0D]' : 'bg-[#EFF2F0]'}`} />
                <h3 className="mt-4 text-base font-bold" style={{ fontFamily: 'var(--preview-heading)' }}>Название товара</h3>
                <p className="mt-1 text-xs opacity-65">Краткое описание и ключевое преимущество</p>
                <button type="button" className="mt-4 min-h-10 w-full rounded-[var(--preview-radius-inner)] bg-[var(--preview-primary)] px-3 text-xs font-bold text-[var(--preview-on-primary)]">Добавить в корзину</button>
                <button type="button" className="mt-2 min-h-10 w-full rounded-[var(--preview-radius-inner)] bg-[var(--preview-secondary)] px-3 text-xs font-bold text-[var(--preview-on-secondary)]">Подробнее</button>
              </div>
            </div>
            <button type="submit" disabled={isSubmitting} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--sp-brand)] px-5 font-compact text-xs font-bold text-[var(--sp-on-brand)] transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60">
              <Save className="size-4" aria-hidden="true" /> {isSubmitting ? 'Сохранение…' : 'Сохранить настройки'}
            </button>
          </aside>
        </form>
      )}
    </div>
  );
}
