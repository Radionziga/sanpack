'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import type { AnalyticsDashboardReport } from '@/lib/analytics/contracts';

const presets = [
  ['Сегодня', 1], ['Вчера', -1], ['7 дней', 7], ['30 дней', 30], ['90 дней', 90],
] as const;
const labels = {
  visitors: 'Посетители', sessions: 'Сессии', pageViews: 'Просмотры страниц',
  productViews: 'Просмотры товаров', cartAdds: 'Добавления в корзину',
  requests: 'Заявки', conversionRate: 'Конверсия',
} as const;

function businessDay(offset = 0) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date(Date.now() + offset * 86_400_000));
}
function presetRange(days: number) {
  if (days === -1) return { from: businessDay(-1), to: businessDay(-1) };
  return { from: businessDay(-(days - 1)), to: businessDay() };
}
function format(value: number) { return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value); }

export function AnalyticsDashboard() {
  const [dates, setDates] = useState(presetRange(7));
  const [filters, setFilters] = useState({ locale: '', surface: '', source: '', campaign: '' });
  const [report, setReport] = useState<AnalyticsDashboardReport | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [series, setSeries] = useState<'visitors' | 'sessions' | 'productViews' | 'cartAdds' | 'requests'>('visitors');
  const load = useCallback(async () => {
    setStatus('loading');
    const values = { ...dates, ...filters };
    const params = new URLSearchParams(Object.fromEntries(Object.entries(values).filter(([, value]) => value)));
    try {
      const response = await fetch(`/api/admin/analytics?${params}`, { credentials: 'same-origin', cache: 'no-store' });
      if (!response.ok) throw new Error('Analytics report failed.');
      setReport(await response.json());
      setStatus('ready');
    } catch { setStatus('error'); }
  }, [dates, filters]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const chart = useMemo(() => {
    if (!report?.trend.length) return '';
    const max = Math.max(1, ...report.trend.map((item) => item[series]));
    return report.trend.map((item, index) => `${(index / Math.max(1, report.trend.length - 1)) * 100},${36 - item[series] / max * 32}`).join(' ');
  }, [report, series]);

  return <div className="space-y-6">
    <section className="admin-panel p-4">
      <div className="flex flex-wrap gap-2">{presets.map(([label, days]) => <button key={label} type="button" onClick={() => setDates(presetRange(days))} className="admin-button-secondary min-h-10">{label}</button>)}</div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <DateField label="От" value={dates.from} onChange={(from) => setDates((current) => ({ ...current, from }))} />
        <DateField label="До" value={dates.to} onChange={(to) => setDates((current) => ({ ...current, to }))} />
        <Select label="Язык" value={filters.locale} values={[['','Все'],['ru','RU'],['uz','UZ'],['en','EN'],['zh','ZH']]} onChange={(locale) => setFilters((current) => ({ ...current, locale }))} />
        <Select label="Поверхность" value={filters.surface} values={[['','Все'],['web','Web'],['telegram_mini_app','Telegram Mini App']]} onChange={(surface) => setFilters((current) => ({ ...current, surface }))} />
        <Select label="Источник" value={filters.source} values={[['','Все'],...(report?.filters.sources || []).map((value) => [value,value] as [string,string])]} onChange={(source) => setFilters((current) => ({ ...current, source }))} />
        <Select label="Кампания" value={filters.campaign} values={[['','Все'],...(report?.filters.campaigns || []).map((value) => [value,value] as [string,string])]} onChange={(campaign) => setFilters((current) => ({ ...current, campaign }))} />
      </div>
    </section>
    {status === 'loading' ? <div className="admin-panel p-10 text-center" aria-live="polite">Загружаем аналитику…</div> : null}
    {status === 'error' ? <section role="alert" className="sp-alert sp-alert-danger flex items-center justify-between gap-4"><span>Аналитика временно недоступна.</span><button type="button" onClick={() => void load()} className="admin-button-secondary"><RefreshCw className="size-4" />Повторить</button></section> : null}
    {status === 'ready' && report ? <Report report={report} chart={chart} series={series} onSeriesChange={setSeries} /> : null}
  </div>;
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="admin-field-label">{label}<input type="date" value={value} onChange={(event) => onChange(event.target.value)} className="admin-control mt-1" /></label>; }
function Select({ label, value, values, onChange }: { label: string; value: string; values: [string,string][]; onChange: (value: string) => void }) { return <label className="admin-field-label">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="admin-control mt-1">{values.map(([key,text]) => <option key={key} value={key}>{text}</option>)}</select></label>; }

function Report({ report, chart, series, onSeriesChange }: { report: AnalyticsDashboardReport; chart: string; series: 'visitors' | 'sessions' | 'productViews' | 'cartAdds' | 'requests'; onSeriesChange: (series: 'visitors' | 'sessions' | 'productViews' | 'cartAdds' | 'requests') => void }) {
  const [productSort, setProductSort] = useState<'views' | 'cartAdds' | 'requests'>('views');
  const sortedProducts = useMemo(() => report.topProducts.slice().sort((left, right) => right[productSort] - left[productSort]), [productSort, report.topProducts]);
  return <>
    <p className="text-xs text-[var(--sp-ink-tertiary)]">{report.collectionStartedAt ? `Сбор данных начат ${new Date(report.collectionStartedAt).toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent' })}` : 'Данных пока нет — сбор начнётся с первого storefront-события.'}{report.truncated ? ' · Отчёт ограничен 50 000 событиями' : ''}</p>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Object.entries(labels).map(([key, label]) => {
        const item = report.metrics[key as keyof typeof labels];
        const down = item.changePercent !== null && item.changePercent < 0;
        return <article key={key} className="admin-panel p-5"><p className="text-xs font-bold text-[var(--sp-ink-tertiary)]">{label}</p><p className="mt-2 text-3xl font-bold tabular-nums">{format(item.value)}{key === 'conversionRate' ? '%' : ''}</p>{key === 'visitors' ? <p className="mt-1 text-xs text-[var(--sp-ink-secondary)]">Новые: {report.metrics.newVisitors.value} · Вернувшиеся: {report.metrics.returningVisitors.value}</p> : null}<p className={`mt-2 flex items-center gap-1 text-xs ${down ? 'text-rose-600' : 'text-emerald-700'}`}>{item.changePercent === null ? 'Нет базы сравнения' : <>{down ? <TrendingDown className="size-3"/> : <TrendingUp className="size-3"/>}{format(item.changePercent)}% к прошлому периоду</>}</p></article>;
      })}
    </section>
    <section className="admin-panel p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold">Активность</h2><select value={series} onChange={(event) => onSeriesChange(event.target.value as typeof series)} aria-label="Показатель графика" className="admin-control w-auto"><option value="visitors">Посетители</option><option value="sessions">Сессии</option><option value="productViews">Просмотры товаров</option><option value="cartAdds">Корзина</option><option value="requests">Заявки</option></select></div>{chart ? <svg viewBox="0 0 100 40" className="mt-5 h-52 w-full overflow-visible" role="img" aria-label="Динамика выбранного показателя"><path d="M0 36H100" stroke="currentColor" opacity=".12"/><polyline points={chart} fill="none" stroke="var(--sp-brand)" strokeWidth="1.2" vectorEffect="non-scaling-stroke"/></svg> : <p className="mt-5 text-sm text-[var(--sp-ink-tertiary)]">За период нет активности.</p>}</section>
    <section className="grid gap-5 xl:grid-cols-2">
      <section className="admin-panel overflow-hidden"><h2 id="analytics-funnel-title" className="p-5 font-bold">Воронка</h2><div className="divide-y divide-[var(--sp-line)]">{report.funnel.map((step) => <div key={step.key} className="flex items-center justify-between gap-4 px-5 py-3 text-sm"><span>{({ visitors: 'Посетители', product_viewers: 'Смотрели товары', cart_adders: 'Добавили в корзину', request_starters: 'Начали заявку', request_creators: 'Отправили заявку' } as const)[step.key]}</span><span className="text-right"><strong className="block">{step.count} · {step.overallPercent}%</strong>{step.fromPreviousPercent !== null ? <small className="text-[var(--sp-ink-tertiary)]">{step.fromPreviousPercent}% от прошлого шага</small> : null}</span></div>)}</div></section>
      <Breakdown title="Источники" rows={report.breakdowns.source}/>
    </section>
    <section className="space-y-2"><div className="flex justify-end"><select value={productSort} onChange={(event) => setProductSort(event.target.value as typeof productSort)} aria-label="Сортировка товаров" className="admin-control w-auto"><option value="views">По просмотрам</option><option value="cartAdds">По корзине</option><option value="requests">По заявкам</option></select></div><DataTable title="Самые интересные товары" headers={['Товар','Просмотры','Посетители','Корзина','Заявки','View → Cart','View → Заявка']} rows={sortedProducts.map((product) => [<span key={product.productId}><b>{product.name}</b><small className="block text-[var(--sp-ink-tertiary)]">{product.sku}</small></span>, product.views, product.visitors, product.cartAdds, product.requests, `${product.viewToCartPercent}%`, `${product.viewToRequestPercent}%`])}/></section>
    <DataTable title="Кампании" headers={['Источник','Канал','Кампания','Сессии','Товары','Корзина','Заявки','Конверсия']} rows={report.campaigns.map((campaign) => [campaign.source, campaign.medium, campaign.campaign, campaign.sessions, campaign.productViews, campaign.cartAdds, campaign.requests, `${campaign.conversionPercent}%`])}/>
    <section className="grid gap-5 xl:grid-cols-2"><DataTable title="Популярные страницы" headers={['Страница','Просмотры','Посетители']} rows={report.topPages.map((page) => [page.pathname, page.views, page.visitors])}/><DataTable title="Поиски без результатов" headers={['Запрос','Поиски']} rows={report.zeroResultSearches.map((search) => [search.query, search.searches])}/></section>
    <section className="grid gap-5 sm:grid-cols-3"><Breakdown title="Языки" rows={report.breakdowns.locale}/><Breakdown title="Устройства" rows={report.breakdowns.device}/><Breakdown title="Поверхности" rows={report.breakdowns.surface}/></section>
  </>;
}

