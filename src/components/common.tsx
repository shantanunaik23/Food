import type { ReactNode } from 'react';
import type { ShelfLife } from '../lib/shelfLife';

export function Chip({
  tone = 'neutral',
  glyph,
  children,
  title,
}: {
  tone?: 'good' | 'warn' | 'bad' | 'neutral' | 'accent';
  glyph?: string;
  children: ReactNode;
  title?: string;
}) {
  const cls = tone === 'neutral' ? 'chip' : `chip ${tone}`;
  return (
    <span className={cls} title={title}>
      {glyph && (
        <span className="glyph" aria-hidden="true">
          {glyph}
        </span>
      )}
      {children}
    </span>
  );
}

/**
 * Shelf-life status. Carries a glyph and a word as well as a colour, so it
 * survives being read on a bad screen or by someone who cannot separate red
 * from green.
 */
export function StatusChip({ shelf, title }: { shelf: ShelfLife; title?: string }) {
  return (
    <Chip tone={shelf.tone} glyph={shelf.glyph} title={title}>
      {shelf.label}
    </Chip>
  );
}

export function Metric({
  label,
  value,
  unit,
  short,
}: {
  label: string;
  value: string | number;
  unit?: string;
  /** Renders in the warning tone — used when a total misses its target. */
  short?: boolean;
}) {
  return (
    <div className={short ? 'metric short' : 'metric'}>
      <span className="label">{label}</span>
      <span className="value">
        {value}
        {unit && <small>{unit}</small>}
      </span>
    </div>
  );
}

export function Panel({
  title,
  meta,
  children,
  actions,
}: {
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="panel">
      <header className="section-head">
        <h2>{title}</h2>
        {meta && <span className="meta">{meta}</span>}
        {actions && <span className="meta">{actions}</span>}
      </header>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}

export function Meter({
  value,
  max,
  tone,
}: {
  value: number;
  max: number;
  tone?: 'good' | 'warn';
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={tone ? `meter ${tone}` : 'meter'}>
      <i style={{ width: `${pct}%` }} />
    </div>
  );
}

export const LANE_LABEL: Record<string, string> = {
  asian: 'S & E ASIAN',
  latin: 'MEXICAN / LATIN',
  peri: 'PERI / PORTUGUESE',
  technique: 'TECHNIQUE',
  universal: 'UNIVERSAL',
};
