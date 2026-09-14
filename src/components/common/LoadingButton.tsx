'use client';

import React from 'react';
import { LoaderCircle } from 'lucide-react';

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingLabel?: React.ReactNode;
}

export const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(function LoadingButton({
  loading = false,
  loadingLabel,
  children,
  disabled,
  ...props
}, ref) {
  return (
    <button
      ref={ref}
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading ? (
        <>
          <LoaderCircle className="w-4 h-4 shrink-0 animate-spin" aria-hidden="true" />
          {loadingLabel !== undefined && loadingLabel !== '' && <span>{loadingLabel}</span>}
        </>
      ) : children}
    </button>
  );
});
