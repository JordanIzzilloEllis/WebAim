import { DIFFICULTIES, TARGET_COUNT, computeMaxScore } from '../config.js'

const MAX_SCORE = computeMaxScore()

// Letter grade and flavour text used to be graded independently (grade off
// hit ratio/accuracy/headshot rate, quip off score-vs-perfect-run) — they
// could disagree, e.g. an A-grade run landing next to a lukewarm quip. Both
// are now derived from the same score-percentage tier so they can never
// contradict each other. Colours climb a familiar game-rarity ladder (light
// blue -> blue -> purple -> pink -> red -> gold); grade letters double up at
// the top (insane/damn both read "S") since there are only five
// conventional letters to the ladder's six colours — the CSS still tells
// them apart (data-tier, not data-grade) so S still grows/glows further at
// "damn" than at "insane".
const SCORE_TIERS = [
  { min: 1, tier: 'damn', grade: 'S', text: 'DAMN! Was that a Grayson technology?' },
  { min: 0.8, tier: 'insane', grade: 'S', text: 'Insane!' },
  { min: 0.6, tier: 'great', grade: 'A', text: 'Great!' },
  { min: 0.4, tier: 'good', grade: 'B', text: 'Good.' },
  { min: 0.2, tier: 'ok', grade: 'C', text: 'Ok.' },
  { min: 0, tier: 'run-it-back', grade: 'D', text: 'Run it back.' },
]

function scoreResultFor(score) {
  const pct = MAX_SCORE > 0 ? score / MAX_SCORE : 0
  return SCORE_TIERS.find((t) => pct >= t.min) ?? SCORE_TIERS[SCORE_TIERS.length - 1]
}

export default function GameOver({ results, highScore, onPlayAgain, onMenu, onOpenSettings }) {
  const diff = DIFFICULTIES[results.difficulty]
  const accuracyPct = Math.round(results.accuracy * 100)
  const hsRatePct = Math.round(results.headshotRate * 100)
  const isRecord = highScore && highScore.score === results.score
  const scoreResult = scoreResultFor(results.score)

  const headline = results.completed ? 'ROUND CLEARED' : "TIME'S UP"

  return (
    <div className="screen gameover" style={{ '--accent': diff.accent }}>
      <h2 className={`gameover-title ${results.completed ? 'win' : ''}`}>{headline}</h2>

      <div className="score-headline">
        <span className="score-headline-value">{results.score.toLocaleString()}</span>
        <span className="score-headline-label">POINTS</span>
      </div>

      <div className="score-quip" data-tier={scoreResult.tier}>{scoreResult.text}</div>

      <div className="grade" data-tier={scoreResult.tier}>{scoreResult.grade}</div>
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
        <Stat label="Avg Time to Hit" value={results.avgHitMs != null ? `${Math.round(results.avgHitMs)}ms` : '—'} />
      </div>

      <div className="gameover-actions">
        <button className="btn-primary" style={{ '--accent': diff.accent }} onClick={onPlayAgain}>
          ↻ PLAY AGAIN
        </button>
        <button className="btn-ghost" onClick={onMenu}>
          MENU
        </button>
        <button className="btn-ghost" onClick={onOpenSettings}>
          ⚙ Settings
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
