/**
 * Blocks — the made-in-house layer.
 *
 * One card per preparation: yield, time, storage, live shelf-life countdown,
 * the dishes that depend on it (backward traversal), and the batch-sizing
 * verdict with its arithmetic shown rather than hidden.
 */

import { useState } from 'react';
import type { Component } from '../data/types';
import { useStore } from '../state/store';
import { componentState, everTouched, type StockStatus } from '../state/userState';
import { shelfLife } from '../lib/shelfLife';
import { componentBatchNutrition, round } from '../lib/nutrition';
import { formatQty } from '../lib/units';
import { dependentDishes } from '../lib/graph';
import type { BatchRecommendation } from '../lib/batching';
import { Chip, Empty, LANE_LABEL, Panel, StatusChip } from '../components/common';
import { DishDetail } from '../components/DishDetail';
import type { Dish } from '../data/types';

function StatusButtons({ component }: { component: Component }) {
  const { state, setComponentStatus } = useStore();
  const current = componentState(state, component.id).status;

  const options: { value: StockStatus; label: string; glyph: string }[] = [
    { value: 'stocked', label: 'STOCKED', glyph: '●' },
    { value: 'low', label: 'LOW', glyph: '◐' },
    { value: 'empty', label: 'EMPTY', glyph: '○' },
  ];

  return (
    <div className="row" style={{ gap: 4 }}>
      {options.map((o) => (
        <button
          key={o.value}
          className={current === o.value ? 'on' : ''}
          style={{ fontSize: 11, minHeight: 28 }}
          onClick={() => setComponentStatus(component.id, o.value)}
          aria-pressed={current === o.value}
          title={
            o.value === 'stocked'
              ? 'Marks it made today and starts the shelf-life countdown'
              : undefined
          }
        >
          <span aria-hidden="true">{o.glyph}</span> {o.label}
        </button>
      ))}
    </div>
  );
}

