'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { CircleHelp, Minus, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/Chart';
import type { AnalyticsDashboardReport } from '@/lib/analytics/contracts';

const presets = [
  ['Сегодня', 1], ['Вчера', -1], ['7 дней', 7], ['30 дней', 30], ['90 дней', 90],
] as const;

type TrendSeries = 'visitors' | 'sessions' | 'pageViews' | 'productViews' | 'cartAdds' | 'requests';

const metricDefinitions: Array<{
  key: keyof Pick<AnalyticsDashboardReport['metrics'], 'visitors' | 'sessions' | 'pageViews' | 'productViews' | 'cartAdds' | 'requests' | 'conversionRate'>;
  label: string;
  description: string;
}> = [
  { key: 'visitors', label: 'Посетители', description: 'Уникальные анонимные посетители за выбранный период.' },
  { key: 'sessions', label: 'Сессии', description: 'Отдельные периоды активности посетителей.' },
  { key: 'pageViews', label: 'Просмотры страниц', description: 'Все просмотры страниц витрины.' },
  { key: 'productViews', label: 'Просмотры товаров', description: 'Открытия карточек товаров.' },
  { key: 'cartAdds', label: 'Добавления в корзину', description: 'Сколько раз товары добавили в корзину.' },
  { key: 'requests', label: 'Заявки', description: 'Успешно созданные заявки, подтверждённые сервером.' },
  { key: 'conversionRate', label: 'Конверсия', description: 'Доля посетителей, которые отправили заявку.' },
];

const trendLabels: Record<TrendSeries, string> = {
  visitors: 'Посетители', sessions: 'Сессии', pageViews: 'Просмотры страниц',
  productViews: 'Просмотры товаров', cartAdds: 'Добавления в корзину', requests: 'Заявки',
};

const funnelLabels = {
  visitors: 'Посетители', product_viewers: 'Смотрели товары', cart_adders: 'Добавили в корзину',
  request_starters: 'Начали заявку', request_creators: 'Отправили заявку',
} as const;

function businessDay(offset = 0) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date(Date.now() + offset * 86_400_000));
}

function presetRange(days: number) {
  if (days === -1) return { from: businessDay(-1), to: businessDay(-1) };
  return { from: businessDay(-(days - 1)), to: businessDay() };
}

function format(value: number) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value);
}

function sourceLabel(source: string) {
  const known: Record<string, string> = {
    direct: 'Прямые заходы', telegram: 'Telegram', instagram: 'Instagram', facebook: 'Facebook',
    social: 'Социальные сети', google: 'Google', search: 'Поисковые системы', organic: 'Поисковые системы',
    referral: 'Переходы с других сайтов', unknown: 'Источник не определён', internal: 'Прямые заходы',
  };
  return known[source.toLocaleLowerCase()] || source.replace(/[_-]+/g, ' ').replace(/^./, (letter) => letter.toLocaleUpperCase('ru-RU'));
}

function mediumLabel(medium: string) {
  const known: Record<string, string> = {
    '—': '', paid_social: 'Платная реклама в соцсетях', cpc: 'Платная реклама', organic: 'Органический переход',
    referral: 'Переход с сайта', email: 'Email', social: 'Социальные сети',
  };
  return known[medium.toLocaleLowerCase()] ?? medium.replace(/[_-]+/g, ' ');
}

function platformLabel(value: string) {
  return value === 'telegram_mini_app' ? 'Telegram Mini App' : value === 'web' ? 'Сайт' : 'Не определено';
}

function deviceLabel(value: string) {
  return ({ mobile: 'Мобильные', tablet: 'Планшеты', desktop: 'Компьютеры' } as Record<string, string>)[value] || 'Не определено';
}

function localeLabel(value: string) {
  return ({ ru: 'Русский', uz: 'O‘zbekcha', en: 'English', zh: '中文' } as Record<string, string>)[value] || value.toLocaleUpperCase();
}

