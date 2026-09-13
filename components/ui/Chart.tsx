'use client';

import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { ResponsiveContainer, Tooltip } from 'recharts';

export type ChartConfig = Record<string, { label: string; color: string }>;

export function ChartContainer({
  config,
  className = '',
  children,
}: {
  config: ChartConfig;
  className?: string;
  children: ReactNode;
}) {
  const variables = Object.fromEntries(
    Object.entries(config).map(([key, item]) => [`--color-${key}`, item.color]),
  ) as CSSProperties;

  return (
    <div
      data-chart="analytics"
      className={`min-h-[250px] w-full text-xs ${className}`}
      style={variables}
    >
      <ResponsiveContainer width="100%" height="100%">
        {children as ReactElement}
      </ResponsiveContainer>
    </div>
  );
}

type TooltipPayload = {
  color?: string;
  dataKey?: string | number;
  name?: string | number;
  value?: string | number;
};

export function ChartTooltipContent({
  active,
  label,
  payload,
  labelFormatter,
}: {
  active?: boolean;
  label?: string | number;
  payload?: TooltipPayload[];
  labelFormatter?: (label: string | number) => ReactNode;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="min-w-36 rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-[var(--sp-surface)] px-3 py-2.5 shadow-lg">
      <p className="text-[11px] font-medium text-[var(--sp-ink-tertiary)]">
        {labelFormatter ? labelFormatter(label ?? '') : label}
      </p>
      <div className="mt-1.5 flex items-center justify-between gap-5">
        <span className="flex items-center gap-2 font-medium text-[var(--sp-ink-secondary)]">
          <span className="size-2 rounded-full" style={{ background: item.color }} aria-hidden="true" />
          {item.name}
        </span>
        <strong className="tabular-nums text-[var(--sp-ink)]">{item.value}</strong>
      </div>
    </div>
  );
}

export const ChartTooltip = Tooltip;
