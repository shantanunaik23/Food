/**
 * This Week — the home screen.
 *
 * Answers "what's the plan tonight?" first, everything else second. The
 * screen used to also carry the full shopping list and the full techniques
 * table inline, which meant reading past (or scrolling through) close to 200
 * rows before you could even see the seven day cards. Both now live one click
 * away — Shop has its own tab, techniques collapse to a one-line summary —
 * so the thing you open this screen for is what you see first.
 */

import { useState, type ReactNode } from 'react';
import { useStore } from '../state/store';
import { dishNutrition, round } from '../lib/nutrition';
import { alternativesFor, budgetFor } from '../lib/planner';
import { formatShort, isWeekend, shortDayName } from '../lib/dates';
import type { ISODate } from '../lib/dates';
import type { DayPlan, SecondaryTask } from '../state/userState';
import type { Dish } from '../data/types';
import { Chip, Empty, Metric, Panel } from '../components/common';
import { DishDetail } from '../components/DishDetail';
import { TechniqueProgress } from './TechniqueProgress';

function TaskLine({ task }: { task: SecondaryTask }) {
  const { index } = useStore();

  const label = (() => {
    switch (task.kind) {
      case 'batch-cook': {
        const dish = index.dish.get(task.dishId);
        return `Batch cook ${dish?.name ?? task.dishId} ×${task.portions}`;
      }
      case 'restock': {
        const c = index.component.get(task.componentId);
        return `Restock ${c?.name ?? task.componentId} — ${task.size} batch`;
      }
      case 'prep-ahead': {
        const c = index.component.get(task.componentId);
        return `Make ${c?.name ?? task.componentId} ahead`;
      }
    }
  })();

  return (
    <details className="disclosure day-task" style={{ padding: 0 }}>
      <summary style={{ padding: 0, display: 'block' }}>
        <span className="kind">
          + {task.kind.replace('-', ' ')} · {task.minutes} min
        </span>
        <span className="detail" style={{ display: 'block', fontWeight: 600 }}>
          {label}
        </span>
      </summary>
      <p className="quiet" style={{ margin: '4px 0 0' }}>
        {task.reason}
      </p>
    </details>
  );
}

function DayCard({
  day,
  onOpen,
  onSwap,
}: {
  day: DayPlan;
  onOpen: (dish: Dish) => void;
  onSwap: (date: ISODate) => void;
}) {
  const { index, state, today, toggleLock } = useStore();

  const dinner = day.dinnerId ? index.dish.get(day.dinnerId) : null;
  const lunch = day.lunchId ? index.dish.get(day.lunchId) : null;
  const n = dinner ? round(dishNutrition(index, dinner)) : null;

  const budget = budgetFor(state, day.date);
  const dinnerMin = dinner?.activeMinutes ?? 0;
  const taskMin = day.secondaryTask?.minutes ?? 0;
  const left = budget - dinnerMin - taskMin;

  return (
    <article className={day.date === today ? 'day today' : 'day'}>
      <header className="day-head">
        <strong>{shortDayName(day.date)}</strong>
        <span className="date">{formatShort(day.date)}</span>
        {isWeekend(day.date) && <span className="date" title="Longer budget at weekends">✦</span>}
        <span className="spacer" />
        <button
          className="ghost"
          style={{ minHeight: 20, padding: '0 4px', fontSize: 12 }}
          onClick={() => toggleLock(day.date)}
          title={day.locked ? 'Unlock this day' : 'Lock this day so regenerate leaves it alone'}
          aria-pressed={day.locked}
        >
          {day.locked ? '🔒' : '🔓'}
        </button>
      </header>

      <div className="day-body">
        {dinner ? (
          <>
            <div className="day-dish">
              <button onClick={() => onOpen(dinner)}>{dinner.name}</button>
            </div>
            <div className="day-nums">
              <span>{dinner.activeMinutes}m</span>
              <span>{n?.kcal} kcal</span>
              <span>{n?.proteinG} g</span>
            </div>
            {dinner.learning && <Chip tone="accent">LEARNING</Chip>}

            <div
              className="budget-bar"
              title={
                left > 0
                  ? `${dinnerMin + taskMin} of ${budget} min used — ${left} spare`
                  : `${dinnerMin + taskMin} of ${budget} min used — budget full`
              }
            >
              <i className="dinner" style={{ width: `${(dinnerMin / budget) * 100}%` }} />
              <i className="task" style={{ width: `${(taskMin / budget) * 100}%` }} />
            </div>

            <div className="quiet">
              Lunch: {lunch ? lunch.name : <em>nothing banked</em>}
            </div>

            {day.secondaryTask ? (
              <TaskLine task={day.secondaryTask} />
            ) : (
              <div className="day-task quiet">
                <span className="kind">no secondary task</span>
              </div>
            )}

            <button
              className="ghost no-print"
              style={{ fontSize: 11, minHeight: 24 }}
              onClick={() => onSwap(day.date)}
            >
              Swap dish
            </button>
          </>
        ) : (
          <Empty>No dish fits this day&rsquo;s constraints.</Empty>
        )}
      </div>
    </article>
  );
}