export function AnalyticsDashboard() {
  const [dates, setDates] = useState(presetRange(7));
  const [filters, setFilters] = useState({ locale: '', surface: '', source: '', campaign: '' });
  const [report, setReport] = useState<AnalyticsDashboardReport | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [series, setSeries] = useState<TrendSeries>('visitors');

  const load = useCallback(async () => {
    setStatus('loading');
    const values = { ...dates, ...filters };
    const params = new URLSearchParams(Object.fromEntries(Object.entries(values).filter(([, value]) => value)));
    try {
      const response = await fetch(`/api/admin/analytics?${params}`, { credentials: 'same-origin', cache: 'no-store' });
      if (!response.ok) throw new Error('Analytics report failed.');
      setReport(await response.json());
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [dates, filters]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <div className="space-y-5">
      <section className="admin-panel p-4 sm:p-5" aria-label="Фильтры аналитики">
        <div className="flex flex-wrap items-center gap-2">
          {presets.map(([label, days]) => {
            const range = presetRange(days);
            const active = dates.from === range.from && dates.to === range.to;
            return <button key={label} type="button" aria-pressed={active} onClick={() => setDates(range)} className={`min-h-9 rounded-[var(--sp-radius-control)] px-3 text-xs font-bold transition-colors ${active ? 'bg-[var(--sp-brand)] text-[var(--sp-on-brand)]' : 'border border-[var(--sp-line)] bg-[var(--sp-surface)] text-[var(--sp-ink-secondary)] hover:bg-[var(--sp-surface-inset)]'}`}>{label}</button>;
          })}
          {status === 'loading' && report ? <span className="ml-auto flex items-center gap-1.5 text-xs text-[var(--sp-ink-tertiary)]" role="status"><RefreshCw className="size-3.5 animate-spin" aria-hidden="true" />Обновляем…</span> : null}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <DateField label="От" value={dates.from} onChange={(from) => setDates((current) => ({ ...current, from }))} />
          <DateField label="До" value={dates.to} onChange={(to) => setDates((current) => ({ ...current, to }))} />
          <Select label="Язык" value={filters.locale} values={[[ '', 'Все языки' ], [ 'ru', 'RU' ], [ 'uz', 'UZ' ], [ 'en', 'EN' ], [ 'zh', 'ZH' ]]} onChange={(locale) => setFilters((current) => ({ ...current, locale }))} />
          <Select label="Платформа" value={filters.surface} values={[[ '', 'Все платформы' ], [ 'web', 'Сайт' ], [ 'telegram_mini_app', 'Telegram Mini App' ]]} onChange={(surface) => setFilters((current) => ({ ...current, surface }))} />
          <Select label="Источник" value={filters.source} values={[[ '', 'Все источники' ], ...(report?.filters.sources || []).map((value) => [value, sourceLabel(value)] as [string, string])]} onChange={(source) => setFilters((current) => ({ ...current, source }))} />
          <Select label="Кампания" value={filters.campaign} values={[[ '', 'Все кампании' ], ...(report?.filters.campaigns || []).map((value) => [value, value] as [string, string])]} onChange={(campaign) => setFilters((current) => ({ ...current, campaign }))} />
        </div>
      </section>

      {status === 'loading' && !report ? <div className="admin-panel p-10 text-center text-sm text-[var(--sp-ink-secondary)]" aria-live="polite">Загружаем аналитику…</div> : null}
      {status === 'error' ? <section role="alert" className="sp-alert sp-alert-danger flex flex-wrap items-center justify-between gap-4"><span>Аналитика временно недоступна. Данные не подменены нулями.</span><button type="button" onClick={() => void load()} className="admin-button-secondary"><RefreshCw className="size-4" aria-hidden="true" />Повторить</button></section> : null}
      {report ? <Report report={report} series={series} onSeriesChange={setSeries} /> : null}
    </div>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="admin-field-label">{label}<input type="date" value={value} onChange={(event) => onChange(event.target.value)} className="admin-control mt-1 h-10 min-h-10 text-xs" /></label>;
}

function Select({ label, value, values, onChange }: { label: string; value: string; values: [string, string][]; onChange: (value: string) => void }) {
  return <label className="admin-field-label">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="admin-control mt-1 h-10 min-h-10 text-xs">{values.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>;
}

function Report({ report, series, onSeriesChange }: { report: AnalyticsDashboardReport; series: TrendSeries; onSeriesChange: (series: TrendSeries) => void }) {
  const [productSort, setProductSort] = useState<'views' | 'cartAdds' | 'requests'>('views');
  const sortedProducts = useMemo(() => report.topProducts.slice().sort((left, right) => right[productSort] - left[productSort]), [productSort, report.topProducts]);
  const started = report.collectionStartedAt ? new Date(report.collectionStartedAt) : null;
  const maxProductViews = Math.max(1, ...sortedProducts.map((product) => product.views));

  return <>
    <p className="text-xs text-[var(--sp-ink-tertiary)]" title={started?.toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent' })}>
      {started ? `Статистика собирается с ${started.toLocaleDateString('ru-RU', { timeZone: 'Asia/Tashkent', day: 'numeric', month: 'long', year: 'numeric' })}` : 'Данных пока нет — статистика появится после первого посещения.'}
      {report.truncated ? ' · Для этого отчёта показаны первые 50 000 событий' : ''}
    </p>
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 min-[1600px]:grid-cols-7" aria-label="Ключевые показатели">
      {metricDefinitions.map((definition) => <MetricCard key={definition.key} definition={definition} report={report} />)}
    </section>
    <ActivityChart report={report} series={series} onSeriesChange={onSeriesChange} />
    <section className="grid gap-5 xl:grid-cols-2"><Funnel report={report} /><SourceBreakdown rows={report.breakdowns.source} /></section>
    <section className="space-y-2">
      <div className="flex justify-end"><select value={productSort} onChange={(event) => setProductSort(event.target.value as typeof productSort)} aria-label="Сортировка товаров" className="admin-control h-10 min-h-10 w-auto text-xs"><option value="views">По просмотрам</option><option value="cartAdds">По добавлениям в корзину</option><option value="requests">По заявкам</option></select></div>
      <DataTable title="Самые интересные товары" description="Что смотрят, добавляют в корзину и включают в заявки." headers={['Товар', 'Просмотры', 'Посетители', 'В корзину', 'Заявки', 'Конверсия']} rows={sortedProducts.map((product) => [
        <span key={product.productId}><b>{product.name}</b><small className="mt-0.5 block text-[var(--sp-ink-tertiary)]">SKU {product.sku}</small></span>,
        <span key="views" className="block min-w-24"><strong className="tabular-nums">{product.views}</strong><span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-[var(--sp-surface-inset)]"><span className="block h-full rounded-full bg-[var(--sp-brand)]" style={{ width: `${Math.max(4, product.views / maxProductViews * 100)}%` }} /></span></span>,
        product.visitors, product.cartAdds, product.requests, `${product.viewToRequestPercent}%`,
      ])} />
    </section>
    <DataTable title="Рекламные кампании" description="Результат UTM-меток от первого визита до отправленной заявки." headers={['Кампания', 'Источник', 'Сессии', 'Просмотры товаров', 'В корзину', 'Заявки', 'Конверсия']} rows={report.campaigns.map((campaign) => [
      campaign.campaign === '—' ? 'Без кампании' : campaign.campaign,
      <span key={`${campaign.source}-${campaign.medium}`}><b>{sourceLabel(campaign.source)}</b>{mediumLabel(campaign.medium) ? <small className="mt-0.5 block text-[var(--sp-ink-tertiary)]">{mediumLabel(campaign.medium)}</small> : null}</span>,
      campaign.sessions, campaign.productViews, campaign.cartAdds, campaign.requests, `${campaign.conversionPercent}%`,
    ])} emptyText="Запустите ссылку с UTM-метками, чтобы сравнивать рекламные кампании." />
    <section className="grid gap-5 xl:grid-cols-2"><DataTable title="Популярные страницы" headers={['Страница', 'Просмотры', 'Посетители']} rows={report.topPages.map((page) => [page.pathname, page.views, page.visitors])} /><DataTable title="Поиски без результатов" description="Запросы, по которым стоит дополнить каталог или названия товаров." headers={['Запрос', 'Поиски']} rows={report.zeroResultSearches.map((search) => [search.query, search.searches])} /></section>
    <section className="grid gap-5 sm:grid-cols-3"><Breakdown title="Языки" rows={report.breakdowns.locale} label={localeLabel} /><Breakdown title="Устройства" rows={report.breakdowns.device} label={deviceLabel} /><Breakdown title="Платформы" rows={report.breakdowns.surface} label={platformLabel} /></section>
  </>;
}

function MetricCard({ definition, report }: { definition: typeof metricDefinitions[number]; report: AnalyticsDashboardReport }) {
  const item = report.metrics[definition.key];
  const change = item.changePercent;
  return <article className="admin-panel min-w-0 p-4">
    <div className="flex items-center gap-1.5"><p className="text-[11px] font-bold leading-4 text-[var(--sp-ink-tertiary)]">{definition.label}</p><span title={definition.description} aria-label={definition.description} className="inline-flex text-[var(--sp-ink-muted)]"><CircleHelp className="size-3.5" aria-hidden="true" /></span></div>
    <p className="mt-2 text-3xl font-bold tracking-[-0.04em] tabular-nums">{format(item.value)}{definition.key === 'conversionRate' ? '%' : ''}</p>
    {definition.key === 'visitors' ? <p className="mt-1 text-[11px] leading-4 text-[var(--sp-ink-secondary)]">Новые: {report.metrics.newVisitors.value} · Вернулись: {report.metrics.returningVisitors.value}</p> : null}
    {change === null ? <span className="sr-only">Недостаточно данных для сравнения</span> : change === 0 ? <p className="mt-2 flex items-center gap-1 text-[11px] text-[var(--sp-ink-tertiary)]"><Minus className="size-3" aria-hidden="true" />Без изменений</p> : <p className={`mt-2 flex items-center gap-1 text-[11px] ${change < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>{change < 0 ? <TrendingDown className="size-3" aria-hidden="true" /> : <TrendingUp className="size-3" aria-hidden="true" />}{change > 0 ? '+' : ''}{format(change)}% к прошлому периоду</p>}
  </article>;
}

function ActivityChart({ report, series, onSeriesChange }: { report: AnalyticsDashboardReport; series: TrendSeries; onSeriesChange: (series: TrendSeries) => void }) {
  const values = report.trend.map((item) => item[series]);
  const total = report.metrics[series].value;
  const activeBuckets = values.filter((value) => value > 0).length;
  const tick = (bucket: string) => report.period.granularity === 'hour' ? bucket.slice(11, 16) : new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' }).format(new Date(`${bucket}T00:00:00+05:00`));
  const fullLabel = (bucket: string | number) => {
    const value = String(bucket);
    const date = new Date(report.period.granularity === 'hour' ? `${value}:00+05:00` : `${value}T00:00:00+05:00`);
    return new Intl.DateTimeFormat('ru-RU', { timeZone: 'Asia/Tashkent', day: 'numeric', month: 'long', ...(report.period.granularity === 'hour' ? { hour: '2-digit', minute: '2-digit' } : {}) }).format(date);
  };
  const chartConfig = { [series]: { label: trendLabels[series], color: 'var(--sp-brand)' } };
  const common = { data: report.trend, margin: { top: 12, right: 8, left: -14, bottom: 0 }, accessibilityLayer: true };

  return <section className="admin-panel p-4 sm:p-5" aria-labelledby="activity-title">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="activity-title" className="font-bold">Активность по времени</h2><p className="mt-1 text-xs text-[var(--sp-ink-tertiary)]">{trendLabels[series]} · {format(total)} за выбранный период</p></div><label className="flex items-center gap-2 text-xs font-bold text-[var(--sp-ink-secondary)]"><span className="sr-only sm:not-sr-only">Показатель</span><select value={series} onChange={(event) => onSeriesChange(event.target.value as TrendSeries)} aria-label="Показатель графика" className="admin-control h-10 min-h-10 w-full min-w-52 text-xs sm:w-auto">{Object.entries(trendLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
    {total === 0 ? <div className="grid h-[250px] place-items-center text-center"><div><p className="text-sm font-semibold text-[var(--sp-ink-secondary)]">За выбранный период активности пока нет</p><p className="mt-1 text-xs text-[var(--sp-ink-tertiary)]">Попробуйте другой период или снимите дополнительные фильтры.</p></div></div> : <>
      {total <= 2 ? <p className="mt-4 rounded-[var(--sp-radius-control-inner)] bg-[var(--sp-surface-inset)] px-3 py-2 text-xs text-[var(--sp-ink-secondary)]">Пока мало данных для устойчивой динамики — показаны фактические интервалы.</p> : null}
      <ChartContainer config={chartConfig} className="mt-3 h-[250px]">
        {activeBuckets <= 1 ? <BarChart {...common}><CartesianGrid vertical={false} stroke="var(--sp-line-soft)" /><XAxis dataKey="bucket" tickFormatter={tick} tickLine={false} axisLine={false} minTickGap={28} tick={{ fill: 'var(--sp-ink-tertiary)', fontSize: 11 }} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} width={38} tick={{ fill: 'var(--sp-ink-tertiary)', fontSize: 11 }} /><ChartTooltip cursor={{ fill: 'var(--sp-surface-inset)' }} content={<ChartTooltipContent labelFormatter={fullLabel} />} /><Bar dataKey={series} name={trendLabels[series]} fill={`var(--color-${series})`} radius={[6, 6, 0, 0]} maxBarSize={30} /></BarChart> : <AreaChart {...common}><defs><linearGradient id={`analytics-${series}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={`var(--color-${series})`} stopOpacity={0.22} /><stop offset="95%" stopColor={`var(--color-${series})`} stopOpacity={0.02} /></linearGradient></defs><CartesianGrid vertical={false} stroke="var(--sp-line-soft)" /><XAxis dataKey="bucket" tickFormatter={tick} tickLine={false} axisLine={false} minTickGap={28} tick={{ fill: 'var(--sp-ink-tertiary)', fontSize: 11 }} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} width={38} tick={{ fill: 'var(--sp-ink-tertiary)', fontSize: 11 }} /><ChartTooltip cursor={{ stroke: 'var(--sp-line-strong)', strokeDasharray: '4 4' }} content={<ChartTooltipContent labelFormatter={fullLabel} />} /><Area type="linear" dataKey={series} name={trendLabels[series]} stroke={`var(--color-${series})`} strokeWidth={2.25} fill={`url(#analytics-${series})`} dot={report.trend.length <= 31 ? { r: 2.5, strokeWidth: 1.5, fill: 'var(--sp-surface)' } : false} activeDot={{ r: 5, strokeWidth: 2, fill: 'var(--sp-surface)' }} /></AreaChart>}
      </ChartContainer>
      <p className="sr-only">{trendLabels[series]}: {report.trend.map((point) => `${fullLabel(point.bucket)} — ${point[series]}`).join('; ')}</p>
    </>}
  </section>;
}

function Funnel({ report }: { report: AnalyticsDashboardReport }) {
  return <section className="admin-panel p-5" aria-labelledby="analytics-funnel-title"><h2 id="analytics-funnel-title" className="font-bold">Путь до заявки</h2><p className="mt-1 text-xs text-[var(--sp-ink-tertiary)]">Приближённая воронка за выбранный период.</p><div className="mt-5 space-y-4">{report.funnel.map((step) => <div key={step.key}><div className="flex items-end justify-between gap-4 text-sm"><span className="font-medium">{funnelLabels[step.key]}</span><span className="text-right"><strong className="tabular-nums">{step.count}</strong>{step.fromPreviousPercent !== null ? <small className="ml-2 text-[var(--sp-ink-tertiary)]">{step.fromPreviousPercent}% от прошлого шага</small> : null}</span></div><div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[var(--sp-surface-inset)]" aria-hidden="true"><div className="h-full rounded-full bg-[var(--sp-brand)] transition-[width] duration-300" style={{ width: `${Math.max(step.count ? 3 : 0, Math.min(100, step.overallPercent))}%`, opacity: 0.48 + step.overallPercent / 200 }} /></div></div>)}</div></section>;
}

function SourceBreakdown({ rows }: { rows: Array<{ key: string; sessions: number }> }) {
  const total = rows.reduce((sum, row) => sum + row.sessions, 0);
  return <section className="admin-panel p-5" aria-labelledby="analytics-source-title"><h2 id="analytics-source-title" className="font-bold">Источники трафика</h2><p className="mt-1 text-xs text-[var(--sp-ink-tertiary)]">Откуда начались сессии посетителей.</p><div className="mt-5 space-y-4">{rows.map((row) => { const share = total > 0 ? Math.round(row.sessions / total * 100) : 0; return <div key={row.key}><div className="flex items-end justify-between gap-4 text-sm"><span className="font-medium">{sourceLabel(row.key)}</span><span className="tabular-nums"><strong>{row.sessions}</strong><small className="ml-2 text-[var(--sp-ink-tertiary)]">{share}%</small></span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--sp-surface-inset)]" aria-hidden="true"><div className="h-full rounded-full bg-[var(--sp-brand)]" style={{ width: `${share}%` }} /></div></div>; })}{!rows.length ? <p className="py-8 text-center text-sm text-[var(--sp-ink-tertiary)]">За выбранный период источников пока нет.</p> : null}</div></section>;
}

function Breakdown({ title, rows, label }: { title: string; rows: Array<{ key: string; sessions: number }>; label: (value: string) => string }) {
  return <section className="admin-panel p-5"><h2 className="font-bold">{title}</h2><div className="mt-4 space-y-3">{rows.map((row) => <div key={row.key} className="flex justify-between gap-4 text-sm"><span className="truncate">{label(row.key)}</span><strong className="tabular-nums">{row.sessions}</strong></div>)}{!rows.length ? <p className="text-sm text-[var(--sp-ink-tertiary)]">Нет данных</p> : null}</div></section>;
}

function DataTable({ title, description, headers, rows, emptyText = 'За выбранный период данных пока нет.' }: { title: string; description?: string; headers: string[]; rows: Array<Array<React.ReactNode>>; emptyText?: string }) {
  return <section className="admin-panel overflow-hidden"><div className="p-5"><h2 className="font-bold">{title}</h2>{description ? <p className="mt-1 text-xs text-[var(--sp-ink-tertiary)]">{description}</p> : null}</div><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-[var(--sp-surface-inset)] text-xs text-[var(--sp-ink-tertiary)]"><tr>{headers.map((header) => <th key={header} className="whitespace-nowrap px-4 py-3 font-bold">{header}</th>)}</tr></thead><tbody className="divide-y divide-[var(--sp-line)]">{rows.map((row, index) => <tr key={index} className="hover:bg-[var(--sp-surface-inset)]/50">{row.map((cell, cellIndex) => <td key={cellIndex} className="whitespace-nowrap px-4 py-3 first:whitespace-normal">{cell}</td>)}</tr>)}{!rows.length ? <tr><td colSpan={headers.length} className="px-4 py-10 text-center text-[var(--sp-ink-tertiary)]">{emptyText}</td></tr> : null}</tbody></table></div></section>;
}
