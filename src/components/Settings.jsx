import { useEffect, useState } from 'react'
import {
  SENS_MIN,
  SENS_MAX,
  CS2_SENS_MIN,
  CS2_SENS_MAX,
  DPI_MIN,
  DPI_MAX,
  SENS_MODE_BASIC,
  SENS_MODE_CS2,
} from '../config.js'

// CS2 Sensitivity/DPI are edited as free text locally (so the user can type
// "0." or clear the field without fighting a clamp on every keystroke) and
// only committed — parsed, clamped, rounded — to the persisted settings on
// blur. The basic slider needs no such buffer; it's already a controlled
// range input with a hard min/max.
export default function Settings({ settings, onChange, onReset, onBack }) {
  // Which source is active is an explicit toggle, not inferred from whether
  // a CS2 value happens to be filled in — filling in a CS2 sensitivity
  // shouldn't lock the basic slider away, just make CS2 available to switch to.
  const usingCs2 = settings.sensMode === SENS_MODE_CS2
  const cs2Ready = usingCs2 && settings.cs2Sens != null

  const [sensInput, setSensInput] = useState(settings.cs2Sens != null ? String(settings.cs2Sens) : '')
  const [dpiInput, setDpiInput] = useState(settings.cs2Dpi != null ? String(settings.cs2Dpi) : '')

  // Keep the local buffers in sync when settings change from outside typing
  // (Reset button, or loading a saved value on mount).
  useEffect(() => {
    setSensInput(settings.cs2Sens != null ? String(settings.cs2Sens) : '')
  }, [settings.cs2Sens])
  useEffect(() => {
    setDpiInput(settings.cs2Dpi != null ? String(settings.cs2Dpi) : '')
  }, [settings.cs2Dpi])

  const commitSens = () => {
    if (sensInput.trim() === '') {
      onChange({ cs2Sens: null })
      return
    }
    const v = parseFloat(sensInput)
    if (!Number.isFinite(v)) {
      setSensInput(settings.cs2Sens != null ? String(settings.cs2Sens) : '')
      return
    }
    const clamped = Math.round(Math.min(CS2_SENS_MAX, Math.max(CS2_SENS_MIN, v)) * 100) / 100
    onChange({ cs2Sens: clamped })
    setSensInput(String(clamped))
  }

  const commitDpi = () => {
    if (dpiInput.trim() === '') {
      onChange({ cs2Dpi: null })
      return
    }
    const v = parseFloat(dpiInput)
    if (!Number.isFinite(v)) {
      setDpiInput(settings.cs2Dpi != null ? String(settings.cs2Dpi) : '')
      return
    }
    const clamped = Math.round(Math.min(DPI_MAX, Math.max(DPI_MIN, v)))
    onChange({ cs2Dpi: clamped })
    setDpiInput(String(clamped))
  }

  const previewSens = parseFloat(sensInput)
  const previewDpi = parseFloat(dpiInput)
  const eDpi =
    Number.isFinite(previewSens) && Number.isFinite(previewDpi) ? Math.round(previewSens * previewDpi) : null

  return (
    <div className="screen settings">
      <h2 className="settings-title">SETTINGS</h2>

      <div className="settings-panel">
        <div className="sens-mode-toggle" role="radiogroup" aria-label="Sensitivity source">
          <button
            type="button"
            className={`sens-mode-btn ${!usingCs2 ? 'active' : ''}`}
            aria-pressed={!usingCs2}
            onClick={() => onChange({ sensMode: SENS_MODE_BASIC })}
          >
            Basic
          </button>
          <button
            type="button"
            className={`sens-mode-btn ${usingCs2 ? 'active' : ''}`}
            aria-pressed={usingCs2}
            onClick={() => onChange({ sensMode: SENS_MODE_CS2 })}
          >
            CS2 Sensitivity
          </button>
        </div>

        <div className={`sens-row ${usingCs2 ? 'disabled' : ''}`}>
          <label className="sens-label" htmlFor="sens">Sensitivity</label>
          <input
            id="sens"
            className="sens-slider"
            type="range"
            min={SENS_MIN}
            max={SENS_MAX}
            step={0.05}
            value={settings.sensMult}
            disabled={usingCs2}
            onChange={(e) => onChange({ sensMult: parseFloat(e.target.value) })}
          />
          <span className="sens-value">{settings.sensMult.toFixed(2)}×</span>
        </div>

        <div className="settings-divider" />

        <div className={`settings-advanced ${!usingCs2 ? 'inactive' : ''}`}>
          <h3 className="settings-subhead">CS2 Sensitivity</h3>
          <p className="settings-hint">
            Set your real CS2 sensitivity so aiming here matches your muscle memory. These values
            are saved either way — switch the toggle above to "CS2 Sensitivity" to actually use
            them in-game.
          </p>

          <div className="cs2-fields">
            <label className="cs2-field">
              <span>CS2 Sensitivity</span>
              <input
                type="number"
                inputMode="decimal"
                min={CS2_SENS_MIN}
                max={CS2_SENS_MAX}
                step={0.01}
                placeholder="e.g. 2.50"
                value={sensInput}
                onChange={(e) => setSensInput(e.target.value)}
                onBlur={commitSens}
              />
            </label>
            <label className="cs2-field">
              <span>Mouse DPI</span>
              <input
                type="number"
                inputMode="numeric"
                min={DPI_MIN}
                max={DPI_MAX}
                step={50}
                placeholder="e.g. 800"
                value={dpiInput}
                onChange={(e) => setDpiInput(e.target.value)}
                onBlur={commitDpi}
              />
            </label>
          </div>

          <p className="settings-edpi">eDPI: {eDpi != null ? eDpi.toLocaleString() : '—'}</p>

          {usingCs2 && !cs2Ready && (
            <p className="settings-note">No CS2 sensitivity entered yet — using the basic slider for now.</p>
          )}

          <p className="settings-hint settings-hint-small">
            DPI only affects the eDPI figure above, not the turn rate itself — the same physical
            mouse movement produces the same turn in CS2 and here regardless of DPI. For an exact
            match, make sure Windows mouse acceleration is off and pointer speed is at its default
            (6/11) notch.
          </p>
        </div>
      </div>

      <div className="settings-actions">
        <button className="btn-ghost" onClick={onReset}>
          ↺ Reset to Defaults
        </button>
        <button className="btn-primary" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  )
}
