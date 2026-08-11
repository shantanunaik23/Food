/**
 * Shelf life is always computed live from `madeOn` against today's date.
 * Never a stored label — that is the difference between a document and a tool.
 *
 * Status is expressed as a glyph AND a word AND a tone, never colour alone.
 */

import type { Component } from '../data/types';
import type { ComponentState } from '../state/userState';
import { daysBetween, todayISO } from './dates';
import type { ISODate } from './dates';

export type ShelfTone = 'good' | 'warn' | 'bad' | 'neutral';

export interface ShelfLife {
  /** Null when nothing is stocked, or when no made-on date was recorded. */
  daysLeft: number | null;
  /** Machine-readable state for filtering and sorting. */
  state: 'stocked' | 'low' | 'empty' | 'expiring' | 'expired' | 'undated';
  /** Glyph, so status never depends on colour. */
  glyph: string;
  /** Short uppercase label for the chip. */
  label: string;
  tone: ShelfTone;
  /** True when this should be restocked: empty, expired, or nearly so. */
  needsAttention: boolean;
}

/** Days remaining before a preparation is considered past it. */
export function daysRemaining(
  component: Component,
  state: ComponentState,
  today: ISODate = todayISO(),
): number | null {
  if (!state.madeOn) return null;
  const age = daysBetween(state.madeOn, today);
  return component.shelfLifeDays - age;
}

export function shelfLife(
  component: Component,
  state: ComponentState,
  today: ISODate = todayISO(),
): ShelfLife {
  if (state.status === 'empty') {
    return {
      daysLeft: null,
      state: 'empty',
      glyph: '○',
      label: 'EMPTY',
      tone: 'bad',
      needsAttention: true,
    };
  }

  const left = daysRemaining(component, state, today);

  // Marked stocked but never dated — usable, just not counting down.
  if (left === null) {
    return {
      daysLeft: null,
      state: state.status === 'low' ? 'low' : 'undated',
      glyph: state.status === 'low' ? '◐' : '●',
      label: state.status === 'low' ? 'LOW' : 'STOCKED',
      tone: state.status === 'low' ? 'warn' : 'good',
      needsAttention: state.status === 'low',
    };
  }

  if (left <= 0) {
    return {
      daysLeft: left,
      state: 'expired',
      glyph: '✕',
      label: left === 0 ? 'USE TODAY' : `${Math.abs(left)} D PAST`,
      tone: 'bad',
      needsAttention: true,
    };
  }

  // "Close to the end of its life" scales with how long it keeps: a stock that
  // lasts 4 days is urgent at 1 day left; kimchi at 60 days is not.
  const warnThreshold = Math.max(1, Math.min(5, Math.ceil(component.shelfLifeDays * 0.25)));

  if (left <= warnThreshold) {
    return {
      daysLeft: left,
      state: 'expiring',
      glyph: '⚠',
      label: `${left} D LEFT`,
      tone: 'warn',
      needsAttention: true,
    };
  }

  if (state.status === 'low') {
    return {
      daysLeft: left,
      state: 'low',
      glyph: '◐',
      label: `LOW · ${left} D`,
      tone: 'warn',
      needsAttention: true,
    };
  }

  return {
    daysLeft: left,
    state: 'stocked',
    glyph: '●',
    label: `${left} D LEFT`,
    tone: 'good',
    needsAttention: false,
  };
}

/** Can this component be drawn on right now? Drives the inline dish flags. */
export function isAvailable(
  component: Component,
  state: ComponentState,
  today: ISODate = todayISO(),
): boolean {
  if (state.status === 'empty') return false;
  const left = daysRemaining(component, state, today);
  return left === null || left > 0;
}
