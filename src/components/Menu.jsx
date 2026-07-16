import { useState } from 'react'
import { DIFFICULTIES, DEFAULT_DIFFICULTY, TARGET_COUNT } from '../config.js'

export default function Menu({ onStart, highScores, onOpenSettings }) {
  const [selected, setSelected] = useState(DEFAULT_DIFFICULTY)
  const diff = DIFFICULTIES[selected]

  return (
    <div className="screen menu">
      <h1 className="title">
        <span className="title-web">AIM</span>
        <span className="title-aim">LITE</span>
      </h1>
      <p className="tagline">Peek &amp; hide flick trainer — tag {TARGET_COUNT} targets before the clock dies.</p>

      <div className="difficulty-picker">
        {Object.values(DIFFICULTIES).map((d) => {
          const best = highScores[d.key]
          return (
            <button
              key={d.key}
              className={`diff-card ${selected === d.key ? 'selected' : ''}`}
              style={{ '--accent': d.accent }}
              onClick={() => setSelected(d.key)}
            >
              <span className="diff-label">{d.label}</span>
              <span className="diff-time">{d.time}s</span>
              <span className="diff-meta">{d.exposure}s exposure</span>
              {best && <span className="diff-best">Best: {best.score.toLocaleString()}</span>}
            </button>
          )
        })}
      </div>

      <div className="menu-actions">
        <button
          className="btn-primary"
          style={{ '--accent': diff.accent }}
          onClick={() => onStart(selected)}
        >
          ▶ START
        </button>
        <button className="btn-ghost" onClick={onOpenSettings}>
          ⚙ Settings
        </button>
      </div>

      <p className="hint">
        Click to lock your aim, move the mouse to look, left-click to fire. Headshots score big —
        but crates and corners will block your shots and hide the enemy.
      </p>
    </div>
  )
}
