'use client';

import { useCallback, useRef, useState } from 'react';
import {
  AlertTriangle, ArrowDownToLine, Check, ChevronDown, CircleAlert, FileCheck2,
  FileSpreadsheet, History, LoaderCircle, RefreshCw, RotateCcw, UploadCloud,
} from 'lucide-react';

type PreviewStatus = 'change' | 'unchanged' | 'warning' | 'conflict' | 'error';
type BatchStatus = 'ready' | 'invalid' | 'applied' | 'rolled_back';

interface PreviewRow {
  sku: string;
  productTitle: string;
  variantTitle: string;
  before: number | null;
  current: number | null;
  after: number | null;
  delta: number | null;
  deltaPercent: number | null;
  status: PreviewStatus;
  message?: string;
}

interface BatchDto {
  batchId: string;
  createdAt: string;
  appliedAt?: string;
  rolledBackAt?: string;
  actorLabel: string;
  originalFilename: string;
  status: BatchStatus;
  summary: { changes: number; unchanged: number; warnings: number; conflicts: number; errors: number };
  changedProductCount: number;
  changedRowCount: number;
  warningCount: number;
  rows: PreviewRow[];
}

interface HistoryItem {
  batchId: string;
  createdAt: string;
  appliedAt?: string;
  rolledBackAt?: string;
  actorLabel: string;
  changedProductCount: number;
  changedRowCount: number;
  warningCount: number;
  status: BatchStatus;
  originalFilename: string;
}

interface RollbackDto {
  batch: BatchDto;
  conflictCount: number;
  rows: Array<PreviewRow & { conflict: boolean }>;
}

const number = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const percent = new Intl.NumberFormat('ru-RU', { style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero' });
const date = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function price(value: number | null) {
  return value === null ? '—' : `${number.format(value)} сум`;
}

function changesLabel(value: number) {
  const mod100 = value % 100;
  const mod10 = value % 10;
  const noun = mod100 >= 11 && mod100 <= 14 ? 'изменений' : mod10 === 1 ? 'изменение' : mod10 >= 2 && mod10 <= 4 ? 'изменения' : 'изменений';
  return `${value} ${noun}`;
}

function pricesLabel(value: number) {
  const mod100 = value % 100;
  const mod10 = value % 10;
  const noun = mod100 >= 11 && mod100 <= 14 ? 'цен' : mod10 === 1 ? 'цена' : mod10 >= 2 && mod10 <= 4 ? 'цены' : 'цен';
  return `${value} ${noun}`;
}

function statusLabel(status: PreviewStatus) {
  return ({ change: 'Изменение', unchanged: 'Без изменений', warning: 'Предупреждение', conflict: 'Конфликт', error: 'Ошибка' })[status];
}

function batchStatus(status: BatchStatus) {
  return ({ ready: 'Готово к применению', invalid: 'Нужна проверка', applied: 'Применено', rolled_back: 'Отменено' })[status];
}

async function json<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok) throw new Error(body?.error || 'Операция не выполнена.');
  return body as T;
}

function Summary({ batch }: { batch: BatchDto }) {
  const metrics = [
    ['Изменений', batch.summary.changes],
    ['Без изменений', batch.summary.unchanged],
    ['Предупреждений', batch.summary.warnings],
    ['Конфликтов', batch.summary.conflicts],
    ['Ошибок', batch.summary.errors],
  ];
  return <div className="grid grid-cols-2 gap-2 sm:grid-cols-5" aria-label="Результат проверки Excel">
    {metrics.map(([label, value]) => <div key={String(label)} className="admin-panel-muted px-3 py-3">
      <strong className="block text-xl tabular-nums text-[var(--sp-ink)]">{value}</strong>
      <span className="mt-1 block text-[11px] leading-4 text-[var(--sp-ink-tertiary)]">{label}</span>
    </div>)}
  </div>;
}

