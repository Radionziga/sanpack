'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  icon?: ReactNode;
  badge?: string;
  disabled?: boolean;
}

export interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'pill' | 'ghost';
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

type MenuPosition = Pick<CSSProperties, 'top' | 'left' | 'width' | 'maxHeight'>;

export function CustomSelect({
  options,
  value,
  onChange,
  placeholder = 'Выберите…',
  label,
  size = 'md',
  variant = 'default',
  className = '',
  disabled = false,
  ariaLabel,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [position, setPosition] = useState<MenuPosition>({ top: 0, left: 0, width: 220, maxHeight: 240 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const optionRefs = useRef<Array<HTMLLIElement | null>>([]);
  const id = useId();
  const listboxId = `${id}-listbox`;
  const selectedIndex = options.findIndex((option) => option.value === value);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const gap = 6;
    const viewportPadding = 12;
    const desiredHeight = Math.min(280, Math.max(48, options.length * 44 + 12));
    const roomBelow = window.innerHeight - rect.bottom - viewportPadding;
    const roomAbove = rect.top - viewportPadding;
    const openAbove = roomBelow < Math.min(desiredHeight, 180) && roomAbove > roomBelow;
    const maxHeight = Math.max(96, Math.min(desiredHeight, openAbove ? roomAbove - gap : roomBelow - gap));
    const width = Math.max(rect.width, 208);
    const left = Math.min(Math.max(viewportPadding, rect.left), window.innerWidth - width - viewportPadding);
    const top = openAbove
      ? Math.max(viewportPadding, rect.top - maxHeight - gap)
      : Math.min(window.innerHeight - viewportPadding - maxHeight, rect.bottom + gap);
    setPosition({ top, left, width, maxHeight });
  }, [options.length]);

  const focusOption = useCallback((index: number) => {
    const enabledOptions = options.map((option, optionIndex) => ({ option, optionIndex })).filter(({ option }) => !option.disabled);
    if (!enabledOptions.length) return;
    const normalizedIndex = ((index % enabledOptions.length) + enabledOptions.length) % enabledOptions.length;
    const nextIndex = enabledOptions[normalizedIndex].optionIndex;
    setActiveIndex(nextIndex);
    requestAnimationFrame(() => optionRefs.current[nextIndex]?.focus());
  }, [options]);

  const openMenu = useCallback((direction: 'selected' | 'first' | 'last' = 'selected') => {
    if (disabled || !options.length) return;
    const enabledIndexes = options.flatMap((option, index) => option.disabled ? [] : [index]);
    const nextIndex = direction === 'first'
      ? enabledIndexes[0]
      : direction === 'last'
        ? enabledIndexes.at(-1) ?? 0
        : (selectedIndex >= 0 && !options[selectedIndex]?.disabled ? selectedIndex : enabledIndexes[0]);
    setPortalRoot(triggerRef.current?.closest<HTMLElement>('[data-sanpack-theme]') ?? document.body);
    setActiveIndex(nextIndex);
    setIsOpen(true);
    requestAnimationFrame(() => {
      updatePosition();
      optionRefs.current[nextIndex]?.focus();
    });
  }, [disabled, options, selectedIndex, updatePosition]);

  const closeMenu = useCallback((restoreFocus = false) => {
    setIsOpen(false);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) closeMenu();
    };
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [closeMenu, isOpen, updatePosition]);

  function selectOption(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    closeMenu(true);
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      openMenu(selectedIndex >= 0 ? 'selected' : 'first');
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      openMenu(selectedIndex >= 0 ? 'selected' : 'last');
    } else if (event.key === 'Home') {
      event.preventDefault();
      openMenu('first');
    } else if (event.key === 'End') {
      event.preventDefault();
      openMenu('last');
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (isOpen) closeMenu(); else openMenu();
    }
  }

  function handleOptionKeyDown(event: KeyboardEvent<HTMLLIElement>, index: number) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const enabledIndexes = options.flatMap((option, optionIndex) => option.disabled ? [] : [optionIndex]);
      focusOption(enabledIndexes.indexOf(index) + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const enabledIndexes = options.flatMap((option, optionIndex) => option.disabled ? [] : [optionIndex]);
      focusOption(enabledIndexes.indexOf(index) - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusOption(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusOption(options.filter((option) => !option.disabled).length - 1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectOption(index);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu(true);
    } else if (event.key === 'Tab') {
      closeMenu();
    }
  }

  const sizeStyles = {
    sm: 'h-9 [--admin-control-height:2.25rem] px-3 text-xs gap-1.5',
    md: 'h-11 [--admin-control-height:2.75rem] px-3.5 text-xs font-semibold gap-2',
    lg: 'h-12 [--admin-control-height:3rem] px-4 text-base font-semibold gap-2.5',
  };
  const variantStyles = {
    default: 'admin-control text-[var(--sp-ink)]',
    pill: 'border border-[var(--sp-control-border)] bg-[var(--sp-control-bg)] text-[var(--sp-ink)] hover:border-[var(--sp-line-strong)] focus-visible:ring-2 focus-visible:ring-[var(--sp-brand-soft)]',
    ghost: 'bg-transparent text-[var(--sp-ink)] hover:bg-[var(--sp-surface-inset)] focus-visible:ring-2 focus-visible:ring-[var(--sp-brand-soft)]',
  };

  const menu = isOpen && portalRoot ? createPortal(
    <ul
      ref={menuRef}
      id={listboxId}
      role="listbox"
      aria-label={label || ariaLabel || placeholder}
      className="fixed z-[1000] overflow-y-auto overscroll-contain border border-[var(--sp-line)] bg-[var(--sp-surface-raised)] p-1.5 shadow-[var(--sp-shadow-raised)] outline-none"
      style={{ ...position, borderRadius: 'var(--sp-radius-control)' }}
    >
      {options.map((option, index) => {
        const isSelected = option.value === value;
        const isActive = index === activeIndex;
        return (
          <li
            key={option.value}
            ref={(node) => { optionRefs.current[index] = node; }}
            role="option"
            aria-selected={isSelected}
            aria-disabled={option.disabled || undefined}
            tabIndex={isActive ? 0 : -1}
            onFocus={() => setActiveIndex(index)}
            onPointerMove={() => !option.disabled && setActiveIndex(index)}
            onClick={() => selectOption(index)}
            onKeyDown={(event) => handleOptionKeyDown(event, index)}
            className={`flex min-h-10 select-none items-center justify-between gap-3 px-3 py-2 text-xs outline-none transition-colors ${option.disabled ? 'cursor-not-allowed opacity-45' : 'cursor-pointer'} ${isSelected ? 'bg-[var(--sp-brand-soft)] font-bold text-[var(--sp-brand)]' : isActive ? 'bg-[var(--sp-surface-inset)] text-[var(--sp-ink)]' : 'text-[var(--sp-ink-secondary)]'}`}
            style={{ borderRadius: 'var(--sp-radius-control-inner)' }}
          >
            <span className="flex min-w-0 items-center gap-2">
              {option.icon ? <span className="shrink-0 text-current">{option.icon}</span> : null}
              <span className="truncate">{option.label}</span>
              {option.badge ? <span className="rounded-[var(--sp-radius-control-inner)] bg-[var(--sp-surface-inset)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--sp-ink-secondary)]">{option.badge}</span> : null}
            </span>
            {isSelected ? <Check className="size-4 shrink-0" aria-hidden="true" /> : null}
          </li>
        );
      })}
    </ul>,
    portalRoot,
  ) : null;

  return (
    <div className={`relative inline-block w-full text-left ${className}`}>
      {label ? <label htmlFor={id} className="admin-field-label mb-1.5">{label}</label> : null}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => isOpen ? closeMenu() : openMenu()}
        onKeyDown={handleTriggerKeyDown}
        aria-label={!label ? ariaLabel : undefined}
        aria-haspopup="listbox"
        aria-controls={isOpen ? listboxId : undefined}
        aria-expanded={isOpen}
        className={`box-border flex w-full cursor-pointer select-none items-center justify-between rounded-[var(--sp-radius-control)] outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${sizeStyles[size]} ${variantStyles[variant]}`}
      >
        <span className="flex min-w-0 items-center gap-2 truncate pr-1">
          {selectedOption?.icon ? <span className="shrink-0 text-[var(--sp-brand)]">{selectedOption.icon}</span> : null}
          <span className={`truncate ${selectedOption ? '' : 'text-[var(--sp-ink-muted)]'}`}>{selectedOption?.label || placeholder}</span>
          {selectedOption?.badge ? <span className="rounded-[var(--sp-radius-control-inner)] bg-[var(--sp-brand-soft)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--sp-brand)]">{selectedOption.badge}</span> : null}
        </span>
        <ChevronDown className={`size-4 shrink-0 text-[var(--sp-ink-muted)] transition-transform duration-150 ${isOpen ? 'rotate-180 text-[var(--sp-brand)]' : ''}`} aria-hidden="true" />
      </button>
      {menu}
    </div>
  );
}
