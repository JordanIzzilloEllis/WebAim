import { useCallback, useEffect, useState } from 'react'
import Menu from './components/Menu.jsx'
import Game3D from './components/Game3D.jsx'
import GameOver from './components/GameOver.jsx'
import { DEFAULT_DIFFICULTY, DEFAULT_SENS_MULT } from './config.js'
import { sound } from './sound.js'
import './App.css'

const HIGH_SCORE_KEY = 'webaim.highscores.v2'
const SENS_KEY = 'webaim.sens'

function loadHighScores() {
  try {
    return JSON.parse(localStorage.getItem(HIGH_SCORE_KEY)) || {}
  } catch {
    return {}
  }
}

function loadSens() {
  const v = parseFloat(localStorage.getItem(SENS_KEY))
  return Number.isFinite(v) ? v : DEFAULT_SENS_MULT
}

export default function App() {
  const [screen, setScreen] = useState('menu')
  const [difficulty, setDifficulty] = useState(DEFAULT_DIFFICULTY)
  const [sensMult, setSensMult] = useState(loadSens)
  const [muted, setMuted] = useState(false)
  const [results, setResults] = useState(null)
  const [highScores, setHighScores] = useState(loadHighScores)
  // Bumped to force Game3D to remount (fresh state) for a quick restart —
  // the screen stays 'playing' throughout, so a plain re-render wouldn't
  // reset its internal ref-based game state the way leaving/re-entering
  // 'playing' naturally does for the menu's Play Again flow.
  const [restartSeq, setRestartSeq] = useState(0)

  useEffect(() => {
    sound.setEnabled(!muted)
  }, [muted])

  const changeSens = useCallback((v) => {
    setSensMult(v)
    try {
      localStorage.setItem(SENS_KEY, String(v))
    } catch {
      /* ignore */
    }
  }, [])

  const startGame = useCallback((diffKey) => {
    sound.init()
    sound.start()
    setDifficulty(diffKey)
    setResults(null)
    setScreen('playing')
  }, [])

  const endGame = useCallback((finalResults) => {
    sound.gameOver(finalResults.completed)
    setResults(finalResults)
    setScreen('over')

    setHighScores((prev) => {
      const best = prev[finalResults.difficulty]
      if (best && best.score >= finalResults.score) return prev
      const next = { ...prev, [finalResults.difficulty]: finalResults }
      try {
        localStorage.setItem(HIGH_SCORE_KEY, JSON.stringify(next))
      } catch {
        /* ignore storage errors */
      }
      return next
    })
  }, [])

  const goToMenu = useCallback(() => setScreen('menu'), [])
  const playAgain = useCallback(() => startGame(difficulty), [difficulty, startGame])
  const toggleMute = useCallback(() => setMuted((m) => !m), [])

  // Spacebar mid-round: wipe the current round's stats and start it over
  // immediately, same difficulty, no trip through the menu or results screen.
  const quickRestart = useCallback(() => {
    sound.init()
    sound.start()
    setResults(null)
    setRestartSeq((n) => n + 1)
  }, [])

  return (
    <div className="app">
      <button
        className="mute-btn"
        onClick={toggleMute}
        aria-label={muted ? 'Unmute' : 'Mute'}
        title={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? '🔇' : '🔊'}
      </button>

      {screen === 'menu' && (
        <Menu
          onStart={startGame}
          highScores={highScores}
          sensMult={sensMult}
          onSensChange={changeSens}
        />
      )}

      {screen === 'playing' && (
        <Game3D
          key={`${difficulty}-${restartSeq}`}
          difficulty={difficulty}
          sensMult={sensMult}
          onEnd={endGame}
          onQuit={goToMenu}
          onRestart={quickRestart}
        />
      )}

      {screen === 'over' && results && (
        <GameOver
          results={results}
          highScore={highScores[results.difficulty]}
          onPlayAgain={playAgain}
          onMenu={goToMenu}
        />
      )}
    </div>
  )
}
