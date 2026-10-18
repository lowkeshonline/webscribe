'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, LoaderCircle } from 'lucide-react';

export interface StyledDropdownOption {
  value: string;
  label: React.ReactNode;
  selectedLabel?: React.ReactNode;
  searchText?: string;
  disabled?: boolean;
}

interface StyledDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: StyledDropdownOption[];
  placeholder?: React.ReactNode;
  searchPlaceholder?: string;
  searchable?: boolean;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  menuPlacement?: 'top' | 'bottom';
  fullButton?: boolean;
  disabled?: boolean;
  loading?: boolean;
  ariaLabel?: string;
  triggerContent?: React.ReactNode;
}

export const StyledDropdown: React.FC<StyledDropdownProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  searchPlaceholder = 'Search options',
  searchable = false,
  className = '',
  buttonClassName = '',
  menuClassName = '',
  menuPlacement = 'bottom',
  fullButton = true,
  disabled = false,
  loading = false,
  ariaLabel,
  triggerContent,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const selectedOption = options.find(option => option.value === value);
  const normalizedSearch = search.trim().toLowerCase();
  const visibleOptions = normalizedSearch
    ? options.filter(option => (option.searchText || option.value).toLowerCase().includes(normalizedSearch))
    : options;

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    if (searchable) searchRef.current?.focus();

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, searchable]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (!open) setSearch('');
          setOpen(current => !current);
        }}
        className={`${fullButton ? 'w-full' : ''} h-11 ${triggerContent ? 'px-0' : 'px-3.5'} rounded-[14px] text-sm ws-input flex items-center ${triggerContent ? 'justify-center' : 'justify-between'} gap-3 text-left disabled:opacity-50 ${buttonClassName}`}
      >
        <span className={`min-w-0 truncate ${triggerContent ? '' : selectedOption ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)]'}`}>
          {loading ? <span className="inline-flex items-center gap-2"><LoaderCircle className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /><span className={triggerContent ? 'hidden sm:inline' : ''}>Loading...</span></span> : triggerContent ?? selectedOption?.selectedLabel ?? selectedOption?.label ?? placeholder}
        </span>
        {!triggerContent && <ChevronDown className={`w-4 h-4 shrink-0 text-[var(--color-text-muted)] transition-transform ${open ? 'rotate-180' : ''}`} />}
      </button>

      {open && (
        <div role="listbox" className={`absolute left-0 right-0 z-50 max-h-64 overflow-y-auto p-1.5 rounded-[14px] ws-panel shadow-[var(--shadow-card)] ${menuPlacement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} ${menuClassName}`}>
          {searchable && (
            <input
              ref={searchRef}
              value={search}
              onChange={event => setSearch(event.target.value)}
              onClick={event => event.stopPropagation()}
              placeholder={searchPlaceholder}
              className="w-full h-11 px-3 mb-1 rounded-[10px] text-xs ws-input"
              aria-label={searchPlaceholder}
            />
          )}
          {visibleOptions.length > 0 ? visibleOptions.map(option => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              disabled={option.disabled}
              onClick={() => {
                if (option.disabled) return;
                onChange(option.value);
                setOpen(false);
              }}
              className={`w-full min-h-11 px-3 py-2 rounded-[10px] text-left text-xs transition-colors disabled:opacity-50 ${option.value === value ? 'bg-[var(--color-brand-violet-wash)]' : 'hover:bg-[var(--color-surface-hover)]'}`}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="min-w-0 flex-1">{option.label}</span>
                {option.value === value && <Check className="w-3.5 h-3.5 shrink-0 text-[var(--color-brand-violet)]" />}
              </span>
            </button>
          )) : (
            <p className="px-3 py-2.5 text-xs text-[var(--color-text-muted)]">No matching options</p>
          )}
        </div>
      )}
    </div>
  );
};
