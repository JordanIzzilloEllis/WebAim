import { useCallback, useEffect, useState } from 'react'
import Menu from './components/Menu.jsx'
import Game3D from './components/Game3D.jsx'
import GameOver from './components/GameOver.jsx'
import Settings from './components/Settings.jsx'
import {
  DEFAULT_DIFFICULTY,
  DEFAULT_SENS_MULT,
  DEFAULT_SENS_MODE,
  SENS_MODE_BASIC,
  SENS_MODE_CS2,
  effectiveSensRadPerPixel,
} from './config.js'
import { sound } from './sound.js'
import './App.css'

const HIGH_SCORE_KEY = 'webaim.highscores.v2'
const SETTINGS_KEY = 'aimlite.settings.v1'

const DEFAULT_SETTINGS = {
  sensMult: DEFAULT_SENS_MULT,
  cs2Sens: null,
  cs2Dpi: null,
  sensMode: DEFAULT_SENS_MODE,
}

function loadHighScores() {
  try {
    return JSON.parse(localStorage.getItem(HIGH_SCORE_KEY)) || {}
  } catch {
    return {}
  }
}

function loadSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY))
    return {
      sensMult: Number.isFinite(raw?.sensMult) ? raw.sensMult : DEFAULT_SETTINGS.sensMult,
      cs2Sens: Number.isFinite(raw?.cs2Sens) ? raw.cs2Sens : null,
      cs2Dpi: Number.isFinite(raw?.cs2Dpi) ? raw.cs2Dpi : null,
      sensMode: raw?.sensMode === SENS_MODE_CS2 ? SENS_MODE_CS2 : SENS_MODE_BASIC,
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export default function App() {
  const [screen, setScreen] = useState('menu')
  // Where to return when leaving Settings — it can be opened from the menu
  // or the results screen, and Back should land back on whichever it was.
  const [settingsReturnTo, setSettingsReturnTo] = useState('menu')
  const [difficulty, setDifficulty] = useState(DEFAULT_DIFFICULTY)
  const [settings, setSettings] = useState(loadSettings)
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

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch {
      /* ignore storage errors */
    }
  }, [settings])

  const updateSettings = useCallback((partial) => {
    setSettings((s) => ({ ...s, ...partial }))
  }, [])

  const resetSettings = useCallback(() => {
    setSettings({ ...DEFAULT_SETTINGS })
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
  const openSettings = useCallback(() => {
    setSettingsReturnTo(screen)
    setScreen('settings')
  }, [screen])
  const closeSettings = useCallback(() => setScreen(settingsReturnTo), [settingsReturnTo])
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
        <Menu onStart={startGame} highScores={highScores} onOpenSettings={openSettings} />
      )}

      {screen === 'playing' && (
        <Game3D
          key={`${difficulty}-${restartSeq}`}
          difficulty={difficulty}
          sensRadPerPixel={effectiveSensRadPerPixel(settings)}
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
          onOpenSettings={openSettings}
        />
      )}

      {screen === 'settings' && (
        <Settings settings={settings} onChange={updateSettings} onReset={resetSettings} onBack={closeSettings} />
      )}
    </div>
  )
}