function Breakdown({ title, rows }: { title: string; rows: Array<{ key: string; sessions: number }> }) {
  return <section className="admin-panel p-5"><h2 className="font-bold">{title}</h2><div className="mt-4 space-y-3">{rows.map((row) => <div key={row.key} className="flex justify-between gap-4 text-sm"><span className="truncate">{row.key}</span><strong>{row.sessions}</strong></div>)}{!rows.length ? <p className="text-sm text-[var(--sp-ink-tertiary)]">Нет данных</p> : null}</div></section>;
}

function DataTable({ title, headers, rows }: { title: string; headers: string[]; rows: Array<Array<React.ReactNode>> }) {
  return <section className="admin-panel overflow-hidden"><h2 className="p-5 font-bold">{title}</h2><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-[var(--sp-surface-inset)] text-xs text-[var(--sp-ink-tertiary)]"><tr>{headers.map((header) => <th key={header} className="px-4 py-3 font-bold">{header}</th>)}</tr></thead><tbody className="divide-y divide-[var(--sp-line)]">{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex} className="whitespace-nowrap px-4 py-3 first:whitespace-normal">{cell}</td>)}</tr>)}{!rows.length ? <tr><td colSpan={headers.length} className="px-4 py-8 text-center text-[var(--sp-ink-tertiary)]">Нет данных</td></tr> : null}</tbody></table></div></section>;
}
