import type { Progress } from '../game/storage'
import { TOTAL_LEVELS } from '../game/levels'

interface TitleScreenProps {
  progress: Progress
  onContinue: () => void
  onSelect: () => void
  onTutorial: () => void
}

export function TitleScreen({ progress, onContinue, onSelect, onTutorial }: TitleScreenProps) {
  const resumeLevel = progress.current?.levelId ?? progress.maxUnlocked
  const hasSaved = progress.current !== null
  const clearedCount = Object.keys(progress.best).length

  return (
    <div className="screen">
      <div className="title">
        <div>
          <svg className="title__mark" viewBox="0 0 64 64" aria-hidden="true">
            <rect x="10" y="10" width="44" height="44" rx="8" fill="#241e19" />
            <rect x="17" y="17" width="30" height="30" rx="4" fill="var(--wood)" />
            <path d="M17 27h30M17 37h30" stroke="var(--wood-dark)" strokeWidth="2.4" />
            <rect
              x="17"
              y="17"
              width="30"
              height="30"
              rx="4"
              fill="none"
              stroke="var(--wood-dark)"
              strokeWidth="3"
            />
            <circle cx="32" cy="32" r="5" fill="var(--amber)" opacity=".9" />
          </svg>
          <h1 className="title__name">동굴 소코반</h1>
          <p className="title__tagline">
            10단계 논리 퍼즐 · 오프라인 플레이
            {clearedCount > 0 && ` · ${clearedCount}/${TOTAL_LEVELS} 완료`}
          </p>
        </div>

        <div className="title__actions">
          <button type="button" className="btn btn--primary" onClick={onContinue}>
            {hasSaved ? `이어하기 (${resumeLevel}단계)` : clearedCount > 0 ? `${resumeLevel}단계 시작` : '게임 시작'}
          </button>
          <button type="button" className="btn" onClick={onSelect}>
            단계 선택
          </button>
          <button type="button" className="btn btn--ghost" onClick={onTutorial}>
            방법 보기
          </button>
        </div>

        <p className="title__foot">기록은 이 기기에만 저장됩니다</p>
      </div>
    </div>
  )
}
