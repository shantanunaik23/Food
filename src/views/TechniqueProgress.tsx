/**
 * Technique progression. The planner biases toward untried techniques, so this
 * panel is the visible half of that: what has been cooked, what is still owed.
 *
 * `compact` (used on This Week) shows just the meter and count, with the full
 * table one click away — the home screen doesn't need all 14 rows printed to
 * make its point.
 */

import { useState } from 'react';
import { useStore } from '../state/store';
import { Chip, Meter, Panel } from '../components/common';
import { DishDetail } from '../components/DishDetail';
import type { Dish } from '../data/types';

function TechniqueTable({ onOpen }: { onOpen: (dish: Dish) => void }) {
  const { index, learned } = useStore();
  const all = [...index.technique.values()];

  return (
    <table className="spec">
      <thead>
        <tr>
          <th>Technique</th>
          <th>Why it matters</th>
          <th>First taught by</th>
        </tr>
      </thead>
      <tbody>
        {all.map((t) => {
          const isDone = learned.has(t.id);
          const teacher = index.dish.get(t.firstTaughtBy) ?? index.component.get(t.firstTaughtBy);
          const teacherDish = index.dish.get(t.firstTaughtBy);
          return (
            <tr key={t.id}>
              <td>
                <Chip tone={isDone ? 'good' : 'neutral'} glyph={isDone ? '●' : '○'}>
                  {isDone ? 'DONE' : 'TO DO'}
                </Chip>{' '}
                <strong>{t.name}</strong>
              </td>
              <td className="hint">{t.whyItMatters}</td>
              <td>
                {teacherDish ? (
                  <button
                    className="ghost"
                    style={{ padding: 0, minHeight: 0, textAlign: 'left' }}
                    onClick={() => onOpen(teacherDish)}
                  >
                    {teacher?.name}
                  </button>
                ) : (
                  <span className="hint">{teacher?.name ?? t.firstTaughtBy}</span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function TechniqueProgress({ compact = false }: { compact?: boolean }) {
  const { index, learned } = useStore();
  const [open, setOpen] = useState<Dish | null>(null);

  const all = [...index.technique.values()];
  const done = all.filter((t) => learned.has(t.id));

  return (
    <>
      <Panel title="Techniques" meta={`${done.length} of ${all.length} cooked at least once`}>
        <div style={{ padding: 12 }}>
          <Meter
            value={done.length}
            max={all.length}
            tone={done.length === all.length ? 'good' : undefined}
          />
        </div>
        {compact ? (
          <details className="disclosure">
            <summary>
              <span className="summary-label">Show all {all.length}</span>
            </summary>
            <TechniqueTable onOpen={setOpen} />
          </details>
        ) : (
          <TechniqueTable onOpen={setOpen} />
        )}
      </Panel>
      {open && <DishDetail dish={open} onClose={() => setOpen(null)} />}
    </>
  );
}
