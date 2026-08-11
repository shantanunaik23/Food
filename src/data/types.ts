/**
 * Component Kitchen — data layer types.
 *
 * The library is a directed acyclic graph over four layers:
 *
 *   Dish ──┬─> Preparation ─> Ingredient
 *          ├─> Base ────────> Ingredient
 *          └─> Ingredient (fresh, used directly)
 *
 * Nothing in this file describes the UI. Content lives in ingredients.ts,
 * preparations.ts, bases.ts, dishes.ts and techniques.ts; the graph is checked
 * by validate.ts, which the build runs before it will produce output.
 */

export type Lane = 'asian' | 'latin' | 'peri' | 'technique';

/** Lanes a component can belong to; 'universal' means it serves any lane. */
export type ComponentLane = Lane | 'universal';

/**
 * Supply tier — how an item enters the kitchen, which is what drives the
 * split between the weekly shop and the midweek top-up.
 *
 *   0  permanent cupboard   bought once, lives on the shelf (spices, vinegar, soy)
 *   1  made in-house        a Preparation or Base, not bought at all
 *   2  weekly fresh         survives from the weekend shop (onions, carrots, mince)
 *   3  buy-for-purpose      will not survive the week — must go in the top-up
 *                           (fresh fish, steak, soft herbs, shellfish)
 */
export type Tier = 0 | 1 | 2 | 3;

/** Aisle grouping, so the shopping list is walkable rather than alphabetical. */
export type Section =
  | 'produce'
  | 'meat'
  | 'fish'
  | 'dairy'
  | 'freezer'
  | 'tinned'
  | 'dry goods'
  | 'spices'
  | 'asian aisle'
  | 'world foods'
  | 'bakery'
  | 'condiments';

export type Storage = 'fridge' | 'freezer' | 'cupboard';

/** Which meal a dish is eligible for. A dish may serve both. */
export type Slot = 'lunch' | 'dinner';

/**
 * Cupboard build-out phase for tier-0 items. The pantry is being assembled from
 * scratch, so tier 0 is presented in the order it is actually worth buying:
 *
 *   1  minimum     you cannot cook the library without these
 *   2  depth       whole spices, dried chillies, the Asian shelf
 *   3  refinement  the things that make it good rather than possible
 */
export type PantryPhase = 1 | 2 | 3;

/** Unit of measure. Mass and volume convert within themselves; 'each' does not. */
export type Unit = 'g' | 'ml' | 'each' | 'tsp' | 'tbsp';

/**
 * Nutrition is always expressed per 100 g or 100 ml of the item, except for
 * 'each' items where it is per unit. Dish and preparation figures are never
 * typed by hand — they are computed from these by lib/nutrition.ts, so editing
 * a quantity updates the totals and a half batch is genuinely half.
 */
export interface Nutrition {
  kcal: number;
  proteinG: number;
}

export interface Ingredient {
  id: string;
  name: string;
  tier: Tier;
  category: string;
  section: Section;
  /** 3650 for dried spices, 5 for coriander. Used for top-up vs weekly split. */
  shelfLifeDays: number;
  defaultUnit: Unit;
  /**
   * Per 100 g / 100 ml, or per unit when defaultUnit is 'each'.
   * `null` for items whose contribution is negligible (water, salt).
   */
  nutrition: Nutrition | null;
  /** Mass of one unit, for ingredients measured 'each' (1 egg = 58 g). */
  gramsPerEach?: number;
  /** Mass of one tsp/tbsp, so spoon measures roll into nutrition correctly. */
  gramsPerTbsp?: number;
  /** Tier-0 only: which cupboard phase this belongs to. */
  pantryPhase?: PantryPhase;
  /** Shown in the pantry list — why it earns shelf space. */
  note?: string;
}

/** A quantity of an ingredient, as used by a preparation, base or dish. */
export interface IngredientRef {
  ingredientId: string;
  qty: number;
  unit: Unit;
  /** Free text shown in the parts list: 'finely diced', 'stems reserved'. */
  prep?: string;
}

/**
 * Anything made in-house: preparations (sauces, pastes, stock, pickles) and
 * bases (rice, noodles, tortillas). They share a shape because the batch-sizing
 * and shelf-life logic treats them identically; only the UI separates them.
 */
export interface Component {
  id: string;
  name: string;
  lane: ComponentLane;
  ingredients: IngredientRef[];
  /** What one batch produces, e.g. 250 ml. */
  yieldAmount: number;
  yieldUnit: Unit;
  /** How much one dish typically draws down. yieldAmount / servingSize = servings. */
  servingSize: number;
  /** Hands-on minutes — what the 30-minute weekday budget actually spends. */
  activeMinutes: number;
  /** Wall-clock minutes including simmering, chilling, proving. */
  totalMinutes: number;
  shelfLifeDays: number;
  storage: Storage;
  techniques: string[];
  method: string[];
  /** True if a batch can be split and frozen, which extends its usable life. */
  freezable: boolean;
  /**
   * Total kcal/protein for ONE WHOLE BATCH, overriding the rollup. Needed where
   * the ingredients are not all eaten: stock discards the bones and vegetables,
   * a brine is poured away, deep-frying leaves most of the oil in the pan.
   * Always give a reason — an override without one is a typo waiting to happen.
   */
  nutritionOverride?: Nutrition & { reason: string };
  notes?: string;
}

export interface Preparation extends Component {
  kind: 'preparation';
}

export interface Base extends Component {
  kind: 'base';
}

export interface ComponentRef {
  /** Id of a Preparation or Base. */
  id: string;
  /** Quantity drawn, in the component's yieldUnit. */
  qty: number;
}

export interface Dish {
  id: string;
  name: string;
  lane: Lane;
  protein: string;
  /** Which meals this dish can fill. Lunch dishes are batch-cooked and frozen. */
  slots: Slot[];
  preparations: ComponentRef[];
  bases: ComponentRef[];
  freshIngredients: IngredientRef[];
  activeMinutes: number;
  totalMinutes: number;
  techniques: string[];
  method: string[];
  difficulty: 1 | 2 | 3;
  /** What to watch for, how to tell it is done. */
  notes: string;
  /**
   * Set when the dish is cooked as a batch for lunches: how many portions one
   * batch yields, and how long a portion keeps frozen. Quantities in this dish
   * are always for ONE portion; the planner multiplies.
   */
  batch?: {
    portions: number;
    freezerLifeDays: number;
  };
  /**
   * True for the dishes the user explicitly wants pushed at them — unfamiliar
   * proteins and techniques. The planner guarantees at least one per week.
   */
  learning?: boolean;
  /**
   * Override the computed nutrition when the rollup is known to be wrong
   * (deep-frying absorbs oil, braising liquid is discarded). Prefer fixing
   * quantities; use this only with a reason.
   */
  nutritionOverride?: Nutrition & { reason: string };
}

export interface Technique {
  id: string;
  name: string;
  description: string;
  whyItMatters: string;
  /** Dish or preparation id where this technique is first met. */
  firstTaughtBy: string;
}

/** The whole content library, as validated and handed to the UI. */
export interface Library {
  ingredients: Ingredient[];
  preparations: Preparation[];
  bases: Base[];
  dishes: Dish[];
  techniques: Technique[];
}
