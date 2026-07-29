'use client';

import React, { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string;
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
}

export function CustomSelect({
  options,
  value,
  onChange,
  placeholder = 'Выберите...',
  label,
  size = 'md',
  variant = 'default',
  className = '',
  disabled = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const selectedOption = options.find((opt) => opt.value === value);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === 'Escape') {
      setIsOpen(false);
      return;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen((prev) => !prev);
      return;
    }

    if (isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      const currentIndex = options.findIndex((opt) => opt.value === value);
      if (e.key === 'ArrowDown') {
        const nextIndex = (currentIndex + 1) % options.length;
        onChange(options[nextIndex].value);
      } else if (e.key === 'ArrowUp') {
        const prevIndex = (currentIndex - 1 + options.length) % options.length;
        onChange(options[prevIndex].value);
      }
    }
  };

  // Size styles
  const sizeStyles = {
    sm: 'py-1.5 px-3 text-xs gap-1.5 rounded-lg',
    md: 'py-2 px-3.5 text-xs font-semibold gap-2 rounded-xl',
    lg: 'py-2.5 px-4 text-sm font-semibold gap-2.5 rounded-xl',
  };

  // Variant trigger styles
  const variantStyles = {
    default:
      'bg-white border border-slate-200 text-[#222B35] hover:border-[#0F6E43]/40 focus:border-[#0F6E43] focus:ring-2 focus:ring-[#0F6E43]/15 shadow-2xs',
    pill:
      'bg-slate-50 border border-slate-200/80 text-[#222B35] hover:bg-slate-100/80 focus:ring-2 focus:ring-[#0F6E43]/15',
    ghost:
      'bg-transparent text-[#222B35] hover:bg-slate-100 focus:bg-slate-100',
  };

  return (
    <div className={`relative inline-block w-full text-left ${className}`} ref={containerRef}>
      {label && (
        <label htmlFor={id} className="block text-xs font-bold text-slate-700 mb-1.5">
          {label}
        </label>
      )}

      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between transition-all cursor-pointer outline-none select-none disabled:opacity-50 disabled:cursor-not-allowed ${sizeStyles[size]} ${variantStyles[variant]}`}
      >
        <div className="flex items-center gap-2 truncate pr-1">
          {selectedOption?.icon && <span className="text-[#0F6E43] shrink-0">{selectedOption.icon}</span>}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span className="bg-[#EAF5EF] text-[#0F6E43] text-[10px] font-bold px-1.5 py-0.5 rounded ml-1">
              {selectedOption.badge}
            </span>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#0F6E43]' : ''
          }`}
        />
      </button>

      {/* Floating Popover Panel */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute right-0 left-0 sm:left-auto sm:min-w-[200px] mt-1.5 bg-white border border-slate-200/90 rounded-xl shadow-xl z-50 py-1.5 max-h-60 overflow-y-auto outline-none animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <div
                key={option.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`flex items-center justify-between px-3.5 py-2 text-xs font-medium cursor-pointer transition-colors select-none ${
                  isSelected
                    ? 'bg-[#EAF5EF] text-[#0F6E43] font-bold'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-[#0F6E43]'
                }`}
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  {option.icon && (
                    <span className={isSelected ? 'text-[#0F6E43]' : 'text-slate-400'}>
                      {option.icon}
                    </span>
                  )}
                  <span className="truncate">{option.label}</span>
                  {option.badge && (
                    <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded">
                      {option.badge}
                    </span>
                  )}
                </div>

                {isSelected && <Check className="w-3.5 h-3.5 text-[#0F6E43] shrink-0" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
