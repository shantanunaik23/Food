/**
 * This Week — the home screen.
 *
 * Answers "what is the plan and what do I buy?" in one screen: seven day cards
 * with the dish, its time, its numbers and the day's secondary task; the week
 * totals against the 2300 / 150 g target; and the shopping list split into the
 * weekend shop and the midweek top-up.
 */

import { useState } from 'react';
import { useStore } from '../state/store';
import { dishNutrition, round } from '../lib/nutrition';
import { alternativesFor, budgetFor } from '../lib/planner';
import { formatShort, isWeekend, shortDayName } from '../lib/dates';
import type { ISODate } from '../lib/dates';
import type { DayPlan, SecondaryTask } from '../state/userState';
import type { Dish } from '../data/types';
import { Chip, Empty, Metric, Panel } from '../components/common';
import { DishDetail } from '../components/DishDetail';
import { ShoppingList } from './ShoppingList';
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
    <div className="day-task">
      <span className="kind">
        + {task.kind.replace('-', ' ')} · {task.minutes} min
      </span>
      <div>{label}</div>
      <div className="hint" style={{ marginTop: 2 }}>
        {task.reason}
      </div>
    </div>
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
              <span>{dinner.activeMinutes}m active</span>
              <span>{dinner.totalMinutes}m total</span>
            </div>
            <div className="day-nums">
              <span>{n?.kcal} kcal</span>
              <span>{n?.proteinG} g</span>
            </div>
            {dinner.learning && <Chip tone="accent">LEARNING</Chip>}

            <div className="budget-bar" title={`${dinnerMin + taskMin} of ${budget} min used`}>
              <i className="dinner" style={{ width: `${(dinnerMin / budget) * 100}%` }} />
              <i className="task" style={{ width: `${(taskMin / budget) * 100}%` }} />
            </div>
            <div className="hint mono" style={{ fontSize: 10.5 }}>
              {left > 0 ? `${left} min spare` : 'budget full'}
            </div>

            <div className="hint" style={{ fontSize: 11.5 }}>
              Lunch: {lunch ? lunch.name : <em>nothing banked</em>}
            </div>

            {day.secondaryTask ? (
              <TaskLine task={day.secondaryTask} />
            ) : (
              <div className="day-task hint">
                <span className="kind">no secondary task</span>
                {left < 5 ? 'Dinner uses the budget' : 'Nothing needs doing'}
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

export function ThisWeek() {
  const { plan, index, state, regenerate } = useStore();
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
  const learningCount = plan.days.filter(
    (d) => d.dinnerId && index.dish.get(d.dinnerId)?.learning,
  ).length;
  const unbankedLunches = plan.days.filter((d) => !d.lunchId).length;

  return (
    <div className="stack">
      <Panel
        title="Week totals"
        meta={`per day, including an assumed ${state.settings.breakfastKcal} kcal breakfast`}
        actions={
          <button className="primary no-print" onClick={regenerate}>
            Regenerate
          </button>
        }
      >
        <div className="row" style={{ padding: 12 }}>
          <div className="metrics">
            <Metric
              label="avg kcal"
              value={avgKcal}
              short={avgKcal < state.settings.targetKcal - 200}
            />
            <Metric label="target" value={state.settings.targetKcal} />
            <Metric
              label="avg protein"
              value={avgProtein}
              unit="g"
              short={avgProtein < state.settings.targetProteinG - 10}
            />
            <Metric label="target" value={state.settings.targetProteinG} unit="g" />
            <Metric label="learning dishes" value={learningCount} />
          </div>
        </div>
        {avgProtein < state.settings.targetProteinG - 10 && (
          <p className="prose" style={{ padding: '0 12px 12px', margin: 0 }}>
            This week lands <strong>{state.settings.targetProteinG - avgProtein} g/day short</strong>{' '}
            of the protein target. Dinner and lunch are already carrying 45–50 g each, so the gap is
            breakfast — closing it needs a higher-protein breakfast than the assumed{' '}
            {state.settings.breakfastProteinG} g, not a different dinner.
          </p>
        )}
        {unbankedLunches > 0 && (
          <p className="prose" style={{ padding: '0 12px 12px', margin: 0 }}>
            <strong>{unbankedLunches} day{unbankedLunches === 1 ? '' : 's'}</strong> have no lunch
            banked. Batch cooks are scheduled where the time budget allows — usually the weekend,
            since a 30-minute weekday cannot fit a dinner and a batch.
          </p>
        )}
      </Panel>

      <section>
        <div className="section-head" style={{ border: '1px solid var(--rule-strong)', borderBottom: 0 }}>
          <h2>The week</h2>
          <span className="meta">dish · time · numbers · secondary task</span>
        </div>
        <div className="week" style={{ marginTop: 8 }}>
          {plan.days.map((day) => (
            <DayCard key={day.date} day={day} onOpen={setOpen} onSwap={setSwapping} />
          ))}
        </div>
      </section>

      <TechniqueProgress />
      <ShoppingList />

      {open && <DishDetail dish={open} onClose={() => setOpen(null)} />}
      {swapping && <SwapPanel date={swapping} onClose={() => setSwapping(null)} />}
    </div>
  );
}
