/**
 * Shop — the shopping list as its own screen.
 *
 * Split out from This Week: planning dinner and standing in a supermarket
 * aisle are different moments, and stacking the full list under seven day
 * cards meant nobody could see the week's plan without first scrolling past
 * (or below) 150-odd checkbox rows. Same component, same data — just a tab of
 * its own so each screen answers one question.
 */

import { ShoppingList } from './ShoppingList';

export function Shop() {
  return (
    <div className="stack">
      <p className="hint" style={{ margin: 0 }}>
        Generated from this week's plan. Anything already ticked in Pantry is left off.
      </p>
      <ShoppingList />
    </div>
  );
}
