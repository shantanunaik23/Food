/**
 * Profiles, export/import, and the assumptions the plan is built on.
 *
 * Export/import is the substitute for an account: it is how the data moves
 * between a desktop and a phone, and how it survives a cleared browser.
 */

import { useRef, useState } from 'react';
import { useStore } from '../state/store';
import { downloadExport, importFromJSON, mergeStates } from '../lib/storage';
import { Panel } from '../components/common';

export function DataControls() {
  const { state, profiles, newProfile, replaceState, updateSettings } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ tone: 'good' | 'bad'; text: string } | null>(null);
  const [pendingName, setPendingName] = useState('');

  const handleFile = async (file: File, mode: 'replace' | 'merge') => {
    const text = await file.text();
    const result = importFromJSON(text);
    if (!result.ok) {
      setMessage({ tone: 'bad', text: result.error });
      return;
    }
    const next =
      mode === 'merge'
        ? mergeStates(state, result.state)
        : { ...result.state, profileName: result.state.profileName || state.profileName };
    replaceState(next);
    setMessage({
      tone: 'good',
      text:
        mode === 'merge'
          ? 'Merged. Where both files knew about the same preparation, the more recently made batch won.'
          : `Replaced the current profile with "${next.profileName}".`,
    });
  };

  return (
    <div className="stack">
      <Panel title="Export and import" meta="your data never leaves this machine">
        <div className="stack" style={{ padding: 12 }}>
          <p className="prose" style={{ margin: 0 }}>
            Everything is stored in this browser under the profile{' '}
            <strong>{state.profileName}</strong>. There is no account and no server, so exporting is
            both how you move data to your phone and how you back it up. Do it before you clear your
            browser data.
          </p>

          <div className="row">
            <button className="primary" onClick={() => downloadExport(state)}>
              Export to JSON
            </button>
            <button onClick={() => fileRef.current?.click()}>Import…</button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const merge = window.confirm(
                  'Merge with the current profile?\n\nOK = merge (keeps both sets of ticks, newer batches win)\nCancel = replace everything with the file',
                );
                void handleFile(file, merge ? 'merge' : 'replace');
                e.target.value = '';
              }}
            />
          </div>

          {message && (
            <p
              className="prose"
              style={{
                margin: 0,
                color: message.tone === 'bad' ? 'var(--bad)' : 'var(--good)',
              }}
            >
              {message.text}
            </p>
          )}
        </div>
      </Panel>

      <Panel title="Profiles" meta={`${profiles.length} on this device`}>
        <div className="row" style={{ padding: 12 }}>
          <input
            type="text"
            placeholder="New profile name"
            value={pendingName}
            onChange={(e) => setPendingName(e.target.value)}
          />
          <button
            disabled={!pendingName.trim() || profiles.includes(pendingName.trim())}
            onClick={() => {
              newProfile(pendingName.trim());
              setPendingName('');
            }}
          >
            Create
          </button>
          <span className="hint">
            Separate pantry, preparations and plan. Switch from the header.
          </span>
        </div>
      </Panel>

      <Panel title="Assumptions" meta="what the plan is built on">
        <p className="hint" style={{ padding: '8px 12px', margin: 0 }}>
          Breakfast is out of scope for planning but still counts toward the daily totals, so it is
          an assumption rather than a dish. The weekday budget is <strong>hands-on</strong> minutes:
          unattended oven and simmer time does not count against it.
        </p>
        <table className="spec">
          <tbody>
            {(
              [
                ['weekdayBudgetMin', 'Weekday hands-on budget', 'min'],
                ['weekendBudgetMin', 'Weekend hands-on budget', 'min'],
                ['breakfastKcal', 'Assumed breakfast', 'kcal'],
                ['breakfastProteinG', 'Assumed breakfast protein', 'g'],
                ['targetKcal', 'Daily target', 'kcal'],
                ['targetProteinG', 'Daily protein target', 'g'],
                ['maxChickenDaysPerWeek', 'Max chicken days per week', 'days'],
              ] as const
            ).map(([key, label, unit]) => (
              <tr key={key}>
                <td>{label}</td>
                <td className="n">
                  <input
                    type="number"
                    value={state.settings[key]}
                    onChange={(e) => updateSettings({ [key]: Number(e.target.value) })}
                    style={{ width: 80, textAlign: 'right' }}
                  />{' '}
                  {unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
