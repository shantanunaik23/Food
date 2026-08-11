/**
 * The shopping list, split into the weekend shop and the midweek top-up.
 *
 * Designed mobile-first: this is the one screen used standing up in a
 * supermarket. Big tap targets, section jump links, and check-off state that
 * survives a reload.
 */

import { useEffect, useState } from 'react';
import { useStore } from '../state/store';
import { formatShort } from '../lib/dates';
import type { ShoppingItem, SectionGroup } from '../lib/shopping';
import { Empty } from '../components/common';

const TICKED_KEY = 'ck:ticked';

function loadTicked(): Set<string> {
  try {
    const raw = localStorage.getItem(TICKED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function Group({
  group,
  ticked,
  toggle,
}: {
  group: SectionGroup;
  ticked: Set<string>;
  toggle: (id: string) => void;
}) {
  return (
    <div id={`sec-${group.section.replace(/\s+/g, '-')}`}>
      <div className="section-head" style={{ borderTop: '1px solid var(--rule)' }}>
        <h3>{group.section}</h3>
        <span className="meta">{group.items.length}</span>
      </div>
      {group.items.map((item: ShoppingItem) => {
        const isTicked = ticked.has(item.ingredientId);
        return (
          <label
            key={item.ingredientId}
            className={isTicked ? 'check done' : 'check'}
          >
            <input
              type="checkbox"
              checked={isTicked}
              onChange={() => toggle(item.ingredientId)}
            />
            <span className="body">
              <span style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                <span>{item.name}</span>
                <span className="qty">
                  {item.amount}
                  {item.unit === 'each' ? '' : ` ${item.unit}`}
                </span>
              </span>
              <span className="hint" style={{ display: 'block' }}>
                {item.isPantryGap && '⚑ cupboard staple you have not ticked · '}
                {item.neededFor.join(', ')}
              </span>
            </span>
          </label>
        );
      })}
    </div>
  );
}

export function ShoppingList() {
  const { shoppingList } = useStore();
  const [ticked, setTicked] = useState<Set<string>>(loadTicked);

  useEffect(() => {
    try {
      localStorage.setItem(TICKED_KEY, JSON.stringify([...ticked]));
    } catch {
      /* storage unavailable — the list still works, it just will not persist */
    }
  }, [ticked]);

  const toggle = (id: string) =>
    setTicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const count = (groups: SectionGroup[]) =>
    groups.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <div className="grid-2">
      <section className="panel">
        <header className="section-head">
          <h2>Weekend shop</h2>
          <span className="meta">
            {formatShort(shoppingList.shopDate)} · {count(shoppingList.weekly)} lines
          </span>
        </header>
        {shoppingList.weekly.length === 0 ? (
          <Empty>Nothing to buy — everything the plan needs is already in.</Empty>
        ) : (
          shoppingList.weekly.map((g) => (
            <Group key={g.section} group={g} ticked={ticked} toggle={toggle} />
          ))
        )}
      </section>

      <section className="panel">
        <header className="section-head">
          <h2>Midweek top-up</h2>
          <span className="meta">
            {formatShort(shoppingList.topUpDate)} · {count(shoppingList.topUp)} lines
          </span>
        </header>
        <p className="hint" style={{ padding: '8px 12px', margin: 0 }}>
          Anything whose shelf life is shorter than the gap from the weekend shop to the day it is
          needed. This is what makes fresh fish and steak viable.
        </p>
        {shoppingList.topUp.length === 0 ? (
          <Empty>Nothing needs a top-up this week.</Empty>
        ) : (
          shoppingList.topUp.map((g) => (
            <Group key={g.section} group={g} ticked={ticked} toggle={toggle} />
          ))
        )}
        {ticked.size > 0 && (
          <div style={{ padding: 10 }}>
            <button className="ghost no-print" onClick={() => setTicked(new Set())}>
              Clear {ticked.size} ticked
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
