/** Small shared primitives — all sized for thumbs first. */

import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'pink';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-pasture-600 text-cream-50 border-pasture-900 hover:bg-pasture-500 active:bg-pasture-700',
  secondary:
    'bg-cream-100 text-ink-900 border-ink-900 hover:bg-cream-200 active:bg-cream-300',
  ghost:
    'bg-transparent text-cream-50 border-cream-100/60 hover:bg-cream-50/15 active:bg-cream-50/25',
  pink: 'bg-moo-500 text-white border-moo-700 hover:bg-moo-400 active:bg-moo-600',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  full?: boolean;
}

export function Button({
  variant = 'primary',
  full = false,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      className={[
        'inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 px-5 py-3',
        'font-display text-lg font-semibold shadow-[0_3px_0_0_rgba(31,27,24,0.9)]',
        'transition-transform active:translate-y-[3px] active:shadow-none',
        'disabled:cursor-not-allowed disabled:opacity-45 disabled:active:translate-y-0',
        'disabled:active:shadow-[0_3px_0_0_rgba(31,27,24,0.9)]',
        VARIANTS[variant],
        full ? 'w-full' : '',
        className,
      ].join(' ')}
    >
      {children}
    </button>
  );
}

export const TextField = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function TextField({ className = '', ...rest }, ref) {
    return (
      <input
        {...rest}
        ref={ref}
        className={[
          'w-full min-h-14 rounded-2xl border-2 border-ink-900 bg-cream-50 px-4 py-3',
          'text-lg text-ink-900 placeholder:text-ink-700/40',
          'shadow-[inset_0_2px_0_0_rgba(31,27,24,0.08)] outline-none',
          'focus:border-pasture-600 focus:ring-4 focus:ring-pasture-300/60',
          className,
        ].join(' ')}
      />
    );
  },
);

export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        'rounded-blob border-2 border-ink-900 bg-cream-50',
        'shadow-[0_6px_0_0_rgba(31,27,24,0.85)]',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}

export function Pill({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'good' | 'pink' | 'muted';
}) {
  const tones = {
    neutral: 'bg-cream-200 text-ink-900 border-ink-900',
    good: 'bg-pasture-300 text-pasture-900 border-pasture-700',
    pink: 'bg-moo-300 text-moo-700 border-moo-700',
    muted: 'bg-cream-100 text-ink-700/70 border-ink-700/30',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** Full-screen scrim + centred panel, used for rules and dialogs. */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/60 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border-2 border-ink-900 bg-cream-50 sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between gap-3 border-b-2 border-ink-900 bg-cream-100 px-5 py-4">
          <h2 className="font-display text-2xl font-bold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-ink-900 bg-cream-50 text-xl font-bold"
          >
            ×
          </button>
        </div>
        <div className="px-5 py-5 text-base leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
