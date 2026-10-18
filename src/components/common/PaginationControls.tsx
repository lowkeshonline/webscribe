'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { LoadingButton } from '@/components/common/LoadingButton';

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  label?: string;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  page,
  totalPages,
  onPageChange,
  disabled = false,
  label = 'Items',
}) => {
  if (totalPages <= 1) return null;

  const firstPage = Math.max(1, Math.min(page - 2, totalPages - 4));
  const lastPage = Math.min(totalPages, firstPage + 4);
  const pages = Array.from({ length: lastPage - firstPage + 1 }, (_, index) => firstPage + index);

  return (
    <nav aria-label={`${label} pagination`} className="flex items-center justify-center gap-1.5 pt-2">
      <LoadingButton
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={disabled || page <= 1}
        loading={disabled}
        aria-label={`Previous ${label.toLowerCase()} page`}
        title="Previous page"
        className="w-10 h-10 rounded-[12px] ws-chip inline-flex items-center justify-center disabled:opacity-40"
      >
        <ChevronLeft className="w-4 h-4" />
      </LoadingButton>
      {pages.map(pageNumber => (
        <LoadingButton
          type="button"
          key={pageNumber}
          onClick={() => onPageChange(pageNumber)}
          disabled={disabled || pageNumber === page}
          loading={disabled}
          aria-current={pageNumber === page ? 'page' : undefined}
          className={`min-w-10 h-10 px-2 rounded-[12px] text-xs font-semibold inline-flex items-center justify-center ${pageNumber === page ? 'ws-primary-button' : 'ws-chip'} disabled:opacity-70`}
        >
          {pageNumber}
        </LoadingButton>
      ))}
      <LoadingButton
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={disabled || page >= totalPages}
        loading={disabled}
        aria-label={`Next ${label.toLowerCase()} page`}
        title="Next page"
        className="w-10 h-10 rounded-[12px] ws-chip inline-flex items-center justify-center disabled:opacity-40"
      >
        <ChevronRight className="w-4 h-4" />
      </LoadingButton>
      <span className="ml-2 text-[10px] text-[var(--color-text-muted)] whitespace-nowrap">
        Page {page} of {totalPages}
      </span>
    </nav>
  );
};