function SwapPanel({ date, onClose }: { date: ISODate; onClose: () => void }) {
  const { planContext, plan, index, setDinner } = useStore();
  const options = alternativesFor(planContext, plan, date).slice(0, 12);

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="modal-head">
          <div style={{ flex: 1 }}>
            <div className="eyebrow">Swap dinner</div>
            <h1>{formatShort(date)}</h1>
          </div>
          <button onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>
        <div className="modal-body">
          <p className="hint" style={{ padding: '0 12px' }}>
            Only dishes that fit the day&rsquo;s budget and do not repeat the protein either side.
            Choosing one locks the day.
          </p>
          <table className="spec">
            <thead>
              <tr>
                <th>Dish</th>
                <th>Protein</th>
                <th style={{ textAlign: 'right' }}>Active</th>
                <th style={{ textAlign: 'right' }}>kcal</th>
              </tr>
            </thead>
            <tbody>
              {options.map((dish) => {
                const n = round(dishNutrition(index, dish));
                return (
                  <tr key={dish.id}>
                    <td>
                      <button
                        className="ghost"
                        style={{ padding: 0, minHeight: 0, textAlign: 'left' }}
                        onClick={() => {
                          setDinner(date, dish.id);
                          onClose();
                        }}
                      >
                        {dish.name}
                      </button>
                      {dish.learning && ' ★'}
                    </td>
                    <td className="hint">{dish.protein}</td>
                    <td className="n">{dish.activeMinutes}m</td>
                    <td className="n">{n.kcal}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/** One-line flag with the full reasoning tucked behind it, not printed by default. */
function FlagLine({ headline, children }: { headline: string; children: ReactNode }) {
  return (
    <details className="disclosure" style={{ margin: 0 }}>
      <summary style={{ padding: '6px 0 0' }}>
        <span className="detail" style={{ fontWeight: 600 }}>
          {headline}
        </span>
      </summary>
      <p className="quiet" style={{ margin: '2px 0 6px' }}>
        {children}
      </p>
    </details>
  );
}

export function ThisWeek() {
  const { plan, index, state, shoppingList, regenerate } = useStore();
  const [open, setOpen] = useState<Dish | null>(null);
  const [swapping, setSwapping] = useState<ISODate | null>(null);

  const totals = plan.days.reduce(
    (acc, day) => {
      const dinner = day.dinnerId ? index.dish.get(day.dinnerId) : null;
      const lunch = day.lunchId ? index.dish.get(day.lunchId) : null;
      const dn = dinner ? dishNutrition(index, dinner) : { kcal: 0, proteinG: 0 };
      const ln = lunch ? dishNutrition(index, lunch) : { kcal: 0, proteinG: 0 };
      return {
        kcal: acc.kcal + dn.kcal + ln.kcal + state.settings.breakfastKcal,
        proteinG:
          acc.proteinG + dn.proteinG + ln.proteinG + state.settings.breakfastProteinG,
      };
    },
    { kcal: 0, proteinG: 0 },
  );

  const avgKcal = Math.round(totals.kcal / 7);
  const avgProtein = Math.round(totals.proteinG / 7);
  const proteinGap = state.settings.targetProteinG - avgProtein;
  const learningCount = plan.days.filter(
    (d) => d.dinnerId && index.dish.get(d.dinnerId)?.learning,
  ).length;
  const unbankedLunches = plan.days.filter((d) => !d.lunchId).length;

  const shopLines = shoppingList.totalLines;
  const topUpLines = shoppingList.topUp.reduce((s, g) => s + g.items.length, 0);

  return (
    <div className="stack">
      <Panel
        title="Week totals"
        meta="per day, including an assumed breakfast"
        actions={
          <button className="primary no-print" onClick={regenerate}>
            Regenerate
          </button>
        }
      >
        <div className="row" style={{ padding: 12 }}>
          <div className="metrics">
            <Metric label="avg kcal" value={avgKcal} short={avgKcal < state.settings.targetKcal - 200} />
            <Metric label="target" value={state.settings.targetKcal} />
            <Metric
              label="avg protein"
              value={avgProtein}
              unit="g"
              short={proteinGap > 10}
            />
            <Metric label="target" value={state.settings.targetProteinG} unit="g" />
            <Metric label="learning dishes" value={learningCount} />
          </div>
        </div>

        {proteinGap > 10 && (
          <div style={{ padding: '0 12px' }}>
            <FlagLine headline={`⚠ ${proteinGap} g/day short of the protein target`}>
              Dinner and lunch are already carrying 45–50 g each, so the gap is breakfast — closing
              it needs a higher-protein breakfast than the assumed {state.settings.breakfastProteinG} g,
              not a different dinner.
            </FlagLine>
          </div>
        )}
        {unbankedLunches > 0 && (
          <div style={{ padding: '0 12px 8px' }}>
            <FlagLine headline={`${unbankedLunches} day${unbankedLunches === 1 ? '' : 's'} with no lunch banked`}>
              Batch cooks are scheduled where the time budget allows — usually the weekend, since a
              30-minute weekday cannot fit a dinner and a batch.
            </FlagLine>
          </div>
        )}
      </Panel>

      <section>
        <div className="section-head" style={{ border: '1px solid var(--rule-strong)', borderBottom: 0 }}>
          <h2>The week</h2>
          <span className="meta">tap a dish for the full breakdown</span>
        </div>
        <div className="week" style={{ marginTop: 8 }}>
          {plan.days.map((day) => (
            <DayCard key={day.date} day={day} onOpen={setOpen} onSwap={setSwapping} />
          ))}
        </div>
      </section>

      <div className="row" style={{ gap: 10 }}>
        <a
          href="#/shop"
          className="panel"
          style={{
            flex: 1,
            minWidth: 220,
            padding: 12,
            textDecoration: 'none',
            color: 'inherit',
            display: 'block',
          }}
        >
          <span className="eyebrow">Shopping list →</span>
          <div className="detail" style={{ marginTop: 4 }}>
            {shopLines} item{shopLines === 1 ? '' : 's'} this week
            {topUpLines > 0 && ` · ${topUpLines} in the midweek top-up`}
          </div>
        </a>
      </div>

      <TechniqueProgress compact />

      {open && <DishDetail dish={open} onClose={() => setOpen(null)} />}
      {swapping && <SwapPanel date={swapping} onClose={() => setSwapping(null)} />}
    </div>
  );
}
