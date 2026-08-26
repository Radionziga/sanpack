'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import NextImage from 'next/image';
import { Check, ChevronLeft, ChevronRight, ImagePlus, LoaderCircle, PackageCheck, Phone, RotateCcw, Sparkles } from 'lucide-react';
import type { BagDesignerSettings, BagDesignSpec, BagSizePreset, BagType } from '@/lib/bag-designer/types';
import { BAG_TYPE_LABELS } from '@/lib/bag-designer/defaults';
import { parseJsonResponse } from '@/lib/http/parseJsonResponse';
import { BagTechnicalPreview } from './BagTechnicalPreview';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { useLanguage } from '@/context/LanguageContext';

const fallbackColor = { id: 'white', label: 'Белый', value: '#F7F7F2' };

const designerCopy = {
  ru: {
    steps: ['Пакет и размер', 'Логотип', 'Визуализация'],
    typeLabels: BAG_TYPE_LABELS,
    typeNotes: {
      tshirt: 'Для покупок и доставки. Размер включает ручки, складка задаёт полезный объём.',
      'die-cut': 'Плоский пакет с вырубной ручкой для магазинов, выставок и промо-наборов.',
      flat: 'Простой пакет без ручек для полиграфии, текстиля и лёгкой продукции.',
    },
    eyebrow: 'Конструктор пакета', title: 'Соберите пакет под свой бренд',
    intro: 'Задайте точный размер, выберите материал и разместите логотип. После этого мы подготовим визуализацию и расчёт тиража.',
    stepsLabel: 'Этапы конструктора', proportional: 'Эскиз меняет пропорции вместе с размером', gusset: 'складка', unitCm: 'см',
    previewHint: 'Технический эскиз показывает пропорции и область печати. На следующем этапе логотип можно перемещать прямо по пакету.',
    sizeTitle: 'Пакет и точный размер', sizeIntro: 'Начните с готового варианта или введите свои значения в сантиметрах.',
    bagShape: 'Форма пакета', presets: 'Готовые размеры', customSize: 'Свой размер', width: 'Ширина, см', height: 'Высота, см', gussetLabel: 'Складка, см',
    limitsWithGusset: 'Ширина 10–120 см · высота 15–150 см · складка 0–40 см', limitsWithoutGusset: 'Ширина 10–120 см · высота 15–150 см · для этой формы складка не используется',
    bagColor: 'Цвет готового пакета', colorHint: 'Выбранный цвет используется в готовой визуализации. Технический эскиз слева всегда остаётся нейтральным.',
    finish: 'Поверхность', matte: 'Матовая', glossy: 'Глянцевая', quantity: 'Тираж, шт.', minimum: 'Минимальный тираж', minimumSuffix: 'шт. Точную стоимость рассчитает менеджер.',
    logoTitle: 'Добавьте логотип', logoIntro: 'Загрузите файл и перетащите логотип по серому эскизу слева. Голубая рамка показывает безопасную область печати.', chooseLogo: 'Выбрать логотип', fileHint: 'PNG, JPEG или WebP · до 8 МБ',
    logoWidth: 'Ширина логотипа', printArea: 'области печати', rotation: 'Поворот', resetLogo: 'По центру и исходный размер',
    visualizationTitle: 'Получите визуализацию', visualizationIntro: 'Оставьте контакты перед первой генерацией. После просмотра можно отправить макет менеджеру и получить расчёт.',
    visualizationAlt: 'Визуализация пакета', layout: 'Макет', ready: 'Визуализация готова', name: 'Имя', namePlaceholder: 'Как к вам обращаться', phone: 'Телефон',
    creating: 'Создаём визуализацию…', create: 'Создать визуализацию', getEstimate: 'Получить расчёт', back: 'Назад', toLogo: 'Перейти к логотипу', toVisualization: 'Перейти к визуализации',
    disclaimer: 'Эскиз и визуализация показывают идею. Перед производством наш технолог проверит размеры, материал и зону нанесения.',
    errors: {
      file: 'Загрузите PNG, JPEG или WebP размером до 8 МБ.', logoOpen: 'Логотип не удалось открыть. Выберите другой файл.',
      size: 'Проверьте размер: ширина 10–120 см, высота 15–150 см, складка 0–40 см.', addLogo: 'Добавьте логотип, чтобы перейти к визуализации.',
      uploadFirst: 'Сначала загрузите логотип.', contacts: 'Укажите имя и номер телефона.', preview: 'Предпросмотр ещё не готов.',
      generate: 'Не удалось создать визуализацию.', noResult: 'Сервер не вернул результат визуализации.', submit: 'Заявку не удалось отправить.',
    },
    colorLabels: {} as Record<string, string>,
  },
  zh: {
    steps: ['包装袋与尺寸', '品牌标识', '效果图'],
    typeLabels: { tshirt: '背心袋', 'die-cut': '冲孔手提袋', flat: '平口袋' } as Record<BagType, string>,
    typeNotes: {
      tshirt: '适合购物和配送。尺寸包含提手，侧褶决定实际容量。',
      'die-cut': '带冲孔提手的平口袋，适合门店、展会和促销套装。',
      flat: '无提手的简洁包装袋，适合印刷品、纺织品和轻型商品。',
    },
    eyebrow: '包装袋设计器', title: '为您的品牌定制包装袋',
    intro: '设置准确尺寸，选择颜色并放置品牌标识。完成后，我们将生成效果图并核算生产数量。',
    stepsLabel: '设计步骤', proportional: '示意图会随尺寸同步调整比例', gusset: '侧褶', unitCm: '厘米',
    previewHint: '技术示意图展示包装袋比例和安全印刷区域。下一步可直接拖动品牌标识。',
    sizeTitle: '包装袋与准确尺寸', sizeIntro: '可选择常用尺寸，也可以输入自定义尺寸（厘米）。',
    bagShape: '包装袋类型', presets: '常用尺寸', customSize: '自定义尺寸', width: '宽度（厘米）', height: '高度（厘米）', gussetLabel: '侧褶（厘米）',
    limitsWithGusset: '宽度 10–120 厘米 · 高度 15–150 厘米 · 侧褶 0–40 厘米', limitsWithoutGusset: '宽度 10–120 厘米 · 高度 15–150 厘米 · 此袋型不使用侧褶',
    bagColor: '成品包装袋颜色', colorHint: '所选颜色将用于最终效果图；左侧技术示意图始终保持中性色。',
    finish: '表面效果', matte: '哑光', glossy: '亮光', quantity: '生产数量（件）', minimum: '最低生产数量', minimumSuffix: '件。准确价格由客户经理核算。',
    logoTitle: '添加品牌标识', logoIntro: '上传文件并在左侧示意图上拖动标识。蓝色边框表示安全印刷区域。', chooseLogo: '选择品牌标识', fileHint: 'PNG、JPEG 或 WebP · 最大 8 MB',
    logoWidth: '标识宽度', printArea: '印刷区域', rotation: '旋转角度', resetLogo: '恢复居中与默认大小',
    visualizationTitle: '生成效果图', visualizationIntro: '首次生成前请填写联系方式。查看效果后，可将设计发送给客户经理并获取报价。',
    visualizationAlt: '包装袋效果图', layout: '设计编号', ready: '效果图已生成', name: '姓名', namePlaceholder: '如何称呼您', phone: '电话',
    creating: '正在生成效果图…', create: '生成效果图', getEstimate: '获取报价', back: '返回', toLogo: '下一步：添加标识', toVisualization: '下一步：生成效果图',
    disclaimer: '示意图和效果图仅用于展示设计概念。生产前，技术人员会核对尺寸、材料和印刷区域。',
    errors: {
      file: '请上传不超过 8 MB 的 PNG、JPEG 或 WebP 文件。', logoOpen: '无法打开该标识文件，请选择其他文件。',
      size: '请检查尺寸：宽度 10–120 厘米，高度 15–150 厘米，侧褶 0–40 厘米。', addLogo: '请先添加品牌标识，再进入效果图步骤。',
      uploadFirst: '请先上传品牌标识。', contacts: '请填写姓名和电话号码。', preview: '技术示意图尚未准备好。',
      generate: '无法生成效果图。', noResult: '服务器未返回效果图结果。', submit: '申请发送失败。',
    },
    colorLabels: { 'sanpack-green': 'SANPACK 品牌绿', white: '白色', black: '黑色', kraft: '牛皮纸色', transparent: '半透明' },
  },
} as const;

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

