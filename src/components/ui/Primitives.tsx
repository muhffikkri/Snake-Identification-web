import type { ReactNode } from 'react';

type Tone = 'danger' | 'warning' | 'success' | 'info' | 'neutral' | 'brand';

const TONE_CLASS: Record<Tone, string> = {
  danger: 'badge-danger',
  warning: 'badge-warning',
  success: 'badge-success',
  info: 'badge-info',
  neutral: 'badge-neutral',
  brand: 'badge-brand',
};

interface BadgeProps {
  tone: Tone;
  children: ReactNode;
  /** Pair with a visible word when the tone carries the only signal. */
  dot?: boolean;
}

export function Badge({ tone, children, dot = false }: BadgeProps) {
  return (
    <span className={`badge ${TONE_CLASS[tone]}`}>
      {dot && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function VenomBadge({ label, tone }: { label: string; tone: Tone }) {
  return <Badge tone={tone}>{label}</Badge>;
}

interface CardProps {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'li' | 'figure';
}

export function Card({ children, className = '', as: Tag = 'div' }: CardProps) {
  return <Tag className={`card ${className}`}>{children}</Tag>;
}

interface SectionTitleProps {
  overline?: string;
  title: string;
  lede?: string;
  /** Right-aligned slot for a filter or action that belongs to the heading. */
  aside?: ReactNode;
  as?: 'h1' | 'h2' | 'h3';
}

export function SectionTitle({ overline, title, lede, aside, as: Tag = 'h2' }: SectionTitleProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div className="min-w-0 max-w-2xl">
        {overline && <p className="overline">{overline}</p>}
        <Tag className="mt-1.5 text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">{title}</Tag>
        {lede && <p className="mt-2.5 text-[15px] leading-relaxed text-ink-secondary">{lede}</p>}
      </div>
      {aside && <div className="flex flex-wrap items-center gap-2">{aside}</div>}
    </div>
  );
}

interface MetricProps {
  label: string;
  value: string;
  detail?: string;
  /** The one metric a screen is built around gets the treatment, the rest stay plain. */
  emphasis?: boolean;
}

export function Metric({ label, value, detail, emphasis = false }: MetricProps) {
  return (
    <div>
      <p className="overline">{label}</p>
      <p className={`num mt-1.5 font-semibold leading-none ${emphasis ? 'text-4xl text-brand' : 'text-3xl text-ink'}`}>
        {value}
      </p>
      {detail && <p className="mt-1.5 text-[13px] leading-snug text-ink-muted">{detail}</p>}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  body: string;
  action?: ReactNode;
}

export function EmptyState({ title, body, action }: EmptyStateProps) {
  return (
    <div className="card px-5 py-10 text-center">
      <p className="text-base font-semibold text-ink">{title}</p>
      <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-ink-secondary">{body}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

interface LoadingStateProps {
  label: string;
  steps?: string[];
  doneCount?: number;
}

export function LoadingState({ label, steps = [], doneCount = 0 }: LoadingStateProps) {
  return (
    <div role="status" aria-live="polite">
      <p className="text-sm font-semibold text-ink">{label}</p>
      <p className="mt-1 text-[13px] text-ink-muted">
        This runs on the device. No progress percentage is shown because none is measured.
      </p>
      {steps.length > 0 && (
        <ol className="mt-4 space-y-2">
          {steps.map((step, index) => {
            const done = index < doneCount;
            const current = index === doneCount;
            return (
              <li key={step} className="flex items-start gap-2.5 text-[13px] leading-snug">
                <span
                  aria-hidden="true"
                  className={`mt-1.5 h-2 w-2 flex-none rounded-full ${done ? 'bg-success' : current ? 'bg-brand' : 'bg-line-strong'}`}
                />
                <span className={done || current ? 'text-ink' : 'text-ink-muted'}>{step}</span>
                <span className="sr-only">{done ? 'done' : current ? 'in progress' : 'not started'}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

interface ErrorStateProps {
  title: string;
  body: string;
  action?: ReactNode;
}

export function ErrorState({ title, body, action }: ErrorStateProps) {
  return (
    <div role="alert" className="card border-danger/30 bg-danger-bg px-5 py-6">
      <p className="text-base font-semibold text-danger">{title}</p>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-ink-secondary">{body}</p>
      {action && <div className="mt-4 flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}

interface BarProps {
  value: number;
  max?: number;
  label: string;
  tone?: Tone;
}

/** Horizontal proportion bar used instead of a chart when one number is the point. */
export function Bar({ value, max = 1, label, tone = 'brand' }: BarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const fill: Record<Tone, string> = {
    brand: 'bg-brand',
    danger: 'bg-danger',
    warning: 'bg-warning',
    success: 'bg-success',
    info: 'bg-info',
    neutral: 'bg-ink-muted',
  };
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-2 min-w-0 flex-1 overflow-hidden rounded-sm bg-surface-secondary"
        role="img"
        aria-label={`${label}: ${Math.round(pct)} percent`}
      >
        <div className={`h-full ${fill[tone]}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="num flex-none text-[13px] font-semibold text-ink">{Math.round(pct)}%</span>
    </div>
  );
}

export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span className="sr-only">{children}</span>;
}

export type { Tone };