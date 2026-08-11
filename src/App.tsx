/**
 * App shell: hash routing over four views, plus the profile and data controls.
 *
 * Hash routing rather than a router library, so the built app works from a
 * file:// path or any subdirectory without server rewrites — a hard requirement
 * from the brief.
 */

import { useEffect, useState } from 'react';
import { StoreProvider, useStore } from './state/store';
import { ThisWeek } from './views/ThisWeek';
import { Dishes } from './views/Dishes';
import { Blocks } from './views/Blocks';
import { Pantry } from './views/Pantry';
import { DataControls } from './views/DataControls';
import { storageAvailable } from './lib/storage';

const ROUTES = [
  { hash: '#/week', label: 'This week', view: ThisWeek },
  { hash: '#/dishes', label: 'Dishes', view: Dishes },
  { hash: '#/blocks', label: 'Blocks', view: Blocks },
  { hash: '#/pantry', label: 'Pantry', view: Pantry },
  { hash: '#/data', label: 'Data', view: DataControls },
] as const;

function useHashRoute(): string {
  const [hash, setHash] = useState(() => window.location.hash || '#/week');
  useEffect(() => {
    const onChange = () => setHash(window.location.hash || '#/week');
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

function Chrome() {
  const hash = useHashRoute();
  const { state, profiles, switchProfile } = useStore();
  const route = ROUTES.find((r) => r.hash === hash) ?? ROUTES[0];
  const View = route.view;

  useEffect(() => {
    document.title = `${route.label} · Component Kitchen`;
  }, [route.label]);

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="wordmark">
            Component<span>/</span>Kitchen
          </div>
          <nav className="tabs">
            {ROUTES.map((r) => (
              <a
                key={r.hash}
                href={r.hash}
                aria-current={r.hash === route.hash ? 'page' : undefined}
              >
                {r.label}
              </a>
            ))}
          </nav>
          {profiles.length > 1 && (
            <select
              value={state.profileName}
              onChange={(e) => switchProfile(e.target.value)}
              aria-label="Profile"
              style={{ fontSize: 12 }}
            >
              {profiles.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          )}
        </div>
      </header>

      <main className="shell">
        {!storageAvailable() && (
          <div className="panel" style={{ borderColor: 'var(--warn)', padding: 10, marginBottom: 16 }}>
            <strong>Storage is unavailable</strong> — this browser is blocking local storage, so
            nothing you tick will be remembered. Everything else works; export to JSON before you
            close the tab.
          </div>
        )}
        <View />
      </main>
    </>
  );
}

export function App() {
  return (
    <StoreProvider>
      <Chrome />
    </StoreProvider>
  );
}