function BlockCard({
  rec,
  onOpenDish,
}: {
  rec: BatchRecommendation;
  onOpenDish: (dish: Dish) => void;
}) {
  const { index, state, today } = useStore();
  const component = rec.component;
  const cs = componentState(state, component.id);
  const neverMade = !everTouched(state, component.id);
  const shelf = shelfLife(component, cs, today, neverMade);
  const batchNutrition = round(componentBatchNutrition(index, component));
  const dependents = dependentDishes(index, component.id);

  const sizeTone = rec.size === 'skip' ? 'neutral' : rec.size === 'full' ? 'accent' : 'warn';
  const sizeLabel =
    rec.size === 'skip'
      ? 'SKIP'
      : rec.batches > 1
        ? `${rec.batches} FULL BATCHES`
        : rec.size === 'full'
          ? 'FULL BATCH'
          : 'HALF BATCH';

  return (
    <article className="panel">
      <header className="section-head">
        <span className="card-title" style={{ textTransform: 'none' }}>
          {component.name}
        </span>
        <span className="meta">
          <StatusChip shelf={shelf} />
        </span>
      </header>

      <div style={{ padding: 10 }} className="stack">
        <div className="eyebrow">{LANE_LABEL[component.lane] ?? component.lane}</div>

        <table className="spec">
          <tbody>
            <tr>
              <td>Yield</td>
              <td className="n">
                {formatQty(component.yieldAmount, component.yieldUnit)} ·{' '}
                {Math.floor(component.yieldAmount / component.servingSize)} servings
              </td>
            </tr>
            <tr>
              <td>Time</td>
              <td className="n">
                {component.activeMinutes}m active / {component.totalMinutes}m total
              </td>
            </tr>
            <tr>
              <td>Keeps</td>
              <td className="n">
                {component.shelfLifeDays} d · {component.storage}
                {component.freezable ? ' · freezes' : ''}
              </td>
            </tr>
            <tr>
              <td>Per batch</td>
              <td className="n">
                {batchNutrition.kcal} kcal · {batchNutrition.proteinG} g
              </td>
            </tr>
            {cs.madeOn && (
              <tr>
                <td>Made</td>
                <td className="n">{cs.madeOn}</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="row" style={{ gap: 6 }}>
          <span className="eyebrow">Batch sizing</span>
          <Chip tone={sizeTone}>{sizeLabel}</Chip>
        </div>
        {rec.size !== 'skip' && (
          <details className="disclosure" style={{ margin: '-4px 0 0' }}>
            <summary style={{ padding: '2px 0' }}>
              <span className="quiet mono">why?</span>
            </summary>
            <p className="quiet mono" style={{ margin: '4px 0 0', lineHeight: 1.5 }}>
              {rec.rationale}
            </p>
          </details>
        )}

        <div>
          <div className="eyebrow" style={{ marginBottom: 4 }}>
            Depended on by {dependents.length} dish{dependents.length === 1 ? '' : 'es'}
          </div>
          {dependents.length === 0 ? (
            <p className="hint" style={{ margin: 0 }}>
              Nothing uses this yet.
            </p>
          ) : (
            <div className="row" style={{ gap: 4 }}>
              {dependents.map((dish) => (
                <button
                  key={dish.id}
                  className="ghost"
                  style={{ fontSize: 11, minHeight: 22, padding: '1px 5px' }}
                  onClick={() => onOpenDish(dish)}
                >
                  {dish.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <StatusButtons component={component} />
      </div>
    </article>
  );
}

export function Blocks() {
  const { recommendations } = useStore();
  const [open, setOpen] = useState<Dish | null>(null);
  const [showBases, setShowBases] = useState(false);

  const preparations = recommendations.filter((r) => r.component.kind === 'preparation');
  const bases = recommendations.filter((r) => r.component.kind === 'base');

  const toMake = preparations.filter((r) => r.size !== 'skip');
  const stockRec = preparations.find((r) => r.componentId === 'chicken-stock');

  return (
    <div className="stack">
      <Panel
        title="Restock queue"
        meta={`${toMake.length} of ${preparations.length} preparations want making`}
      >
        {toMake.length === 0 ? (
          <Empty>Everything the next fortnight needs is already stocked.</Empty>
        ) : (
          <table className="spec">
            <thead>
              <tr>
                <th>Preparation</th>
                <th>Verdict</th>
                <th>Why</th>
                <th style={{ textAlign: 'right' }}>Active</th>
              </tr>
            </thead>
            <tbody>
              {toMake.map((r) => (
                <tr key={r.componentId}>
                  <td>
                    <strong>{r.component.name}</strong>
                    {r.componentId === 'chicken-stock' && (
                      <>
                        {' '}
                        <Chip tone="accent">KEYSTONE</Chip>
                      </>
                    )}
                  </td>
                  <td>
                    <Chip tone={r.size === 'full' ? 'accent' : 'warn'}>
                      {r.batches > 1
                        ? `${r.batches} BATCHES`
                        : r.size === 'full'
                          ? 'FULL'
                          : 'HALF'}
                    </Chip>
                  </td>
                  <td className="hint mono" style={{ fontSize: 11 }}>
                    {r.rationale}
                  </td>
                  <td className="n">{r.component.activeMinutes}m</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      {stockRec && <StockNag rec={stockRec} />}

      <section>
        <div className="section-head" style={{ border: '1px solid var(--rule-strong)' }}>
          <h2>Preparations</h2>
          <span className="meta">sorted by urgency · {preparations.length} total</span>
          <button
            className="ghost no-print"
            style={{ fontSize: 11 }}
            onClick={() => setShowBases((v) => !v)}
          >
            {showBases ? 'Hide bases' : 'Show bases'}
          </button>
        </div>
        <div className="cards" style={{ marginTop: 8 }}>
          {preparations.map((r) => (
            <BlockCard key={r.componentId} rec={r} onOpenDish={setOpen} />
          ))}
        </div>
      </section>

      {showBases && (
        <section>
          <div className="section-head" style={{ border: '1px solid var(--rule-strong)' }}>
            <h2>Bases</h2>
            <span className="meta">made to order — they never block a dish</span>
          </div>
          <div className="cards" style={{ marginTop: 8 }}>
            {bases.map((r) => (
              <BlockCard key={r.componentId} rec={r} onOpenDish={setOpen} />
            ))}
          </div>
        </section>
      )}

      {open && <DishDetail dish={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

/**
 * Chicken stock is the highest-value item in the system — it is what turns a
 * seared chop into a chop with a pan sauce — so it gets its own callout. Only
 * when the plan actually needs it: showing this on an empty week just adds
 * noise, and a fresh profile where it has simply never been made yet gets the
 * calm version, not the amber "something's wrong" one.
 */
function StockNag({ rec }: { rec: BatchRecommendation }) {
  const { index, state, today } = useStore();
  const stock = rec.component;
  if (rec.size === 'skip') return null;

  const cs = componentState(state, stock.id);
  const neverMade = !everTouched(state, stock.id);
  const shelf = shelfLife(stock, cs, today, neverMade);
  const dependents = dependentDishes(index, stock.id);
  const dependentsPhrase = `${dependents.length} dish${dependents.length === 1 ? '' : 'es'} in the library depend on it`;
  const timePhrase = `${stock.activeMinutes} minutes of actual work spread over ${Math.round(stock.totalMinutes / 60)} hours — make it on a weekend when you are in anyway`;

  if (neverMade) {
    return (
      <div className="panel" style={{ padding: 12 }}>
        <div className="row">
          <span className="eyebrow">Worth making: chicken stock</span>
          <StatusChip shelf={shelf} />
        </div>
        <p className="detail" style={{ margin: '6px 0 0' }}>
          It's the highest-value thing in the kitchen — the difference between a seared chop and
          one with a pan sauce. {dependentsPhrase}. {timePhrase}.
        </p>
      </div>
    );
  }

  return (
    <div className="panel" style={{ borderColor: 'var(--warn)', padding: 12 }}>
      <div className="row">
        <span className="eyebrow" style={{ color: 'var(--warn)' }}>
          ⚠ Keystone running out
        </span>
        <StatusChip shelf={shelf} />
      </div>
      <p className="detail" style={{ margin: '6px 0 0' }}>
        <strong>Chicken stock is {shelf.label.toLowerCase()}.</strong> {dependentsPhrase}.{' '}
        {timePhrase}.
      </p>
    </div>
  );
}
