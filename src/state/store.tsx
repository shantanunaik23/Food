/**
 * The single React context over user state.
 *
 * Everything derived — the graph index, the plan's dishes, batch
 * recommendations, the shopping list — is memoised here so views stay
 * declarative and nothing recomputes the graph on every keystroke.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { library } from '../data/index';
import { buildIndex, type LibraryIndex } from '../lib/graph';
import { allBatchRecommendations, type BatchRecommendation } from '../lib/batching';
import { buildShoppingList, type ShoppingList } from '../lib/shopping';
import { generateWeek, plannedDishes, type PlanContext } from '../lib/planner';
import { todayISO, startOfWeek } from '../lib/dates';
import type { ISODate } from '../lib/dates';
import {
  createProfile,
  currentProfile,
  listProfiles,
  loadProfile,
  saveProfile,
  setCurrentProfile,
} from '../lib/storage';
import {
  createUserState,
  learnedTechniques,
  type StockStatus,
  type UserState,
  type WeekPlan,
} from './userState';

interface Store {
  state: UserState;
  index: LibraryIndex;
  today: ISODate;
  planContext: PlanContext;

  profiles: string[];
  switchProfile: (name: string) => void;
  newProfile: (name: string) => void;
  replaceState: (next: UserState) => void;

  // Derived
  plan: WeekPlan;
  recommendations: BatchRecommendation[];
  shoppingList: ShoppingList;
  learned: Set<string>;

  // Mutations — the only state the user maintains by hand.
  setPantry: (ingredientId: string, owned: boolean) => void;
  setComponentStatus: (componentId: string, status: StockStatus) => void;
  regenerate: () => void;
  toggleLock: (date: ISODate) => void;
  setDinner: (date: ISODate, dishId: string) => void;
  markCooked: (dishId: string) => void;
  adjustFreezer: (dishId: string, delta: number) => void;
  updateSettings: (patch: Partial<UserState['settings']>) => void;
}

const StoreContext = createContext<Store | null>(null);

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside <StoreProvider>');
  return store;
}

function initialState(): UserState {
  const name = currentProfile();
  if (name) {
    const loaded = loadProfile(name);
    if (loaded) return loaded;
  }
  const first = listProfiles()[0];
  if (first) {
    const loaded = loadProfile(first);
    if (loaded) {
      setCurrentProfile(first);
      return loaded;
    }
  }
  return createProfile('default');
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UserState>(initialState);
  const [profiles, setProfiles] = useState<string[]>(() => {
    const found = listProfiles();
    return found.length ? found : ['default'];
  });

  // The library never changes at runtime, so the index is built once.
  const index = useMemo(() => buildIndex(library), []);
  const today = useMemo(() => todayISO(), []);

  // Persist on every change. Small enough that debouncing is not worth the
  // risk of losing the last write on a tab close.
  useEffect(() => {
    saveProfile(state);
  }, [state]);

  const planContext = useMemo<PlanContext>(
    () => ({ index, state, today }),
    [index, state, today],
  );

  // A plan is generated on demand rather than eagerly, so a fresh profile does
  // not silently commit to a week the user has not asked for.
  const plan = useMemo<WeekPlan>(() => {
    if (state.plan) return state.plan;
    return generateWeek(planContext, startOfWeek(today));
  }, [state.plan, planContext, today]);

  const planned = useMemo(() => plannedDishes(plan), [plan]);

  const recommendations = useMemo(
    () => allBatchRecommendations(index, planned, state, today),
    [index, planned, state, today],
  );

  const shoppingList = useMemo(() => {
    const toMake = new Set(
      recommendations.filter((r) => r.size !== 'skip').map((r) => r.componentId),
    );
    return buildShoppingList(index, planned, state, plan.startDate, toMake);
  }, [index, planned, state, plan.startDate, recommendations]);

  const learned = useMemo(
    () => learnedTechniques(state, (id) => index.dish.get(id)?.techniques ?? []),
    [state, index],
  );

  const setPantry = useCallback((ingredientId: string, owned: boolean) => {
    setState((s) => ({ ...s, pantry: { ...s.pantry, [ingredientId]: owned } }));
  }, []);

  const setComponentStatus = useCallback((componentId: string, status: StockStatus) => {
    setState((s) => ({
      ...s,
      components: {
        ...s.components,
        [componentId]: {
          status,
          // Marking something stocked starts its countdown from today; marking
          // it low keeps the original date, because it is the same batch.
          madeOn:
            status === 'stocked'
              ? todayISO()
              : status === 'empty'
                ? null
                : (s.components[componentId]?.madeOn ?? null),
        },
      },
    }));
  }, []);

  const regenerate = useCallback(() => {
    setState((s) => ({
      ...s,
      plan: generateWeek({ index, state: s, today }, startOfWeek(today), s.plan),
    }));
  }, [index, today]);

  const toggleLock = useCallback((date: ISODate) => {
    setState((s) => {
      const current = s.plan;
      if (!current) return s;
      return {
        ...s,
        plan: {
          ...current,
          days: current.days.map((d) =>
            d.date === date ? { ...d, locked: !d.locked } : d,
          ),
        },
      };
    });
  }, []);

  const setDinner = useCallback((date: ISODate, dishId: string) => {
    setState((s) => {
      const current = s.plan;
      if (!current) return s;
      return {
        ...s,
        plan: {
          ...current,
          days: current.days.map((d) =>
            d.date === date ? { ...d, dinnerId: dishId, locked: true } : d,
          ),
        },
      };
    });
  }, []);

  const markCooked = useCallback((dishId: string) => {
    setState((s) => ({ ...s, cooked: [...s.cooked, { dishId, date: todayISO() }] }));
  }, []);

  const adjustFreezer = useCallback((dishId: string, delta: number) => {
    setState((s) => ({
      ...s,
      freezer: { ...s.freezer, [dishId]: Math.max(0, (s.freezer[dishId] ?? 0) + delta) },
    }));
  }, []);

  const updateSettings = useCallback((patch: Partial<UserState['settings']>) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  }, []);

  const switchProfile = useCallback((name: string) => {
    const loaded = loadProfile(name) ?? createUserState(name);
    setCurrentProfile(name);
    setState(loaded);
  }, []);

  const newProfile = useCallback((name: string) => {
    const created = createProfile(name);
    setProfiles((p) => [...new Set([...p, name])]);
    setState(created);
  }, []);

  const replaceState = useCallback((next: UserState) => {
    setState(next);
    setProfiles((p) => [...new Set([...p, next.profileName])]);
    setCurrentProfile(next.profileName);
  }, []);

  // The plan is materialised into state the first time it is generated, so
  // regenerate and lock have something concrete to work from.
  useEffect(() => {
    if (!state.plan) setState((s) => (s.plan ? s : { ...s, plan }));
  }, [state.plan, plan]);

  const value: Store = {
    state,
    index,
    today,
    planContext,
    profiles,
    switchProfile,
    newProfile,
    replaceState,
    plan,
    recommendations,
    shoppingList,
    learned,
    setPantry,
    setComponentStatus,
    regenerate,
    toggleLock,
    setDinner,
    markCooked,
    adjustFreezer,
    updateSettings,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
