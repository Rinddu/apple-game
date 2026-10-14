import { useCallback, useState } from 'react'
import type { GameState } from './game/types'
import { getLevel, TOTAL_LEVELS } from './game/levels'
import { useProgress } from './hooks/useProgress'
import { useAppleBank } from './hooks/useAppleBank'
import { TitleScreen } from './components/TitleScreen'
import { LevelSelect } from './components/LevelSelect'
import { GameScreen } from './components/GameScreen'
import { TutorialOverlay } from './components/Overlays'

type Screen =
  | { name: 'title' }
  | { name: 'select' }
  | { name: 'game'; levelId: number; restore: GameState | null }

export default function App() {
  const { progress, saveCurrent, recordClear, setDpadSide, markTutorialSeen } = useProgress()
  const { apples, addApples } = useAppleBank()
  const [screen, setScreen] = useState<Screen>({ name: 'title' })
  const [tutorialOpen, setTutorialOpen] = useState(false)

  const startLevel = useCallback(
    (levelId: number, restore: GameState | null) => {
      setScreen({ name: 'game', levelId, restore })
      if (!progress.seenTutorial) {
        setTutorialOpen(true)
        markTutorialSeen()
      }
    },
    [progress.seenTutorial, markTutorialSeen],
  )

  const handleContinue = useCallback(() => {
    const saved = progress.current
    if (saved && getLevel(saved.levelId)) {
      startLevel(saved.levelId, saved)
      return
    }
    startLevel(progress.maxUnlocked, null)
  }, [progress.current, progress.maxUnlocked, startLevel])

  const handlePick = useCallback(
    (levelId: number) => {
      const saved = progress.current
      startLevel(levelId, saved && saved.levelId === levelId ? saved : null)
    },
    [progress.current, startLevel],
  )

  const handleNextLevel = useCallback(() => {
    if (screen.name !== 'game') return
    const next = screen.levelId + 1
    if (next > TOTAL_LEVELS || !getLevel(next)) {
      setScreen({ name: 'select' })
      return
    }
    setScreen({ name: 'game', levelId: next, restore: null })
  }, [screen])

  const toggleDpadSide = useCallback(() => {
    setDpadSide(progress.dpadSide === 'right' ? 'left' : 'right')
  }, [progress.dpadSide, setDpadSide])

  const level = screen.name === 'game' ? getLevel(screen.levelId) : null

  return (
    <div className="app">
      {screen.name === 'title' && (
        <TitleScreen
          key="title"
          progress={progress}
          onContinue={handleContinue}
          onSelect={() => setScreen({ name: 'select' })}
          onTutorial={() => {
            setTutorialOpen(true)
            markTutorialSeen()
          }}
        />
      )}

      {screen.name === 'select' && (
        <LevelSelect
          key="select"
          progress={progress}
          onPick={handlePick}
          onBack={() => setScreen({ name: 'title' })}
        />
      )}

      {screen.name === 'game' &&
        (level ? (
          <GameScreen
            key={`game-${screen.levelId}`}
            level={level}
            restore={screen.restore}
            best={progress.best[String(screen.levelId)]}
            apples={apples}
            onAppleDelta={addApples}
            dpadSide={progress.dpadSide}
            onSaveCurrent={saveCurrent}
            onRecordClear={recordClear}
            onToggleDpadSide={toggleDpadSide}
            onExit={() => setScreen({ name: 'select' })}
            onNextLevel={handleNextLevel}
          />
        ) : (
          <TitleScreen
            key="title-fallback"
            progress={progress}
            onContinue={handleContinue}
            onSelect={() => setScreen({ name: 'select' })}
            onTutorial={() => setTutorialOpen(true)}
          />
        ))}

      {tutorialOpen && <TutorialOverlay onClose={() => setTutorialOpen(false)} />}
    </div>
  )
}
