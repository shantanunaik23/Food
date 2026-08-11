/**
 * Pantry — tiers 0–3 as checklists.
 *
 * Tier 0 is presented in the three phases it is actually worth buying in,
 * because the cupboard is being built from scratch and "buy 90 spices" is not
 * an actionable instruction. Anything the week's plan needs but that is not
 * ticked is flagged, since a missing staple is what ruins a Tuesday.
 */

import { useMemo, useState } from 'react';
import type { Ingredient, PantryPhase } from '../data/types';
import { useStore } from '../state/store';
import { Chip, Meter, Panel } from '../components/common';

const PHASE_TITLE: Record<PantryPhase, string> = {
  1: 'Phase 1 · Working minimum',
  2: 'Phase 2 · Depth',
  3: 'Phase 3 · Refinement',
};

const PHASE_BLURB: Record<PantryPhase, string> = {
  1: 'You cannot cook this library without these. Buy the lot in one go.',
  2: 'Whole spices, dried chillies and the Asian shelf. This is where the cooking gets good rather than merely possible.',
  3: 'The last 10%. Buy these when a specific dish asks for them.',
};

function Row({ ingredient, needed }: { ingredient: Ingredient; needed: boolean }) {
  const { state, setPantry } = useStore();
  const owned = state.pantry[ingredient.id] === true;

  return (
    <label className={owned ? 'check done' : 'check'}>
      <input
        type="checkbox"
        checked={owned}
        onChange={(e) => setPantry(ingredient.id, e.target.checked)}
      />
      <span className="body">
        <span style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
          <span>
            {ingredient.name}
            {needed && !owned && (
              <>
                {' '}
                <Chip tone="warn" glyph="⚑">
                  ON THIS WEEK&rsquo;S LIST
                </Chip>
              </>
            )}
          </span>
          <span className="qty">{ingredient.section}</span>
        </span>
        {ingredient.note && (
          <span className="hint" style={{ display: 'block' }}>
            {ingredient.note}
          </span>
        )}
      </span>
    </label>
  );
}

function Checklist({
  title,
  blurb,
  items,
  neededIds,
}: {
  title: string;
  blurb?: string;
  items: Ingredient[];
  neededIds: Set<string>;
}) {
  const { state } = useStore();
  const owned = items.filter((i) => state.pantry[i.id] === true).length;

  return (
    <Panel title={title} meta={`${owned} / ${items.length}`}>
      {blurb && (
        <p className="hint" style={{ padding: '8px 12px', margin: 0 }}>
          {blurb}
        </p>
      )}
      <div style={{ padding: '0 12px 10px' }}>
        <Meter value={owned} max={items.length} tone={owned === items.length ? 'good' : undefined} />
      </div>
      {items.map((i) => (
        <Row key={i.id} ingredient={i} needed={neededIds.has(i.id)} />
      ))}
    </Panel>
  );
}

export function Pantry() {
  const { index, shoppingList, state } = useStore();
  const [hideOwned, setHideOwned] = useState(false);

  const neededIds = useMemo(() => {
    const ids = new Set<string>();
    for (const group of [...shoppingList.weekly, ...shoppingList.topUp]) {
      for (const item of group.items) ids.add(item.ingredientId);
    }
    return ids;
  }, [shoppingList]);

  const all = useMemo(() => [...index.ingredient.values()], [index]);
  const visible = (list: Ingredient[]) =>
    hideOwned ? list.filter((i) => state.pantry[i.id] !== true) : list;

  const tier0 = all.filter((i) => i.tier === 0 && i.id !== 'water');
  const phases: PantryPhase[] = [1, 2, 3];

  const ownedCount = all.filter((i) => state.pantry[i.id] === true).length;
  const gaps = [...neededIds].filter((id) => state.pantry[id] !== true).length;

  return (
    <div className="stack">
      <Panel title="Cupboard" meta={`${ownedCount} items ticked`}>
        <div className="row" style={{ padding: 12 }}>
          <p className="prose" style={{ margin: 0, flex: 1, minWidth: 240 }}>
            Tick what you own. The shopping list excludes anything ticked, so this is the only place
            the app needs you to keep honest. <strong>{gaps}</strong> item
            {gaps === 1 ? '' : 's'} on this week&rsquo;s list are not ticked yet.
          </p>
          <button
            className={hideOwned ? 'on' : ''}
            onClick={() => setHideOwned((v) => !v)}
            style={{ fontSize: 11 }}
          >
            {hideOwned ? 'SHOWING GAPS ONLY' : 'HIDE WHAT I OWN'}
          </button>
        </div>
      </Panel>

      {phases.map((phase) => {
        const items = visible(tier0.filter((i) => i.pantryPhase === phase));
        if (items.length === 0) return null;
        return (
          <Checklist
            key={phase}
            title={PHASE_TITLE[phase]}
            blurb={PHASE_BLURB[phase]}
            items={items}
            neededIds={neededIds}
          />
        );
      })}

      {[2, 3].map((tier) => {
        const items = visible(all.filter((i) => i.tier === tier));
        if (items.length === 0) return null;
        return (
          <Checklist
            key={tier}
            title={
              tier === 2
                ? 'Tier 2 · Weekly fresh'
                : 'Tier 3 · Buy for purpose'
            }
            blurb={
              tier === 2
                ? 'Survives from the weekend shop. Bought most weeks whether or not a specific dish calls for it.'
                : 'Will not survive the week — fresh fish, steak, soft herbs. These are what the midweek top-up is for, and why they are worth planning around.'
            }
            items={items}
            neededIds={neededIds}
          />
        );
      })}
    </div>
  );
}
