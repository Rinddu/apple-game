import type { ReactNode } from 'react'
import { CrateSprite, ExplorerSprite, RuneSprite } from './sprites'
import { TOTAL_LEVELS } from '../game/levels'

interface SheetProps {
  labelledBy: string
  children: ReactNode
}

function Sheet({ labelledBy, children }: SheetProps) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
      <div className="sheet">{children}</div>
    </div>
  )
}

interface ClearOverlayProps {
  levelId: number
  levelName: string
  moves: number
  minMoves: number
  best: number | undefined
  isNewRecord: boolean
  onNext: () => void
  onRetry: () => void
  onList: () => void
}

/** PRD §4.8 클리어 화면 */
export function ClearOverlay({
  levelId,
  levelName,
  moves,
  minMoves,
  best,
  isNewRecord,
  onNext,
  onRetry,
  onList,
}: ClearOverlayProps) {
  const isFinale = levelId >= TOTAL_LEVELS

  return (
    <Sheet labelledBy="clear-title">
      <div>
        <h2 className="sheet__title" id="clear-title">
          {isFinale ? '동굴을 빠져나왔다' : '단계 완료'}
        </h2>
        <p className="sheet__text">
          {isFinale ? `${TOTAL_LEVELS}단계를 모두 마쳤습니다.` : `${levelId}단계 · ${levelName}`}
        </p>
        {isNewRecord && <span className="badge-new">최고 기록 갱신</span>}
      </div>

      <div className="sheet__stats">
        <div>
          <div className="stat__value">{moves}</div>
          <div className="stat__label">이동 수</div>
        </div>
        <div>
          <div className="stat__value">{best ?? moves}</div>
          <div className="stat__label">최고 기록</div>
        </div>
        <div>
          <div className="stat__value">{minMoves}</div>
          <div className="stat__label">최소 수</div>
        </div>
      </div>

      <div className="sheet__actions">
        {!isFinale && (
          <button type="button" className="btn btn--primary" onClick={onNext} autoFocus>
            다음 단계
          </button>
        )}
        <div className="sheet__row">
          <button type="button" className="btn btn--ghost" onClick={onRetry}>
            다시 하기
          </button>
          <button
            type="button"
            className={isFinale ? 'btn btn--primary' : 'btn btn--ghost'}
            onClick={onList}
          >
            단계 목록
          </button>
        </div>
      </div>
    </Sheet>
  )
}

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

/** PRD §4.3 — 재시작 시 확인 다이얼로그 1회 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Sheet labelledBy="confirm-title">
      <div>
        <h2 className="sheet__title" id="confirm-title">
          {title}
        </h2>
        <p className="sheet__text">{message}</p>
      </div>
      <div className="sheet__row">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          취소
        </button>
        <button type="button" className="btn btn--primary" onClick={onConfirm} autoFocus>
          {confirmLabel}
        </button>
      </div>
    </Sheet>
  )
}

/** PRD §6 — 방법 보기 */
export function TutorialOverlay({ onClose }: { onClose: () => void }) {
  return (
    <Sheet labelledBy="tutorial-title">
      <h2 className="sheet__title" id="tutorial-title">
        게임 방법
      </h2>

      <div className="tutorial__legend">
        <div className="legend-item">
          <span className="legend-item__art">
            <ExplorerSprite />
          </span>
          탐험가
        </div>
        <div className="legend-item">
          <span className="legend-item__art">
            <CrateSprite />
          </span>
          궤짝
        </div>
        <div className="legend-item">
          <span className="legend-item__art" style={{ color: 'var(--amber)' }}>
            <RuneSprite />
          </span>
          목표 룬
        </div>
      </div>

      <div className="tutorial">
        <ol>
          <li>
            <strong>스와이프</strong>하거나 화면 아래 <strong>방향 버튼</strong>으로 한 칸씩
            움직입니다. 데스크톱에서는 방향키와 WASD를 씁니다.
          </li>
          <li>
            궤짝은 <strong>밀 수만</strong> 있습니다. 당길 수 없고, 한 번에 하나만 밀립니다.
          </li>
          <li>
            모든 궤짝을 <strong>빛나는 룬</strong> 위에 올리면 단계가 끝납니다.
          </li>
          <li>
            궤짝이 구석에 박히면 되돌릴 수 없습니다. <strong>되돌리기</strong>는 횟수 제한 없이
            쓸 수 있습니다.
          </li>
        </ol>
      </div>

      <button type="button" className="btn btn--primary" onClick={onClose} autoFocus>
        알겠어요
      </button>
    </Sheet>
  )
}
