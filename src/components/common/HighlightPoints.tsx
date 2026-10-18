'use client';

import React from 'react';

/**
 * Newline-separated text rendered as highlighted bullet points.
 * Uses the lime brand accent wash (not the green/red do & don't colours)
 * so points read as information highlights.
 */
export const HighlightPoints: React.FC<{ text?: string; className?: string }> = ({ text, className }) => {
  const points = (text || '').split(/\r?\n/).map(point => point.trim()).filter(Boolean);
  if (points.length === 0) return null;

  return (
    <ul className={`space-y-1.5 ${className || ''}`}>
      {points.map((point, index) => (
        <li
          key={index}
          className="flex items-start gap-2 rounded-[10px] bg-[var(--color-brand-violet-wash)] border border-[var(--color-brand-violet)]/20 px-2.5 py-1.5 text-[11px] leading-snug text-[var(--color-text-primary)]"
        >
          <span className="mt-[5px] w-1.5 h-1.5 rounded-full bg-[var(--color-brand-violet)] shrink-0" />
          <span className="min-w-0 break-words">{point}</span>
        </li>
      ))}
    </ul>
  );
};
