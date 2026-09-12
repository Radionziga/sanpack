'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { Minus, Plus } from 'lucide-react';

interface QuantityControlProps {
  value: number;
  minimum: number;
  step: number;
  maximum?: number;
  onChange: (value: number) => void;
  onDecreaseAtMinimum?: () => void;
  normalize?: (value: number) => number;
  ariaLabel: string;
  decreaseLabel: string;
  increaseLabel: string;
  compact?: boolean;
  className?: string;
  onFocusChange?: (focused: boolean) => void;
}

function formatEditableValue(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)));
}

export function QuantityControl({
  value,
  minimum,
  step,
  maximum,
  onChange,
  onDecreaseAtMinimum,
  normalize,
  ariaLabel,
  decreaseLabel,
  increaseLabel,
  compact = false,
  className = '',
  onFocusChange,
}: QuantityControlProps) {
  const id = useId();
  const focused = useRef(false);
  const [draft, setDraft] = useState(() => formatEditableValue(value));
  const [corrected, setCorrected] = useState(false);

  useEffect(() => {
    if (!focused.current) setDraft(formatEditableValue(value));
  }, [value]);

  const apply = (candidate: number) => {
    const normalized = normalize
      ? normalize(candidate)
      : Math.min(maximum ?? Number.POSITIVE_INFINITY, Math.max(minimum, candidate));
    const wasCorrected = !Number.isFinite(candidate) || Math.abs(normalized - candidate) > 1e-7;
    setCorrected(wasCorrected);
    setDraft(formatEditableValue(normalized));
    onChange(normalized);
  };

  const stopClick = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const commitDraft = (rawValue = draft) => {
    const parsed = Number(rawValue.replace(',', '.'));
    apply(Number.isFinite(parsed) ? parsed : minimum);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation();
    if (event.key === 'Enter') {
      event.preventDefault();
      commitDraft();
      event.currentTarget.blur();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setDraft(formatEditableValue(value));
      setCorrected(false);
      event.currentTarget.blur();
    }
  };

  const height = compact ? 'min-h-9' : 'min-h-11';
  const buttonWidth = compact ? 'w-9' : 'w-11';

  return (
    <div
      className={`${height} flex w-full items-stretch overflow-hidden rounded-[var(--sp-radius-control-inner)] border border-[var(--sp-line)] bg-[var(--sp-control)] ${className}`}
      role="group"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        onClick={(event) => {
          stopClick(event);
          if (value <= minimum && onDecreaseAtMinimum) onDecreaseAtMinimum();
          else apply(value - step);
        }}
        aria-label={decreaseLabel}
        className={`${buttonWidth} grid shrink-0 place-items-center transition-colors hover:bg-[var(--sp-surface-inset)] active:bg-[var(--sp-line)] focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--sp-focus)]`}
      >
        <Minus className={compact ? 'size-3' : 'size-4'} aria-hidden="true" />
      </button>
      <label htmlFor={id} className="sr-only">{ariaLabel}</label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={minimum}
        step={step}
        max={maximum}
        value={draft}
        aria-label={ariaLabel}
        aria-invalid={corrected || undefined}
        onClick={(event) => event.stopPropagation()}
        onFocus={() => {
          focused.current = true;
          setCorrected(false);
          onFocusChange?.(true);
        }}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={(event) => {
          focused.current = false;
          commitDraft(event.currentTarget.value);
          onFocusChange?.(false);
        }}
        className="min-w-0 flex-1 appearance-none bg-transparent px-1 text-center text-xs font-bold tabular-nums text-[var(--sp-ink)] outline-none [appearance:textfield] focus:bg-[var(--sp-surface)] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none sm:text-sm"
      />
      <button
        type="button"
        onClick={(event) => {
          stopClick(event);
          apply(value + step);
        }}
        disabled={maximum !== undefined && value >= maximum}
        aria-label={increaseLabel}
        className={`${buttonWidth} grid shrink-0 place-items-center transition-colors hover:bg-[var(--sp-surface-inset)] active:bg-[var(--sp-line)] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--sp-focus)]`}
      >
        <Plus className={compact ? 'size-3' : 'size-4'} aria-hidden="true" />
      </button>
    </div>
  );
}
