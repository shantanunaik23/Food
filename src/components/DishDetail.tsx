/** Full dish sheet: spec block, decomposition, method, technique notes. */

import type { Dish } from '../data/types';
import { useStore } from '../state/store';
import { dishNutrition, round } from '../lib/nutrition';
import { blockSeverity, missingPreparations } from '../lib/planner';
import { Chip, LANE_LABEL, Metric } from './common';
import { Decomposition } from './Decomposition';

export function DishDetail({ dish, onClose }: { dish: Dish; onClose: () => void }) {
  const { index, planContext, learned, markCooked, state } = useStore();
  const nutrition = round(dishNutrition(index, dish));
  const missing = missingPreparations(planContext, dish);
  const severity = blockSeverity(planContext, dish);
  const cookedCount = state.cooked.filter((c) => c.dishId === dish.id).length;

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={dish.name}
      >
        <header className="modal-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="eyebrow">
              {LANE_LABEL[dish.lane]} · {dish.protein}
              {dish.learning && ' · LEARNING DISH'}
            </div>
            <h1 style={{ marginTop: 2 }}>{dish.name}</h1>
          </div>
          <button onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <div className="modal-body stack" style={{ padding: 12 }}>
          <div className="metrics">
            <Metric label="kcal" value={nutrition.kcal} />
            <Metric label="protein" value={nutrition.proteinG} unit="g" />
            <Metric label="active" value={dish.activeMinutes} unit="min" />
            <Metric label="total" value={dish.totalMinutes} unit="min" />
            <Metric label="difficulty" value={`${dish.difficulty}/3`} />
            {dish.batch && <Metric label="batch" value={dish.batch.portions} unit=" portions" />}
            <Metric label="cooked" value={cookedCount} unit="×" />
          </div>

          {severity !== 'none' && (
            <div
              className="panel"
              style={{ borderColor: severity === 'blocked' ? 'var(--bad)' : undefined, padding: 10 }}
            >
              <div className="eyebrow" style={{ color: severity === 'blocked' ? 'var(--bad)' : undefined }}>
                {severity === 'blocked' ? '✕ Blocked' : '○ Not made yet'}
              </div>
              <p className="detail" style={{ margin: '4px 0 0' }}>
                Needs{' '}
                <strong>
                  {missing.map((id) => index.component.get(id)?.name).filter(Boolean).join(', ')}
                </strong>
                {severity === 'blocked'
                  ? `, which ${missing.length === 1 ? 'is' : 'are'} empty or past its date. Make ${missing.length === 1 ? 'it' : 'them'} first, or pick another dish.`
                  : `, which ${missing.length === 1 ? "hasn't" : "haven't"} been made yet. Cook ${missing.length === 1 ? 'it' : 'them'} ahead, or pick another dish for tonight.`}
              </p>
            </div>
          )}

          {dish.techniques.length > 0 && (
            <div className="row">
              <span className="eyebrow">Techniques</span>
              {dish.techniques.map((id) => {
                const t = index.technique.get(id);
                if (!t) return null;
                const done = learned.has(id);
                return (
                  <Chip key={id} tone={done ? 'good' : 'accent'} glyph={done ? '●' : '○'}>
                    {t.name}
                    {!done && ' · NEW'}
                  </Chip>
                );
              })}
            </div>
          )}

          <section className="panel">
            <header className="section-head">
              <h3>Decomposition</h3>
              <span className="meta">dish → preparations → ingredients</span>
            </header>
            <Decomposition dish={dish} />
          </section>

          <section className="panel">
            <header className="section-head">
              <h3>Method</h3>
              <span className="meta">
                {dish.activeMinutes} min active / {dish.totalMinutes} min total
              </span>
            </header>
            <ol className="method">
              {dish.method.map((step, i) => (
                <li key={i}>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>

          {dish.notes && (
            <section className="panel">
              <header className="section-head">
                <h3>What to watch for</h3>
              </header>
              <p className="prose" style={{ padding: 12, margin: 0 }}>
                {dish.notes}
              </p>
            </section>
          )}

          {dish.nutritionOverride && (
            <p className="hint">
              Nutrition is overridden for this dish: {dish.nutritionOverride.reason}
            </p>
          )}

          <div className="row">
            <button className="primary" onClick={() => markCooked(dish.id)}>
              Mark cooked today
            </button>
            <span className="hint">
              Records the techniques so the planner stops pushing them at you.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
