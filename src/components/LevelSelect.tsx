import type { Progress } from '../game/storage'
import { LEVELS } from '../game/levels'
import { BackIcon, CheckIcon, LockIcon } from './sprites'

interface LevelSelectProps {
  progress: Progress
  onPick: (levelId: number) => void
  onBack: () => void
}

/** PRD §4.1 — 잠김 / 열림 / 클리어를 한눈에 보여준다. */
export function LevelSelect({ progress, onPick, onBack }: LevelSelectProps) {
  return (
    <div className="screen">
      <header className="page-head">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="시작 화면으로">
          <BackIcon />
        </button>
        <h1 className="page-head__title">단계 선택</h1>
      </header>

      <div className="levels">
        {LEVELS.map((level) => {
          const best = progress.best[String(level.id)]
          const cleared = best !== undefined
          const locked = level.id > progress.maxUnlocked
          const status = locked ? '잠김' : cleared ? `완료, 최고 ${best}수` : '도전 가능'

          return (
            <button
              key={level.id}
              type="button"
              className={`level-card${cleared ? ' level-card--cleared' : ''}${
                locked ? ' level-card--locked' : ''
              }`}
              disabled={locked}
              onClick={() => onPick(level.id)}
              aria-label={`${level.id}단계 ${level.name}, ${status}`}
            >
              {cleared && (
                <span className="level-card__badge" aria-hidden="true">
                  <CheckIcon />
                </span>
              )}
              {locked ? (
                <>
                  <LockIcon />
                  <span className="level-card__meta">{level.id}단계</span>
                </>
              ) : (
                <>
                  <span className="level-card__no">{level.id}</span>
                  <span className="level-card__meta">
                    {cleared ? `${best}수` : `최소 ${level.minMoves}수`}
                  </span>
                </>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
