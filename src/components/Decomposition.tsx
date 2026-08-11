/**
 * The decomposition view — the signature element of the app.
 *
 * A dish is shown as an exploded parts list: the dish itself, then each
 * preparation it draws on (expandable to its own ingredients, with shelf life
 * and live status), then the bases, then the fresh items. Layers are told apart
 * by a coloured left rule, an indent and a layer label, so it reads as a
 * structural diagram rather than a list of things.
 *
 * A preparation that is empty or expired is flagged inline, at the point of
 * use, rather than in a banner at the top — the whole value is knowing which
 * part of the assembly is missing.
 */

import { useState } from 'react';
import type { Component, Dish } from '../data/types';
import { useStore } from '../state/store';
import { componentState } from '../state/userState';
import { shelfLife } from '../lib/shelfLife';
import { componentPerYieldUnit, ingredientLineNutrition, round, scale } from '../lib/nutrition';
import { formatQty } from '../lib/units';
import { StatusChip } from './common';

function LayerKey() {
  return (
    <div className="layer-key eyebrow" style={{ padding: '8px 10px' }}>
      <span>
        <i style={{ background: 'var(--layer-prep)' }} /> Preparation
      </span>
      <span>
        <i style={{ background: 'var(--layer-base)' }} /> Base
      </span>
      <span>
        <i style={{ background: 'var(--layer-fresh)' }} /> Fresh
      </span>
    </div>
  );
}

function ComponentBranch({
  component,
  qty,
  layer,
}: {
  component: Component;
  qty: number;
  layer: 'prep' | 'base';
}) {
  const { index, state, today } = useStore();
  const [open, setOpen] = useState(false);

  const cs = componentState(state, component.id);
  const shelf = shelfLife(component, cs, today);
  const nutrition = round(scale(componentPerYieldUnit(index, component), qty));
  const fraction = component.yieldAmount > 0 ? qty / component.yieldAmount : 0;

  // A base is made to order, so its stock status is not a blocker.
  const blocking = layer === 'prep' && shelf.needsAttention && shelf.state !== 'low';

  return (
    <div className="decomp-node">
      <div className={`decomp-l2 ${layer}`}>
        <span className="name">
          <button
            className="disclose"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            title={open ? 'Collapse' : 'Show what goes into this'}
          >
            <span className="tw" aria-hidden="true">
              {open ? '▾' : '▸'}
            </span>
            {component.name}
          </button>
          {layer === 'prep' && <StatusChip shelf={shelf} />}
          {blocking && (
            <span className="chip bad" title="This dish cannot be made until this is restocked">
              BLOCKS THIS DISH
            </span>
          )}
        </span>
        <span className="qty">
          {formatQty(qty, component.yieldUnit)}
          <span style={{ color: 'var(--ink-3)' }}>
            {' '}
            / {formatQty(component.yieldAmount, component.yieldUnit)} batch
          </span>
          {' · '}
          {nutrition.kcal} kcal
        </span>
      </div>

      {open && (
        <div className="decomp-l3">
          <div className="decomp-l3-head">
            Ingredients · scaled to the {Math.round(fraction * 100)}% of a batch this dish uses
          </div>
          {component.ingredients.map((ref) => {
            const ing = index.ingredient.get(ref.ingredientId);
            if (!ing) return null;
            return (
              <div className="decomp-row" key={ref.ingredientId}>
                <span className="name">
                  {ing.name}
                  {ref.prep && <span className="prep-note">{ref.prep}</span>}
                </span>
                <span className="qty">{formatQty(ref.qty * fraction, ref.unit)}</span>
              </div>
            );
          })}
          <div className="decomp-note">
            Yields {formatQty(component.yieldAmount, component.yieldUnit)} ·{' '}
            {component.activeMinutes} min active / {component.totalMinutes} min total · keeps{' '}
            {component.shelfLifeDays} days in the {component.storage}
            {component.freezable ? ' · freezes' : ''}
          </div>
        </div>
      )}
    </div>
  );
}

export function Decomposition({ dish }: { dish: Dish }) {
  const { index } = useStore();

  return (
    <div className="decomp">
      <div className="decomp-l1">{dish.name}</div>
      <LayerKey />

      {dish.preparations.length > 0 && (
        <>
          <div className="decomp-l3-head" style={{ paddingLeft: 10 }}>
            Preparations — made in house
          </div>
          {dish.preparations.map((ref) => {
            const component = index.preparation.get(ref.id);
            if (!component) return null;
            return (
              <ComponentBranch
                key={ref.id}
                component={component}
                qty={ref.qty}
                layer="prep"
              />
            );
          })}
        </>
      )}

      {dish.bases.length > 0 && (
        <>
          <div className="decomp-l3-head" style={{ paddingLeft: 10 }}>
            Bases — made to order
          </div>
          {dish.bases.map((ref) => {
            const component = index.base.get(ref.id);
            if (!component) return null;
            return (
              <ComponentBranch
                key={ref.id}
                component={component}
                qty={ref.qty}
                layer="base"
              />
            );
          })}
        </>
      )}

      {dish.freshIngredients.length > 0 && (
        <>
          <div className="decomp-l3-head" style={{ paddingLeft: 10 }}>
            Fresh — straight into the dish
          </div>
          <div className="decomp-l2 fresh" style={{ display: 'block', fontWeight: 400 }}>
            {dish.freshIngredients.map((ref) => {
              const ing = index.ingredient.get(ref.ingredientId);
              if (!ing) return null;
              const n = round(ingredientLineNutrition(ref, ing));
              return (
                <div
                  className="decomp-row"
                  key={ref.ingredientId}
                  style={{ padding: '5px 0', borderBottom: 0 }}
                >
                  <span className="name">
                    {ing.name}
                    {ref.prep && <span className="prep-note">{ref.prep}</span>}
                    {ing.tier === 3 && (
                      <span className="chip" title="Buy in the midweek top-up — it will not keep">
                        TOP-UP
                      </span>
                    )}
                  </span>
                  <span className="qty">
                    {formatQty(ref.qty, ref.unit)}
                    {n.kcal > 0 && ` · ${n.kcal} kcal`}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