function ChangesTable({ rows, rollback = false }: { rows: Array<PreviewRow & { conflict?: boolean }>; rollback?: boolean }) {
  const headers = rollback
    ? ['SKU', 'Товар', 'Вариант', 'Сейчас', 'Будет восстановлено', 'Изменение', 'Статус']
    : ['SKU', 'Товар', 'Вариант', 'На момент экспорта', 'Сейчас на сайте', 'В Excel', 'Изменение', 'Статус'];

  return <div className="overflow-x-auto">
    <table className={`${rollback ? 'min-w-[900px]' : 'min-w-[1040px]'} w-full text-left text-xs`}>
      <thead className="bg-[var(--sp-surface-inset)] text-[var(--sp-ink-tertiary)]">
        <tr>{headers.map((label) => <th key={label} className="whitespace-nowrap px-4 py-3 font-bold">{label}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-[var(--sp-line)]">
        {rows.map((row, index) => <tr key={`${row.sku}-${row.variantTitle}-${index}`} className="align-top hover:bg-[var(--sp-surface-inset)]/50">
          <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px]">{row.sku}</td>
          <td className="max-w-64 px-4 py-3 font-semibold">{row.productTitle}</td>
          <td className="max-w-52 px-4 py-3 text-[var(--sp-ink-secondary)]">{row.variantTitle || '—'}</td>
          {rollback ? <>
            <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{price(row.current)}</td>
            <td className="whitespace-nowrap px-4 py-3 text-right font-bold tabular-nums">{price(row.before)}</td>
          </> : <>
            <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{price(row.before)}</td>
            <td className={`whitespace-nowrap px-4 py-3 text-right tabular-nums ${row.current !== row.before ? 'font-bold text-[var(--sp-danger)]' : ''}`}>{price(row.current)}</td>
            <td className="whitespace-nowrap px-4 py-3 text-right font-bold tabular-nums">{price(row.after)}</td>
          </>}
          <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{row.delta === null ? '—' : `${number.format(row.delta)} сум`}{row.deltaPercent === null ? '' : <small className="ml-1 block text-[10px] text-[var(--sp-ink-tertiary)]">{percent.format(row.deltaPercent)}</small>}</td>
          <td className="min-w-40 px-4 py-3"><span className={`inline-flex rounded-md px-2 py-1 text-[10px] font-bold ${row.conflict || row.status === 'conflict' || row.status === 'error' ? 'bg-red-50 text-[var(--sp-danger)]' : row.status === 'warning' ? 'bg-amber-50 text-amber-800' : row.status === 'unchanged' ? 'bg-[var(--sp-surface-inset)] text-[var(--sp-ink-tertiary)]' : 'bg-emerald-50 text-emerald-800'}`}>{row.conflict ? 'Конфликт' : statusLabel(row.status)}</span>{row.message ? <p className="mt-1.5 leading-4 text-[var(--sp-ink-tertiary)]">{row.message}</p> : null}</td>
        </tr>)}
      </tbody>
    </table>
  </div>;
}

export function PriceManager({ initialHistory, initialHistoryError = '' }: { initialHistory: HistoryItem[]; initialHistoryError?: string }) {
  const [history, setHistory] = useState<HistoryItem[]>(initialHistory);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(initialHistoryError);
  const [exporting, setExporting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [batch, setBatch] = useState<BatchDto | null>(null);
  const [rollback, setRollback] = useState<RollbackDto | null>(null);
  const [warningsConfirmed, setWarningsConfirmed] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const result = await json<{ history: HistoryItem[] }>(await fetch('/api/admin/prices', { cache: 'no-store' }));
      setHistory(result.history);
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : 'История недоступна.');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const announce = (next: { kind: 'error' | 'success'; text: string }) => {
    setMessage(next);
    requestAnimationFrame(() => {
      resultRef.current?.focus();
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const download = async () => {
    setExporting(true);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/prices/export', { cache: 'no-store' });
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || 'Excel не удалось скачать.');
      const disposition = response.headers.get('content-disposition') || '';
      const filename = disposition.match(/filename="([^"]+)"/)?.[1] || 'SANPACK_prices.xlsx';
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      announce({ kind: 'success', text: 'Актуальный Excel подготовлен. Изменяйте только зелёные ячейки «Новая цена».' });
    } catch (error) {
      announce({ kind: 'error', text: error instanceof Error ? error.message : 'Excel не удалось скачать.' });
    } finally {
      setExporting(false);
    }
  };

  const upload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setBatch(null);
    setRollback(null);
    setWarningsConfirmed(false);
    setMessage(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const result = await json<BatchDto>(await fetch('/api/admin/prices/import', { method: 'POST', body: form }));
      setBatch(result);
      if (result.summary.changes === 0 && result.summary.errors === 0 && result.summary.conflicts === 0) {
        announce({ kind: 'success', text: 'Изменений цен не найдено. Каталог не изменён.' });
      } else if (result.summary.errors || result.summary.conflicts) {
        announce({ kind: 'error', text: 'Excel проверен, но применить его нельзя. Исправьте ошибки или скачайте свежий файл.' });
      } else {
        announce({ kind: 'success', text: `Excel проверен: найдено ${result.summary.changes} изменений.` });
      }
      await loadHistory();
    } catch (error) {
      announce({ kind: 'error', text: error instanceof Error ? error.message : 'Excel не удалось проверить.' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const apply = async () => {
    if (!batch) return;
    setApplying(true);
    setMessage(null);
    try {
      const result = await json<BatchDto & { idempotent?: boolean }>(await fetch(`/api/admin/prices/${encodeURIComponent(batch.batchId)}`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'apply', warningsConfirmed }),
      }));
      setBatch(result);
      announce({ kind: 'success', text: result.idempotent ? 'Это обновление уже было применено. Повторной записи не произошло.' : `Применено к каталогу: ${pricesLabel(result.changedRowCount)}.` });
      await loadHistory();
    } catch (error) {
      announce({ kind: 'error', text: error instanceof Error ? error.message : 'Цены не были применены.' });
    } finally {
      setApplying(false);
    }
  };

  const openBatch = async (batchId: string) => {
    setMessage(null);
    try {
      const result = await json<BatchDto>(await fetch(`/api/admin/prices/${encodeURIComponent(batchId)}`, { cache: 'no-store' }));
      setBatch(result);
      setRollback(null);
      requestAnimationFrame(() => document.getElementById('price-preview')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch (error) {
      announce({ kind: 'error', text: error instanceof Error ? error.message : 'Детали не загрузились.' });
    }
  };

  const previewRollback = async (batchId: string) => {
    setMessage(null);
    try {
      const result = await json<RollbackDto>(await fetch(`/api/admin/prices/${encodeURIComponent(batchId)}?rollback=preview`, { cache: 'no-store' }));
      setRollback(result);
      requestAnimationFrame(() => document.getElementById('rollback-preview')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch (error) {
      announce({ kind: 'error', text: error instanceof Error ? error.message : 'Откат не удалось проверить.' });
    }
  };

  const confirmRollback = async () => {
    if (!rollback) return;
    setRollingBack(true);
    setMessage(null);
    try {
      const result = await json<BatchDto>(await fetch(`/api/admin/prices/${encodeURIComponent(rollback.batch.batchId)}`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'rollback' }),
      }));
      setBatch(result);
      setRollback(null);
      announce({ kind: 'success', text: `Восстановлено: ${pricesLabel(result.changedRowCount)}. История обновления сохранена.` });
      await loadHistory();
    } catch (error) {
      announce({ kind: 'error', text: error instanceof Error ? error.message : 'Откат не выполнен.' });
    } finally {
      setRollingBack(false);
    }
  };

  const canApply = batch?.status === 'ready'
    && batch.summary.changes > 0
    && batch.summary.errors === 0
    && batch.summary.conflicts === 0
    && (batch.summary.warnings === 0 || warningsConfirmed);

  return <>
    <section className="grid gap-4 lg:grid-cols-2" aria-label="Работа с Excel">
      <article className="admin-panel flex min-h-52 flex-col justify-between p-5 md:p-6">
        <div><FileSpreadsheet className="size-6 text-[var(--sp-brand)]" aria-hidden="true" /><h2 className="mt-4 font-extended text-lg font-bold">Актуальный прайс</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[var(--sp-ink-secondary)]">Файл содержит товары, варианты и текущие цены на сайте. Цены по запросу и наследуемые цены защищены от редактирования.</p></div>
        <button type="button" onClick={() => void download()} disabled={exporting} className="admin-button-primary mt-6 w-full sm:w-fit disabled:cursor-wait disabled:opacity-60">{exporting ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <ArrowDownToLine className="size-4" aria-hidden="true" />}{exporting ? 'Готовим Excel…' : 'Скачать Excel'}</button>
      </article>
      <article className="admin-panel p-5 md:p-6">
        <UploadCloud className="size-6 text-[var(--sp-brand)]" aria-hidden="true" /><h2 className="mt-4 font-extended text-lg font-bold">Импорт изменений</h2><p className="mt-2 text-sm leading-6 text-[var(--sp-ink-secondary)]">Загрузка только проверяет файл. Ни одна цена не изменится до отдельного подтверждения.</p>
        <label onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); void upload(event.dataTransfer.files[0]); }} className={`mt-5 flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-[var(--sp-radius-control)] border border-dashed px-4 text-center transition-colors ${dragging ? 'border-[var(--sp-brand)] bg-emerald-50' : 'border-[var(--sp-line-strong)] bg-[var(--sp-surface-inset)] hover:border-[var(--sp-brand)]'}`}>
          <input ref={fileRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" disabled={uploading} onChange={(event) => void upload(event.target.files?.[0])} className="sr-only" />
          {uploading ? <LoaderCircle className="size-5 animate-spin text-[var(--sp-brand)]" aria-hidden="true" /> : <FileCheck2 className="size-5 text-[var(--sp-brand)]" aria-hidden="true" />}
          <span className="mt-2 text-sm font-bold">{uploading ? 'Проверяем Excel…' : 'Перетащите .xlsx или выберите файл'}</span>
          <span className="mt-1 text-[11px] text-[var(--sp-ink-tertiary)]">До 5 МБ · без макросов</span>
        </label>
      </article>
    </section>

    <div ref={resultRef} tabIndex={-1} className="scroll-mt-6 outline-none">
      {message ? <p className={`sp-alert text-sm ${message.kind === 'error' ? 'sp-alert-danger' : 'sp-alert-success'}`} role={message.kind === 'error' ? 'alert' : 'status'}>{message.text}</p> : null}
    </div>

    {batch ? <section id="price-preview" className="admin-panel scroll-mt-6 overflow-hidden" aria-labelledby="price-preview-title">
      <div className="border-b border-[var(--sp-line)] p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 id="price-preview-title" className="font-extended text-lg font-bold">Проверка изменений</h2><p className="mt-1 text-xs text-[var(--sp-ink-tertiary)]">{batch.originalFilename} · {date.format(new Date(batch.createdAt))}</p></div><span className="rounded-md bg-[var(--sp-surface-inset)] px-2.5 py-1 text-[10px] font-bold text-[var(--sp-ink-secondary)]">{batchStatus(batch.status)}</span></div>
        <div className="mt-5"><Summary batch={batch} /></div>
        {batch.summary.warnings > 0 && batch.status === 'ready' ? <label className="sp-alert sp-alert-warning mt-5 flex cursor-pointer items-start gap-3 text-sm"><input type="checkbox" checked={warningsConfirmed} onChange={(event) => setWarningsConfirmed(event.target.checked)} className="mt-0.5 size-4 accent-[var(--sp-brand)]" /><span><b>Я проверил необычно большие изменения.</b><span className="mt-1 block text-xs">Строк с изменением более чем на 30%: {batch.summary.warnings}.</span></span></label> : null}
        {batch.status === 'ready' ? <div className="mt-5 flex flex-wrap items-center gap-3"><button type="button" onClick={() => void apply()} disabled={!canApply || applying} className="admin-button-primary disabled:cursor-not-allowed disabled:opacity-50">{applying ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}{applying ? 'Применяем…' : `Применить ${changesLabel(batch.summary.changes)}`}</button>{batch.summary.changes === 0 ? <span className="text-xs text-[var(--sp-ink-tertiary)]">Запись в каталог не требуется.</span> : null}</div> : null}
      </div>
      <ChangesTable rows={batch.rows} />
    </section> : null}

    {rollback ? <section id="rollback-preview" className="admin-panel scroll-mt-6 overflow-hidden" aria-labelledby="rollback-title">
      <div className="border-b border-[var(--sp-line)] p-5 md:p-6"><h2 id="rollback-title" className="font-extended text-lg font-bold">Отменить обновление цен</h2><p className="mt-2 text-sm leading-6 text-[var(--sp-ink-secondary)]">Будут восстановлены только цены из выбранного обновления. Другие поля товаров останутся без изменений.</p>{rollback.conflictCount ? <p role="alert" className="sp-alert sp-alert-danger mt-4 text-sm"><CircleAlert className="mr-2 inline size-4" />После этого импорта изменены цены: {rollback.conflictCount}. Откат всего обновления заблокирован.</p> : <p className="sp-alert sp-alert-warning mt-4 text-sm">Будет восстановлено: {pricesLabel(rollback.rows.length)}. Проверьте значения перед подтверждением.</p>}<div className="mt-4 flex flex-wrap gap-3"><button type="button" disabled={rollback.conflictCount > 0 || rollingBack} onClick={() => void confirmRollback()} className="admin-button-primary disabled:cursor-not-allowed disabled:opacity-50">{rollingBack ? <LoaderCircle className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}{rollingBack ? 'Восстанавливаем…' : 'Подтвердить откат'}</button><button type="button" onClick={() => setRollback(null)} className="admin-button-secondary">Отмена</button></div></div>
      <ChangesTable rows={rollback.rows} rollback />
    </section> : null}

    <section className="admin-panel overflow-hidden" aria-labelledby="price-history-title">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--sp-line)] p-5 md:p-6"><div><div className="flex items-center gap-2"><History className="size-5 text-[var(--sp-brand)]" aria-hidden="true" /><h2 id="price-history-title" className="font-extended text-lg font-bold">История обновлений</h2></div><p className="mt-1 text-xs text-[var(--sp-ink-tertiary)]">Проверки файлов, применённые изменения и безопасные откаты.</p></div><button type="button" onClick={() => void loadHistory()} disabled={historyLoading} className="admin-button-secondary min-h-10"><RefreshCw className={`size-4 ${historyLoading ? 'animate-spin' : ''}`} />Обновить</button></div>
      {historyError ? <p role="alert" className="sp-alert sp-alert-danger m-5 text-sm">{historyError}</p> : null}
      {historyLoading && !history.length ? <p className="p-8 text-center text-sm text-[var(--sp-ink-tertiary)]" role="status">Загружаем историю…</p> : null}
      {!historyLoading && !history.length && !historyError ? <div className="p-8 text-center"><FileSpreadsheet className="mx-auto size-6 text-[var(--sp-ink-muted)]" /><p className="mt-3 text-sm font-semibold">История пока пуста</p><p className="mt-1 text-xs text-[var(--sp-ink-tertiary)]">Первый проверенный Excel появится здесь.</p></div> : null}
      {history.length ? <div className="overflow-x-auto"><table className="min-w-[760px] w-full text-left text-xs"><thead className="bg-[var(--sp-surface-inset)] text-[var(--sp-ink-tertiary)]"><tr>{['Дата', 'Файл', 'Администратор', 'Изменений', 'Статус', 'Действия'].map((label) => <th key={label} className="px-4 py-3 font-bold">{label}</th>)}</tr></thead><tbody className="divide-y divide-[var(--sp-line)]">{history.map((item) => <tr key={item.batchId} className="hover:bg-[var(--sp-surface-inset)]/50"><td className="whitespace-nowrap px-4 py-3">{date.format(new Date(item.appliedAt || item.createdAt))}</td><td className="max-w-48 truncate px-4 py-3" title={item.originalFilename}>{item.originalFilename}</td><td className="px-4 py-3">{item.actorLabel}</td><td className="px-4 py-3 tabular-nums">{item.changedRowCount}</td><td className="px-4 py-3"><span className="rounded-md bg-[var(--sp-surface-inset)] px-2 py-1 text-[10px] font-bold">{batchStatus(item.status)}</span></td><td className="whitespace-nowrap px-4 py-3"><button type="button" onClick={() => void openBatch(item.batchId)} className="admin-button-secondary min-h-9 px-3">Открыть<ChevronDown className="size-3.5" /></button>{item.status === 'applied' ? <button type="button" onClick={() => void previewRollback(item.batchId)} className="ml-2 inline-flex min-h-9 items-center gap-1.5 rounded-[var(--sp-radius-control)] px-3 text-[11px] font-bold text-[var(--sp-danger)] hover:bg-red-50"><RotateCcw className="size-3.5" />Отменить</button> : null}</td></tr>)}</tbody></table></div> : null}
    </section>

    <aside className="flex items-start gap-3 rounded-[var(--sp-radius-control)] bg-[var(--sp-surface-inset)] p-4 text-xs leading-5 text-[var(--sp-ink-secondary)]"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--sp-warning)]" aria-hidden="true" /><p>Excel меняет только существующие базовые цены товара и явные цены вариантов. Режим цены, скидки, оптовые уровни, упаковка и остатки остаются без изменений.</p></aside>
  </>;
}
