/**
 * A short, one-time explainer for the core model, plus a small glossary.
 *
 * Shown automatically the first time the app is ever opened on a device, then
 * available again from the "?" in the header for anyone who wants a reminder
 * three weeks later. The rest of the app assumes this vocabulary — Lane, Tier,
 * secondary task, batch sizing — is already familiar, which is exactly the
 * "difficult to understand the building blocks" problem this exists to fix.
 */

import { markOnboardingSeen } from '../lib/storage';

const GLOSSARY: { term: string; meaning: string }[] = [
  { term: 'Preparation', meaning: 'A sauce, paste, stock or pickle you make in a batch and draw on for several dishes — tracked with a shelf-life countdown.' },
  { term: 'Base', meaning: 'Rice, noodles, tortillas — made fresh each time, never tracked or stocked, never blocks a dish.' },
  { term: 'Lane', meaning: 'The flavour world a dish belongs to: S & E Asian, Mexican/Latin, Peri/Portuguese, or Technique (dishes about learning a skill).' },
  { term: 'Tier', meaning: 'How an ingredient enters the kitchen — 0 permanent cupboard, 1 made in-house, 2 weekly fresh, 3 bought specially for the midweek top-up.' },
  { term: 'Secondary task', meaning: "The one extra job — restocking a prep, prepping ahead — that fits in whatever's left of a day's 30 minutes after cooking dinner." },
  { term: 'Batch sizing', meaning: "Whether a preparation is worth making a full batch, a half batch, or skipping — based on what the week's dishes actually need." },
];

export function HowThisWorks({ onClose }: { onClose: () => void }) {
  const close = () => {
    markOnboardingSeen();
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={close} role="presentation">
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="How Component Kitchen works"
        style={{ maxWidth: 620 }}
      >
        <header className="modal-head">
          <div style={{ flex: 1 }}>
            <div className="eyebrow">Before you start</div>
            <h1>How this works</h1>
          </div>
          <button onClick={close} aria-label="Close">
            ✕
          </button>
        </header>

        <div className="modal-body stack" style={{ padding: 12 }}>
          <p className="prose" style={{ margin: 0 }}>
            Every dish is built from three layers. A <strong>dish</strong> — say, chicken tinga
            tacos — draws on <strong>preparations</strong> you've batch-cooked (sofrito, pickled
            onions), a <strong>base</strong> made fresh (tortillas), and a few
            <strong> fresh ingredients</strong> straight into the pan. Tap any dish to see that
            whole breakdown, layer by layer, with what it costs in time and calories.
          </p>

          <div className="panel" style={{ padding: '10px 12px' }}>
            <div className="decomp" style={{ fontSize: 12.5 }}>
              <strong>Chicken tinga tacos</strong>
              <div className="quiet" style={{ marginTop: 4 }}>
                ← sofrito, pickled onions <em>(preparations, batch-cooked)</em>
                <br />← warmed tortillas <em>(base, made fresh)</em>
                <br />← chicken thigh, chipotle, lime <em>(fresh, straight in)</em>
              </div>
            </div>
          </div>

          <p className="prose" style={{ margin: 0 }}>
            The only upkeep is two checklists: tick what's in your <strong>Pantry</strong>, and mark
            each preparation <strong>stocked / low / empty</strong> in <strong>Blocks</strong> when
            you make or use it up. Everything else — shelf-life countdowns, what to buy, what to
            batch-cook this weekend — is worked out from that.
          </p>

          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>
              A few terms you'll see around the app
            </div>
            <table className="spec">
              <tbody>
                {GLOSSARY.map((g) => (
                  <tr key={g.term}>
                    <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{g.term}</td>
                    <td className="hint">{g.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="row">
            <button className="primary" onClick={close}>
              Got it
            </button>
            <span className="hint">Find this again any time from the ? in the header.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
