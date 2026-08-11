/**
 * Technique progression. The planner biases toward untried techniques, so this
 * panel is the visible half of that: what has been cooked, what is still owed.
 */

import { useState } from 'react';
import { useStore } from '../state/store';
import { Chip, Meter, Panel } from '../components/common';
import { DishDetail } from '../components/DishDetail';
import type { Dish } from '../data/types';

export function TechniqueProgress() {
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
              const teacher =
                index.dish.get(t.firstTaughtBy) ?? index.component.get(t.firstTaughtBy);
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
                        onClick={() => setOpen(teacherDish)}
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
      </Panel>
      {open && <DishDetail dish={open} onClose={() => setOpen(null)} />}
    </>
  );
}
