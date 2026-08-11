/** The dish library: filter, then open for the layer-by-layer decomposition. */

import { useMemo, useState } from 'react';
import type { Dish, Lane } from '../data/types';
import { useStore } from '../state/store';
import { dishNutrition, round } from '../lib/nutrition';
import { missingPreparations } from '../lib/planner';
import { Chip, Empty, LANE_LABEL } from '../components/common';
import { DishDetail } from '../components/DishDetail';

const LANES: (Lane | 'all')[] = ['all', 'asian', 'latin', 'peri', 'technique'];

export function Dishes() {
  const { index, planContext, learned } = useStore();
  const [open, setOpen] = useState<Dish | null>(null);

  const [lane, setLane] = useState<Lane | 'all'>('all');
  const [protein, setProtein] = useState('all');
  const [technique, setTechnique] = useState('all');
  const [maxTime, setMaxTime] = useState(0);
  const [difficulty, setDifficulty] = useState(0);
  const [learningOnly, setLearningOnly] = useState(false);
  const [query, setQuery] = useState('');

  const dishes = useMemo(() => [...index.dish.values()], [index]);
  const proteins = useMemo(
    () => [...new Set(dishes.map((d) => d.protein))].sort(),
    [dishes],
  );

  const filtered = dishes.filter((d) => {
    if (lane !== 'all' && d.lane !== lane) return false;
    if (protein !== 'all' && d.protein !== protein) return false;
    if (technique !== 'all' && !d.techniques.includes(technique)) return false;
    if (maxTime > 0 && d.activeMinutes > maxTime) return false;
    if (difficulty > 0 && d.difficulty !== difficulty) return false;
    if (learningOnly && !d.learning) return false;
    if (query && !d.name.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="stack">
      <section className="panel">
        <header className="section-head">
          <h2>Filters</h2>
          <span className="meta">
            {filtered.length} of {dishes.length} dishes
          </span>
        </header>

        <div className="stack" style={{ padding: 12, gap: 10 }}>
          <div className="row">
            <span className="eyebrow" style={{ width: 74 }}>
              Lane
            </span>
            {LANES.map((l) => (
              <button
                key={l}
                className={lane === l ? 'on' : ''}
                onClick={() => setLane(l)}
                style={{ fontSize: 11 }}
              >
                {l === 'all' ? 'ALL' : LANE_LABEL[l]}
              </button>
            ))}
          </div>

          <div className="row">
            <span className="eyebrow" style={{ width: 74 }}>
              Protein
            </span>
            <select value={protein} onChange={(e) => setProtein(e.target.value)}>
              <option value="all">Any protein</option>
              {proteins.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            <span className="eyebrow">Technique</span>
            <select value={technique} onChange={(e) => setTechnique(e.target.value)}>
              <option value="all">Any technique</option>
              {[...index.technique.values()].map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="row">
            <span className="eyebrow" style={{ width: 74 }}>
              Time
            </span>
            {[0, 15, 20, 25].map((m) => (
              <button
                key={m}
                className={maxTime === m ? 'on' : ''}
                onClick={() => setMaxTime(m)}
                style={{ fontSize: 11 }}
              >
                {m === 0 ? 'ANY' : `≤ ${m} MIN ACTIVE`}
              </button>
            ))}

            <span className="eyebrow">Difficulty</span>
            {[0, 1, 2, 3].map((d) => (
              <button
                key={d}
                className={difficulty === d ? 'on' : ''}
                onClick={() => setDifficulty(d)}
                style={{ fontSize: 11 }}
              >
                {d === 0 ? 'ANY' : `${d}/3`}
              </button>
            ))}
          </div>

          <div className="row">
            <input
              type="search"
              placeholder="Search dishes"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ flex: 1, minWidth: 180 }}
            />
            <button
              className={learningOnly ? 'on' : ''}
              onClick={() => setLearningOnly((v) => !v)}
              style={{ fontSize: 11 }}
            >
              ★ LEARNING ONLY
            </button>
          </div>
        </div>
      </section>

      {filtered.length === 0 ? (
        <Empty>Nothing matches those filters.</Empty>
      ) : (
        <div className="cards">
          {filtered.map((dish) => {
            const n = round(dishNutrition(index, dish));
            const missing = missingPreparations(planContext, dish);
            const newTech = dish.techniques.filter((t) => !learned.has(t));
            return (
              <article className="panel" key={dish.id}>
                <div style={{ padding: 10 }}>
                  <div className="eyebrow">
                    {LANE_LABEL[dish.lane]} · {dish.protein}
                  </div>
                  <h3 style={{ margin: '3px 0 7px' }}>
                    <button
                      className="ghost"
                      style={{ padding: 0, minHeight: 0, textAlign: 'left', fontWeight: 600 }}
                      onClick={() => setOpen(dish)}
                    >
                      {dish.name}
                    </button>
                  </h3>

                  <div className="day-nums" style={{ marginBottom: 7 }}>
                    <span>{n.kcal} kcal</span>
                    <span>{n.proteinG} g</span>
                    <span>{dish.activeMinutes}m active</span>
                    <span>{dish.totalMinutes}m total</span>
                    <span>diff {dish.difficulty}/3</span>
                  </div>

                  <div className="row" style={{ gap: 5 }}>
                    {dish.learning && <Chip tone="accent">LEARNING</Chip>}
                    {dish.slots.includes('lunch') && <Chip glyph="❄">BATCH LUNCH</Chip>}
                    {newTech.map((t) => (
                      <Chip key={t} tone="accent" glyph="○">
                        {index.technique.get(t)?.name}
                      </Chip>
                    ))}
                    {missing.length > 0 && (
                      <Chip tone="bad" glyph="✕">
                        {missing.length} PREP EMPTY
                      </Chip>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {open && <DishDetail dish={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
