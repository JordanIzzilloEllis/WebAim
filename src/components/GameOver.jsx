import { DIFFICULTIES, TARGET_COUNT, computeMaxScore } from '../config.js'

const MAX_SCORE = computeMaxScore()

// A quip on how the run stacks up against a theoretical perfect run (every
// target a headshot, combo maxed). The snitch is a bonus on top of that
// perfect run, so a great catch can push a score past 100% — that's the
// "damn" tier. Tier drives the CSS (score-quip[data-tier]) so the flavour
// text escalates in size/colour/effects right along with the words.
function quipFor(score) {
  if (score >= MAX_SCORE) return { tier: 'damn', text: 'DAMN! Was that a Grayson technology?' }
  const pct = score / MAX_SCORE
  if (pct >= 0.8) return { tier: 'insane', text: 'Insane!' }
  if (pct >= 0.6) return { tier: 'great', text: 'Great!' }
  if (pct >= 0.4) return { tier: 'good', text: 'Good.' }
  if (pct >= 0.2) return { tier: 'ok', text: 'Ok.' }
  return { tier: 'run-it-back', text: 'Run it back.' }
}

export default function GameOver({ results, highScore, onPlayAgain, onMenu }) {
  const diff = DIFFICULTIES[results.difficulty]
  const accuracyPct = Math.round(results.accuracy * 100)
  const hsRatePct = Math.round(results.headshotRate * 100)
  const isRecord = highScore && highScore.score === results.score
  const quip = quipFor(results.score)

  const headline = results.completed ? 'ROUND CLEARED' : "TIME'S UP"

  const grade = (() => {
    const ratio = results.hits / TARGET_COUNT
    if (results.completed && accuracyPct >= 90 && results.headshotRate >= 0.5) return 'S'
    if (ratio >= 0.85 && accuracyPct >= 70) return 'A'
    if (ratio >= 0.65) return 'B'
    if (ratio >= 0.4) return 'C'
    return 'D'
  })()

  return (
    <div className="screen gameover" style={{ '--accent': diff.accent }}>
      <h2 className={`gameover-title ${results.completed ? 'win' : ''}`}>{headline}</h2>

      <div className="score-headline">
        <span className="score-headline-value">{results.score.toLocaleString()}</span>
        <span className="score-headline-label">POINTS</span>
      </div>

      <div className="score-quip" data-tier={quip.tier}>{quip.text}</div>

      <div className="grade" data-grade={grade}>{grade}</div>
      {isRecord && <div className="new-record">★ NEW BEST ★</div>}

      <div className="results-grid">
        <Stat label="Targets Hit" value={`${results.hits}/${TARGET_COUNT}`} />
        <Stat label="Headshots" value={`${results.headshots} (${hsRatePct}%)`} />
        <Stat label="Accuracy" value={`${accuracyPct}%`} />
        <Stat label="Best Combo" value={`×${results.bestCombo}`} />
        <Stat label="Escaped" value={results.escaped} />
        <Stat label="Difficulty" value={diff.label} />
        <Stat
          label="Snitch"
          value={results.snitchHits > 0 ? '⚡ Caught!' : results.snitchSpawned ? 'Missed 😔' : '—'}
        />
        <Stat label="Fastest Hit" value={results.fastestHitMs != null ? `${Math.round(results.fastestHitMs)}ms` : '—'} />
      </div>

      <div className="gameover-actions">
        <button className="btn-primary" style={{ '--accent': diff.accent }} onClick={onPlayAgain}>
          ↻ PLAY AGAIN
        </button>
        <button className="btn-ghost" onClick={onMenu}>
          MENU
        </button>
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="result-stat">
      <span className="result-label">{label}</span>
      <span className="result-value">{value}</span>
    </div>
  )
}
