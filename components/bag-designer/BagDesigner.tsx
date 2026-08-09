'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import NextImage from 'next/image';
import { Check, ChevronLeft, ChevronRight, ImagePlus, LoaderCircle, PackageCheck, Phone, RotateCcw, Sparkles } from 'lucide-react';
import type { BagDesignerSettings, BagDesignSpec, BagSizePreset, BagType } from '@/lib/bag-designer/types';
import { BAG_TYPE_LABELS } from '@/lib/bag-designer/defaults';
import { parseJsonResponse } from '@/lib/http/parseJsonResponse';
import { BagTechnicalPreview } from './BagTechnicalPreview';
import { CustomSelect } from '@/components/ui/CustomSelect';

const steps = ['Пакет и размер', 'Логотип', 'Визуализация'];
const fallbackColor = { id: 'white', label: 'Белый', value: '#F7F7F2' };
const typeNotes: Record<BagType, string> = {
  tshirt: 'Для покупок и доставки. Размер включает ручки, складка задаёт полезный объём.',
  'die-cut': 'Плоский пакет с вырубной ручкой для магазинов, выставок и промо-наборов.',
  flat: 'Простой пакет без ручек для полиграфии, текстиля и лёгкой продукции.',
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function dataUrlToImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });
}

async function svgToPng(svg: SVGSVGElement) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.querySelectorAll('[data-helper]').forEach((node) => node.remove());
  clone.setAttribute('width', '1400');
  clone.setAttribute('height', '1400');
  const xml = new XMLSerializer().serializeToString(clone);
  const dataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(xml)))}`;
  const image = await dataUrlToImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = 1400;
  canvas.height = 1400;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Предпросмотр не удалось подготовить.');
  context.fillStyle = '#F4F5F3';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png', 0.92);
}

export function BagDesigner({ settings }: { settings: BagDesignerSettings }) {
  const colors = useMemo(() => {
    const productionColors = settings.colors.filter((item) => item.id !== 'neutral-gray');
    return productionColors.length ? productionColors : [fallbackColor];
  }, [settings.colors]);
  const firstPreset = settings.sizePresets.find((preset) => preset.bagType === 'tshirt') || { width: 30, height: 50, gusset: 8 };
  const [step, setStep] = useState(0);
  const [bagType, setBagType] = useState<BagType>('tshirt');
  const [width, setWidth] = useState(firstPreset.width);
  const [height, setHeight] = useState(firstPreset.height);
  const [gusset, setGusset] = useState(firstPreset.gusset);
  const [activePresetId, setActivePresetId] = useState(settings.sizePresets.find((preset) => preset.bagType === 'tshirt')?.id || '');
  const [colorId, setColorId] = useState(() => colors.find((item) => item.id === 'white')?.id || colors[0].id);
  const [finish, setFinish] = useState<'matte' | 'glossy'>('matte');
  const [quantity, setQuantity] = useState(settings.minimumQuantity);
  const [logoDataUrl, setLogoDataUrl] = useState('');
  const [logoName, setLogoName] = useState('');
  const [logoX, setLogoX] = useState(50);
  const [logoY, setLogoY] = useState(50);
  const [logoScale, setLogoScale] = useState(56);
  const [logoRotation, setLogoRotation] = useState(0);
  const [contact, setContact] = useState({ name: '', phone: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ requestId: string; requestToken: string; number: string; aiMockupUrl: string } | null>(null);
  const [submitted, setSubmitted] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem('sanpack-bag-designer-contact');
    if (!saved) return;
    try {
      const savedContact = JSON.parse(saved) as { name?: unknown; phone?: unknown };
      queueMicrotask(() => setContact({
        name: typeof savedContact.name === 'string' ? savedContact.name : '',
        phone: typeof savedContact.phone === 'string' ? savedContact.phone : '',
      }));
    } catch { /* ignore invalid local draft */ }
  }, []);

  const presets = useMemo(() => settings.sizePresets.filter((preset) => preset.bagType === bagType), [bagType, settings.sizePresets]);
  const color = colors.find((item) => item.id === colorId) || colors[0];
  const dimensionsValid = width >= 10 && width <= 120 && height >= 15 && height <= 150 && gusset >= 0 && gusset <= 40;
  const spec: BagDesignSpec = {
    bagType,
    width,
    height,
    gusset: bagType === 'tshirt' ? gusset : 0,
    color: color.value,
    colorLabel: color.label,
    finish,
    quantity,
    logoX,
    logoY,
    logoScale,
    logoRotation,
  };

  function applyPreset(preset: BagSizePreset) {
    setWidth(preset.width);
    setHeight(preset.height);
    setGusset(preset.gusset);
    setActivePresetId(preset.id);
    setResult(null);
  }

  function changeDimension(setter: (value: number) => void, value: number) {
    if (!Number.isFinite(value)) return;
    setter(value);
    setActivePresetId('');
    setResult(null);
  }

  function selectBagType(nextType: BagType) {
    const preset = settings.sizePresets.find((item) => item.bagType === nextType);
    setBagType(nextType);
    if (preset) applyPreset(preset);
    else {
      setWidth(30);
      setHeight(40);
      setGusset(nextType === 'tshirt' ? 8 : 0);
      setActivePresetId('');
    }
    setResult(null);
  }

  function selectLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) {
      setError('Загрузите PNG, JPEG или WebP размером до 8 МБ.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setLogoDataUrl(String(reader.result || ''));
      setLogoName(file.name);
      setLogoX(50);
      setLogoY(50);
      setResult(null);
      setSubmitted('');
    };
    reader.onerror = () => setError('Логотип не удалось открыть. Выберите другой файл.');
    reader.readAsDataURL(file);
  }

  function goForward() {
    setError('');
    if (step === 0 && !dimensionsValid) {
      setError('Проверьте размер: ширина 10–120 см, высота 15–150 см, складка 0–40 см.');
      return;
    }
    if (step === 1 && !logoDataUrl) {
      setError('Добавьте логотип, чтобы перейти к визуализации.');
      return;
    }
    setStep((value) => Math.min(2, value + 1));
  }

  async function generate() {
    setError('');
    setSubmitted('');
    if (!logoDataUrl) return setError('Сначала загрузите логотип.');
    if (contact.name.trim().length < 2 || contact.phone.trim().length < 7) return setError('Укажите имя и номер телефона.');
    if (!svgRef.current) return setError('Предпросмотр ещё не готов.');
    setBusy(true);
    try {
      window.localStorage.setItem('sanpack-bag-designer-contact', JSON.stringify(contact));
      const technicalPreviewDataUrl = await svgToPng(svgRef.current);
      const response = await fetch('/api/bag-designer', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'generate', contact, spec, logoName, logoDataUrl, technicalPreviewDataUrl }),
      });
      const data = await parseJsonResponse<typeof result>(response, 'Не удалось создать визуализацию.');
      if (!data) throw new Error('Сервер не вернул результат визуализации.');
      setResult(data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось создать визуализацию.');
    } finally { setBusy(false); }
  }

  async function submit() {
    if (!result) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/bag-designer', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'submit', requestId: result.requestId, requestToken: result.requestToken }),
      });
      const data = await parseJsonResponse<{ message: string }>(response, 'Заявку не удалось отправить.');
      setSubmitted(data.message);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Заявку не удалось отправить.');
    } finally { setBusy(false); }
  }

  const fieldClass = 'mt-2 min-h-12 w-full rounded-[var(--sp-radius-control)] border border-[var(--sp-control-border)] bg-[var(--sp-control-bg)] px-3 text-base text-[var(--sp-ink)] outline-none transition-colors focus-visible:border-[var(--sp-brand)] focus-visible:ring-2 focus-visible:ring-[var(--sp-brand-soft)]';

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 md:py-12">
      <div className="mb-7 max-w-3xl">
        <p className="font-compact text-xs font-bold uppercase tracking-[0.12em] text-[var(--sp-brand)]">Конструктор пакета</p>
        <h1 className="mt-3 font-extended text-3xl font-bold leading-tight text-balance md:text-5xl">Соберите пакет <span className="whitespace-nowrap">под свой бренд</span></h1>
        <p className="mt-3 text-sm leading-6 text-[var(--sp-ink-secondary)] md:text-base">Задайте точный размер, выберите материал и разместите логотип. После этого мы подготовим визуализацию и расчёт тиража.</p>
      </div>

      <nav className="mb-5 flex gap-1 overflow-x-auto" aria-label="Этапы конструктора">
        {steps.map((label, index) => (
          <button
            key={label}
            type="button"
            onClick={() => index <= step && setStep(index)}
            disabled={index > step}
            aria-current={index === step ? 'step' : undefined}
            className={`min-h-11 min-w-max flex-1 rounded-[var(--sp-radius-control)] border px-4 text-left text-xs font-bold transition-colors ${index === step ? 'border-[var(--sp-brand)] bg-[var(--sp-brand)] text-[var(--sp-on-brand)]' : index < step ? 'border-[var(--sp-brand)] bg-[var(--sp-brand-soft)] text-[var(--sp-brand)]' : 'border-[var(--sp-line)] bg-[var(--sp-surface)] text-[var(--sp-ink-muted)]'}`}
          >
            <span className="mr-2 opacity-70">0{index + 1}</span>{label}
          </button>
        ))}
      </nav>

      <div className="grid overflow-hidden rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface)] lg:grid-cols-[minmax(0,1.08fr)_minmax(390px,.92fr)]">
        <div className="border-b border-[var(--sp-line)] bg-[#F4F5F3] p-4 lg:border-b-0 lg:border-r lg:p-7">
          <div className="sticky top-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div>
                <p className="font-bold text-[var(--sp-ink)]">{BAG_TYPE_LABELS[bagType]}</p>
                <p className="mt-1 text-[var(--sp-ink-tertiary)]">Эскиз меняет пропорции вместе с размером</p>
              </div>
              <p className="rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-white px-3 py-2 font-bold text-[#46514C]">
                {width} × {height} см{bagType === 'tshirt' && gusset > 0 ? ` · складка ${gusset} см` : ''}
              </p>
            </div>
            <BagTechnicalPreview
              spec={spec}
              logoDataUrl={logoDataUrl}
              svgRef={svgRef}
              onLogoPositionChange={(x, y) => { setLogoX(x); setLogoY(y); setResult(null); }}
            />
            <p className="mt-2 text-center text-xs leading-5 text-[#68736E]">Технический эскиз показывает пропорции и область печати. На следующем этапе логотип можно перемещать прямо по пакету.</p>
          </div>
        </div>

        <div className="flex min-h-[620px] flex-col p-5 md:p-7">
          <div className="flex-1">
            {step === 0 ? (
              <div>
                <h2 className="font-extended text-xl font-bold">Пакет и точный размер</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--sp-ink-tertiary)]">Начните с готового варианта или введите свои значения в сантиметрах.</p>

                <fieldset className="mt-5">
                  <legend className="text-xs font-bold">Форма пакета</legend>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                    {(Object.keys(BAG_TYPE_LABELS) as BagType[]).map((type) => (
                      <button key={type} type="button" onClick={() => selectBagType(type)} className={`min-h-20 rounded-[var(--sp-radius-control)] border p-3 text-left transition-colors ${bagType === type ? 'border-[var(--sp-brand)] bg-[var(--sp-brand-soft)]' : 'border-[var(--sp-line)] hover:border-[var(--sp-brand)]'}`}>
                        <span className="flex items-start justify-between gap-2 text-xs font-bold">{BAG_TYPE_LABELS[type]}{bagType === type ? <Check className="size-4 shrink-0 text-[var(--sp-brand)]" aria-hidden="true" /> : null}</span>
                        <span className="mt-1.5 block text-[11px] leading-4 text-[var(--sp-ink-tertiary)]">{typeNotes[type]}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="mt-6 border-t border-[var(--sp-line)] pt-5">
                  <legend className="text-xs font-bold">Готовые размеры</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {presets.map((preset) => (
                      <button key={preset.id} type="button" onClick={() => applyPreset(preset)} className={`min-h-10 rounded-[var(--sp-radius-control)] border px-3 text-xs font-bold ${activePresetId === preset.id ? 'border-[var(--sp-brand)] bg-[var(--sp-brand)] text-[var(--sp-on-brand)]' : 'border-[var(--sp-line)] bg-[var(--sp-surface)] hover:border-[var(--sp-brand)]'}`}>
                        {preset.label}{preset.gusset ? ` · ${preset.gusset} см` : ''}
                      </button>
                    ))}
                    {!activePresetId ? <span className="inline-flex min-h-10 items-center rounded-[var(--sp-radius-control)] border border-dashed border-[var(--sp-brand)] px-3 text-xs font-bold text-[var(--sp-brand)]">Свой размер</span> : null}
                  </div>
                </fieldset>

                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <label className="text-xs font-bold">Ширина, см
                    <input type="number" min="10" max="120" step="1" value={width} onChange={(event) => changeDimension(setWidth, event.currentTarget.valueAsNumber)} onBlur={() => setWidth((value) => clamp(value, 10, 120))} className={fieldClass} />
                  </label>
                  <label className="text-xs font-bold">Высота, см
                    <input type="number" min="15" max="150" step="1" value={height} onChange={(event) => changeDimension(setHeight, event.currentTarget.valueAsNumber)} onBlur={() => setHeight((value) => clamp(value, 15, 150))} className={fieldClass} />
                  </label>
                  <label className="col-span-2 text-xs font-bold sm:col-span-1">Складка, см
                    <input type="number" min="0" max="40" step="1" value={bagType === 'tshirt' ? gusset : 0} disabled={bagType !== 'tshirt'} onChange={(event) => changeDimension(setGusset, event.currentTarget.valueAsNumber)} onBlur={() => setGusset((value) => clamp(value, 0, 40))} className={`${fieldClass} disabled:cursor-not-allowed disabled:opacity-45`} />
                  </label>
                </div>
                <p className="mt-2 text-xs text-[var(--sp-ink-muted)]">Ширина 10–120 см · высота 15–150 см{bagType === 'tshirt' ? ' · складка 0–40 см' : ' · для этой формы складка не используется'}</p>

                <fieldset className="mt-6 border-t border-[var(--sp-line)] pt-5">
                  <legend className="text-xs font-bold">Цвет готового пакета</legend>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {colors.map((item) => (
                      <button key={item.id} type="button" onClick={() => { setColorId(item.id); setResult(null); }} className={`flex min-h-12 items-center gap-2 rounded-[var(--sp-radius-control)] border px-3 text-left text-xs font-bold ${colorId === item.id ? 'border-[var(--sp-brand)] bg-[var(--sp-brand-soft)]' : 'border-[var(--sp-line)]'}`}>
                        <span className="size-6 shrink-0 rounded-[calc(var(--sp-radius-control)/2)] border border-black/20" style={{ backgroundColor: item.value }} aria-hidden="true" />{item.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[var(--sp-ink-muted)]">Выбранный цвет используется в готовой визуализации. Технический эскиз слева всегда остаётся нейтральным.</p>
                </fieldset>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <CustomSelect
                    label="Поверхность"
                    value={finish}
                    onChange={(value) => { setFinish(value as 'matte' | 'glossy'); setResult(null); }}
                    options={[{ value: 'matte', label: 'Матовая' }, { value: 'glossy', label: 'Глянцевая' }]}
                    size="lg"
                  />
                  <label className="text-xs font-bold">Тираж, шт.
                    <input type="number" min={settings.minimumQuantity} step="100" value={quantity} onChange={(event) => setQuantity(Math.max(settings.minimumQuantity, event.currentTarget.valueAsNumber || settings.minimumQuantity))} className={fieldClass} />
                  </label>
                </div>
                <p className="mt-2 text-xs text-[var(--sp-ink-muted)]">Минимальный тираж: {settings.minimumQuantity.toLocaleString('ru-RU')} шт. Точную стоимость рассчитает менеджер.</p>
              </div>
            ) : null}

            {step === 1 ? (
              <div>
                <h2 className="font-extended text-xl font-bold">Добавьте логотип</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--sp-ink-tertiary)]">Загрузите файл и перетащите логотип по серому эскизу слева. Голубая рамка показывает безопасную область печати.</p>
                <label className="relative mt-5 flex min-h-28 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[var(--sp-radius-control)] border border-dashed border-[var(--sp-control-border)] bg-[var(--sp-surface-inset)] p-4 text-center hover:border-[var(--sp-brand)] focus-within:border-[var(--sp-brand)] focus-within:ring-2 focus-within:ring-[var(--sp-brand-soft)]">
                  <ImagePlus className="size-6 text-[var(--sp-brand)]" aria-hidden="true" />
                  <span className="mt-2 text-sm font-bold">{logoName || 'Выбрать логотип'}</span>
                  <span className="mt-1 text-xs text-[var(--sp-ink-muted)]">PNG, JPEG или WebP · до 8 МБ</span>
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={selectLogo} className="absolute inset-0 cursor-pointer opacity-0" />
                </label>
                {logoDataUrl ? (
                  <div className="mt-5 grid gap-5 rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] p-4">
                    <label className="text-xs font-bold">Ширина логотипа · {logoScale}% области печати
                      <input type="range" min="18" max="92" value={logoScale} onChange={(event) => { setLogoScale(Number(event.target.value)); setResult(null); }} className="mt-3 w-full accent-[var(--sp-brand)]" />
                    </label>
                    <label className="text-xs font-bold">Поворот · {logoRotation}°
                      <input type="range" min="-30" max="30" value={logoRotation} onChange={(event) => { setLogoRotation(Number(event.target.value)); setResult(null); }} className="mt-3 w-full accent-[var(--sp-brand)]" />
                    </label>
                    <button type="button" onClick={() => { setLogoX(50); setLogoY(50); setLogoScale(56); setLogoRotation(0); setResult(null); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-[var(--sp-surface)] text-xs font-bold"><RotateCcw className="size-4" aria-hidden="true" /> По центру и исходный размер</button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {step === 2 ? (
              <div>
                <h2 className="font-extended text-xl font-bold">Получите визуализацию</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--sp-ink-tertiary)]">Оставьте контакты перед первой генерацией. После просмотра можно отправить макет менеджеру и получить расчёт.</p>
                {result ? (
                  <div className="mt-5 overflow-hidden rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-[var(--sp-surface-inset)]">
                    <NextImage src={result.aiMockupUrl} alt="Визуализация пакета" width={1024} height={1280} unoptimized className="aspect-[4/5] w-full object-cover" />
                    <div className="border-t border-[var(--sp-line)] p-4"><p className="text-xs text-[var(--sp-ink-tertiary)]">Макет {result.number}</p><p className="mt-1 text-sm font-bold">Визуализация готова</p></div>
                  </div>
                ) : (
                  <div className="mt-5 grid gap-4">
                    <label className="text-xs font-bold">Имя
                      <input value={contact.name} onChange={(event) => setContact((current) => ({ ...current, name: event.target.value }))} autoComplete="name" className={fieldClass} placeholder="Как к вам обращаться" />
                    </label>
                    <label className="text-xs font-bold">Телефон
                      <input value={contact.phone} onChange={(event) => setContact((current) => ({ ...current, phone: event.target.value }))} autoComplete="tel" inputMode="tel" className={fieldClass} placeholder="+998 90 000 00 00" />
                    </label>
                    <button type="button" disabled={busy} onClick={() => void generate()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-5 text-sm font-bold text-[var(--sp-on-brand)] disabled:opacity-50">{busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}{busy ? 'Создаём визуализацию…' : 'Создать визуализацию'}</button>
                  </div>
                )}
                {result && !submitted ? <button type="button" disabled={busy} onClick={() => void submit()} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-5 text-sm font-bold text-[var(--sp-on-brand)] disabled:opacity-50"><Phone className="size-4" aria-hidden="true" /> Получить расчёт</button> : null}
                {submitted ? <div role="status" className="mt-4 rounded-[var(--sp-radius-control)] border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800"><PackageCheck className="mb-2 size-5" aria-hidden="true" />{submitted}</div> : null}
              </div>
            ) : null}
          </div>

          <div aria-live="polite">{error ? <p role="alert" className="mt-4 rounded-[var(--sp-radius-control)] border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}</div>
          <div className="mt-6 flex gap-3 border-t border-[var(--sp-line)] pt-5">
            <button type="button" onClick={() => { setError(''); setStep((value) => Math.max(0, value - 1)); }} disabled={step === 0} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] text-xs font-bold disabled:opacity-35"><ChevronLeft className="size-4" aria-hidden="true" /> Назад</button>
            {step < 2 ? <button type="button" onClick={goForward} className="inline-flex min-h-11 flex-[1.5] items-center justify-center gap-2 rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-4 text-xs font-bold text-[var(--sp-on-brand)]">{step === 0 ? 'Перейти к логотипу' : 'Перейти к визуализации'} <ChevronRight className="size-4" aria-hidden="true" /></button> : null}
          </div>
        </div>
      </div>

      <p className="mx-auto mt-4 max-w-3xl text-center text-xs leading-5 text-[var(--sp-ink-muted)]">Эскиз и визуализация показывают идею. Перед производством технолог SANPACK проверит размеры, материал и зону нанесения.</p>
    </section>
  );
}