async function svgToPng(svg: SVGSVGElement, errorMessage: string) {
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
  if (!context) throw new Error(errorMessage);
  context.fillStyle = '#F4F5F3';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png', 0.92);
}

export function BagDesigner({ settings }: { settings: BagDesignerSettings }) {
  const { language } = useLanguage();
  const copy = language === 'zh' ? designerCopy.zh : designerCopy.ru;
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
  const generationAttemptRef = useRef<{
    signature: string;
    generationKey: string;
    requestToken: string;
  } | null>(null);

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
  const colorLabel = copy.colorLabels[color.id as keyof typeof copy.colorLabels] || color.label;
  const dimensionsValid = width >= 10 && width <= 120 && height >= 15 && height <= 150 && gusset >= 0 && gusset <= 40;
  const spec: BagDesignSpec = {
    bagType,
    width,
    height,
    gusset: bagType === 'tshirt' ? gusset : 0,
    color: color.value,
    colorLabel,
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
      setError(copy.errors.file);
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
    reader.onerror = () => setError(copy.errors.logoOpen);
    reader.readAsDataURL(file);
  }

  function goForward() {
    setError('');
    if (step === 0 && !dimensionsValid) {
      setError(copy.errors.size);
      return;
    }
    if (step === 1 && !logoDataUrl) {
      setError(copy.errors.addLogo);
      return;
    }
    setStep((value) => Math.min(2, value + 1));
  }

  async function generate() {
    setError('');
    setSubmitted('');
    if (!logoDataUrl) return setError(copy.errors.uploadFirst);
    if (contact.name.trim().length < 2 || contact.phone.trim().length < 7) return setError(copy.errors.contacts);
    if (!svgRef.current) return setError(copy.errors.preview);
    setBusy(true);
    try {
      window.localStorage.setItem('sanpack-bag-designer-contact', JSON.stringify(contact));
      const technicalPreviewDataUrl = await svgToPng(svgRef.current, copy.errors.preview);
      const signature = JSON.stringify({ contact, spec, logoName, logoDataUrl });
      if (generationAttemptRef.current?.signature !== signature) {
        generationAttemptRef.current = {
          signature,
          generationKey: crypto.randomUUID(),
          requestToken: `${crypto.randomUUID()}${crypto.randomUUID()}`,
        };
      }
      const attempt = generationAttemptRef.current;
      const response = await fetch('/api/bag-designer', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          contact,
          spec,
          logoName,
          logoDataUrl,
          technicalPreviewDataUrl,
          generationKey: attempt.generationKey,
          requestToken: attempt.requestToken,
        }),
      });
      const data = await parseJsonResponse<typeof result>(response, copy.errors.generate);
      if (!data) throw new Error(copy.errors.noResult);
      setResult(data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : copy.errors.generate);
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
      const data = await parseJsonResponse<{ message: string }>(response, copy.errors.submit);
      setSubmitted(data.message);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : copy.errors.submit);
    } finally { setBusy(false); }
  }

  const fieldClass = 'mt-2 min-h-12 w-full rounded-[var(--sp-radius-control)] border border-[var(--sp-control-border)] bg-[var(--sp-control-bg)] px-3 text-base text-[var(--sp-ink)] outline-none transition-colors focus-visible:border-[var(--sp-brand)] focus-visible:ring-2 focus-visible:ring-[var(--sp-brand-soft)]';

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 md:py-12">
      <div className="mb-7 max-w-3xl">
        <p className="font-compact text-xs font-bold uppercase tracking-[0.12em] text-[var(--sp-brand)]">{copy.eyebrow}</p>
        <h1 className="mt-3 font-extended text-3xl font-bold leading-tight text-balance md:text-5xl">{copy.title}</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--sp-ink-secondary)] md:text-base">{copy.intro}</p>
      </div>

      <nav className="mb-5 flex gap-1 overflow-x-auto" aria-label={copy.stepsLabel}>
        {copy.steps.map((label, index) => (
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
        <div className="border-b border-[var(--sp-line)] bg-[var(--sp-surface-inset)] p-4 lg:border-b-0 lg:border-r lg:p-7">
          <div className="sticky top-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div>
                <p className="font-bold text-[var(--sp-ink)]">{copy.typeLabels[bagType]}</p>
                <p className="mt-1 text-[var(--sp-ink-tertiary)]">{copy.proportional}</p>
              </div>
              <p className="rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-[var(--sp-surface)] px-3 py-2 font-bold text-[var(--sp-ink-secondary)]">
                {width} × {height} {copy.unitCm}{bagType === 'tshirt' && gusset > 0 ? ` · ${copy.gusset} ${gusset} ${copy.unitCm}` : ''}
              </p>
            </div>
            <BagTechnicalPreview
              spec={spec}
              logoDataUrl={logoDataUrl}
              svgRef={svgRef}
              language={language}
              onLogoPositionChange={(x, y) => { setLogoX(x); setLogoY(y); setResult(null); }}
            />
            <p className="mt-2 text-center text-xs leading-5 text-[var(--sp-ink-tertiary)]">{copy.previewHint}</p>
          </div>
        </div>

        <div className="flex min-h-[620px] flex-col p-5 md:p-7">
          <div className="flex-1">
            {step === 0 ? (
              <div>
                <h2 className="font-extended text-xl font-bold">{copy.sizeTitle}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--sp-ink-tertiary)]">{copy.sizeIntro}</p>

                <fieldset className="mt-5">
                  <legend className="text-xs font-bold">{copy.bagShape}</legend>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                    {(Object.keys(BAG_TYPE_LABELS) as BagType[]).map((type) => (
                      <button key={type} type="button" onClick={() => selectBagType(type)} className={`min-h-20 rounded-[var(--sp-radius-control)] border p-3 text-left transition-colors ${bagType === type ? 'border-[var(--sp-brand)] bg-[var(--sp-brand-soft)]' : 'border-[var(--sp-line)] hover:border-[var(--sp-brand)]'}`}>
                        <span className="flex items-start justify-between gap-2 text-xs font-bold">{copy.typeLabels[type]}{bagType === type ? <Check className="size-4 shrink-0 text-[var(--sp-brand)]" aria-hidden="true" /> : null}</span>
                        <span className="mt-1.5 block text-[11px] leading-4 text-[var(--sp-ink-tertiary)]">{copy.typeNotes[type]}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="mt-6 border-t border-[var(--sp-line)] pt-5">
                  <legend className="text-xs font-bold">{copy.presets}</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {presets.map((preset) => (
                      <button key={preset.id} type="button" onClick={() => applyPreset(preset)} className={`min-h-10 rounded-[var(--sp-radius-control)] border px-3 text-xs font-bold ${activePresetId === preset.id ? 'border-[var(--sp-brand)] bg-[var(--sp-brand)] text-[var(--sp-on-brand)]' : 'border-[var(--sp-line)] bg-[var(--sp-surface)] hover:border-[var(--sp-brand)]'}`}>
                        {language === 'zh' ? preset.label.replace(/см/g, '厘米') : preset.label}{preset.gusset ? ` · ${preset.gusset} ${copy.unitCm}` : ''}
                      </button>
                    ))}
                    {!activePresetId ? <span className="inline-flex min-h-10 items-center rounded-[var(--sp-radius-control)] border border-dashed border-[var(--sp-brand)] px-3 text-xs font-bold text-[var(--sp-brand)]">{copy.customSize}</span> : null}
                  </div>
                </fieldset>

                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <label className="text-xs font-bold">{copy.width}
                    <input type="number" min="10" max="120" step="1" value={width} onChange={(event) => changeDimension(setWidth, event.currentTarget.valueAsNumber)} onBlur={() => setWidth((value) => clamp(value, 10, 120))} className={fieldClass} />
                  </label>
                  <label className="text-xs font-bold">{copy.height}
                    <input type="number" min="15" max="150" step="1" value={height} onChange={(event) => changeDimension(setHeight, event.currentTarget.valueAsNumber)} onBlur={() => setHeight((value) => clamp(value, 15, 150))} className={fieldClass} />
                  </label>
                  <label className="col-span-2 text-xs font-bold sm:col-span-1">{copy.gussetLabel}
                    <input type="number" min="0" max="40" step="1" value={bagType === 'tshirt' ? gusset : 0} disabled={bagType !== 'tshirt'} onChange={(event) => changeDimension(setGusset, event.currentTarget.valueAsNumber)} onBlur={() => setGusset((value) => clamp(value, 0, 40))} className={`${fieldClass} disabled:cursor-not-allowed disabled:opacity-45`} />
                  </label>
                </div>
                <p className="mt-2 text-xs text-[var(--sp-ink-muted)]">{bagType === 'tshirt' ? copy.limitsWithGusset : copy.limitsWithoutGusset}</p>

                <fieldset className="mt-6 border-t border-[var(--sp-line)] pt-5">
                  <legend className="text-xs font-bold">{copy.bagColor}</legend>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {colors.map((item) => (
                      <button key={item.id} type="button" onClick={() => { setColorId(item.id); setResult(null); }} className={`flex min-h-12 items-center gap-2 rounded-[var(--sp-radius-control)] border px-3 text-left text-xs font-bold ${colorId === item.id ? 'border-[var(--sp-brand)] bg-[var(--sp-brand-soft)]' : 'border-[var(--sp-line)]'}`}>
                        <span className="size-6 shrink-0 rounded-[calc(var(--sp-radius-control)/2)] border border-black/20" style={{ backgroundColor: item.value }} aria-hidden="true" />{copy.colorLabels[item.id as keyof typeof copy.colorLabels] || item.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[var(--sp-ink-muted)]">{copy.colorHint}</p>
                </fieldset>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <CustomSelect
                    label={copy.finish}
                    value={finish}
                    onChange={(value) => { setFinish(value as 'matte' | 'glossy'); setResult(null); }}
                    options={[{ value: 'matte', label: copy.matte }, { value: 'glossy', label: copy.glossy }]}
                    size="lg"
                  />
                  <label className="text-xs font-bold">{copy.quantity}
                    <input type="number" min={settings.minimumQuantity} step="100" value={quantity} onChange={(event) => setQuantity(Math.max(settings.minimumQuantity, event.currentTarget.valueAsNumber || settings.minimumQuantity))} className={fieldClass} />
                  </label>
                </div>
                <p className="mt-2 text-xs text-[var(--sp-ink-muted)]">{copy.minimum}: {settings.minimumQuantity.toLocaleString(language === 'zh' ? 'zh-CN' : 'ru-RU')} {copy.minimumSuffix}</p>
              </div>
            ) : null}

            {step === 1 ? (
              <div>
                <h2 className="font-extended text-xl font-bold">{copy.logoTitle}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--sp-ink-tertiary)]">{copy.logoIntro}</p>
                <label className="relative mt-5 flex min-h-28 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[var(--sp-radius-control)] border border-dashed border-[var(--sp-control-border)] bg-[var(--sp-surface-inset)] p-4 text-center hover:border-[var(--sp-brand)] focus-within:border-[var(--sp-brand)] focus-within:ring-2 focus-within:ring-[var(--sp-brand-soft)]">
                  <ImagePlus className="size-6 text-[var(--sp-brand)]" aria-hidden="true" />
                  <span className="mt-2 text-sm font-bold">{logoName || copy.chooseLogo}</span>
                  <span className="mt-1 text-xs text-[var(--sp-ink-muted)]">{copy.fileHint}</span>
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={selectLogo} className="absolute inset-0 cursor-pointer opacity-0" />
                </label>
                {logoDataUrl ? (
                  <div className="mt-5 grid gap-5 rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] p-4">
                    <label className="text-xs font-bold">{copy.logoWidth} · {logoScale}% {copy.printArea}
                      <input type="range" min="18" max="92" value={logoScale} onChange={(event) => { setLogoScale(Number(event.target.value)); setResult(null); }} className="mt-3 w-full accent-[var(--sp-brand)]" />
                    </label>
                    <label className="text-xs font-bold">{copy.rotation} · {logoRotation}°
                      <input type="range" min="-30" max="30" value={logoRotation} onChange={(event) => { setLogoRotation(Number(event.target.value)); setResult(null); }} className="mt-3 w-full accent-[var(--sp-brand)]" />
                    </label>
                    <button type="button" onClick={() => { setLogoX(50); setLogoY(50); setLogoScale(56); setLogoRotation(0); setResult(null); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-[var(--sp-surface)] text-xs font-bold"><RotateCcw className="size-4" aria-hidden="true" /> {copy.resetLogo}</button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {step === 2 ? (
              <div>
                <h2 className="font-extended text-xl font-bold">{copy.visualizationTitle}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--sp-ink-tertiary)]">{copy.visualizationIntro}</p>
                {result ? (
                  <div className="mt-5 overflow-hidden rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-[var(--sp-surface-inset)]">
                    <NextImage src={result.aiMockupUrl} alt={copy.visualizationAlt} width={1024} height={1280} unoptimized className="aspect-[4/5] w-full object-cover" />
                    <div className="border-t border-[var(--sp-line)] p-4"><p className="text-xs text-[var(--sp-ink-tertiary)]">{copy.layout} {result.number}</p><p className="mt-1 text-sm font-bold">{copy.ready}</p></div>
                  </div>
                ) : (
                  <div className="mt-5 grid gap-4">
                    <label className="text-xs font-bold">{copy.name}
                      <input value={contact.name} onChange={(event) => setContact((current) => ({ ...current, name: event.target.value }))} autoComplete="name" className={fieldClass} placeholder={copy.namePlaceholder} />
                    </label>
                    <label className="text-xs font-bold">{copy.phone}
                      <input value={contact.phone} onChange={(event) => setContact((current) => ({ ...current, phone: event.target.value }))} autoComplete="tel" inputMode="tel" className={fieldClass} placeholder="+998 90 000 00 00" />
                    </label>
                    <button type="button" disabled={busy} onClick={() => void generate()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-5 text-sm font-bold text-[var(--sp-on-brand)] disabled:opacity-50">{busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}{busy ? copy.creating : copy.create}</button>
                  </div>
                )}
                {result && !submitted ? <button type="button" disabled={busy} onClick={() => void submit()} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-5 text-sm font-bold text-[var(--sp-on-brand)] disabled:opacity-50"><Phone className="size-4" aria-hidden="true" /> {copy.getEstimate}</button> : null}
                {submitted ? <div role="status" className="mt-4 rounded-[var(--sp-radius-control)] border border-[color-mix(in_srgb,var(--sp-success)_32%,var(--sp-line))] bg-[color-mix(in_srgb,var(--sp-success)_8%,var(--sp-surface))] p-4 text-sm text-[var(--sp-success)]"><PackageCheck className="mb-2 size-5" aria-hidden="true" />{submitted}</div> : null}
              </div>
            ) : null}
          </div>

          <div aria-live="polite">{error ? <p role="alert" className="sp-alert sp-alert-danger mt-4 text-sm">{error}</p> : null}</div>
          <div className="mt-6 flex gap-3 border-t border-[var(--sp-line)] pt-5">
            <button type="button" onClick={() => { setError(''); setStep((value) => Math.max(0, value - 1)); }} disabled={step === 0} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] text-xs font-bold disabled:opacity-35"><ChevronLeft className="size-4" aria-hidden="true" /> {copy.back}</button>
            {step < 2 ? <button type="button" onClick={goForward} className="inline-flex min-h-11 flex-[1.5] items-center justify-center gap-2 rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-4 text-xs font-bold text-[var(--sp-on-brand)]">{step === 0 ? copy.toLogo : copy.toVisualization} <ChevronRight className="size-4" aria-hidden="true" /></button> : null}
          </div>
        </div>
      </div>

      <p className="mx-auto mt-4 max-w-3xl text-center text-xs leading-5 text-[var(--sp-ink-muted)]">{copy.disclaimer}</p>
    </section>
  );
}
