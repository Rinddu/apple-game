import type { MouseEvent, PointerEvent, ReactNode } from 'react'
import type { Direction } from '../game/types'
import type { DpadSide } from '../game/storage'
import { ArrowIcon, HandIcon, RestartIcon, UndoIcon } from './sprites'

interface ControlsProps {
  side: DpadSide
  canUndo: boolean
  onMove: (dir: Direction) => void
  onUndo: () => void
  onRestart: () => void
  onToggleSide: () => void
}

const ROTATION: Record<Direction, number> = { up: 0, right: 90, down: 180, left: 270 }
const LABEL: Record<Direction, string> = { up: '위로', right: '오른쪽으로', down: '아래로', left: '왼쪽으로' }

interface PressButtonProps {
  className: string
  label: string
  disabled?: boolean
  onPress: () => void
  children: ReactNode
}

/**
 * 포인터는 pointerdown 에서 바로 반응시켜 입력 지연을 줄인다(PRD §5).
 * 키보드·보조기기가 만들어내는 click(detail === 0)만 별도로 받아 접근성을 유지한다.
 */
function PressButton({ className, label, disabled, onPress, children }: PressButtonProps) {
  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (disabled || event.button !== 0) return
    onPress()
  }
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (disabled || event.detail !== 0) return
    onPress()
  }
  return (
    <button
      type="button"
      className={className}
      disabled={disabled}
      aria-label={label}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
    >
      {children}
    </button>
  )
}

export function Controls({
  side,
  canUndo,
  onMove,
  onUndo,
  onRestart,
  onToggleSide,
}: ControlsProps) {
  return (
    <div className="controls" data-side={side}>
      <div className="dpad" role="group" aria-label="방향 조작">
        {(['up', 'left', 'right', 'down'] as const).map((dir) => (
          <PressButton
            key={dir}
            className={`dpad__btn dpad__btn--${dir}`}
            label={LABEL[dir]}
            onPress={() => onMove(dir)}
          >
            <span style={{ display: 'grid', transform: `rotate(${ROTATION[dir]}deg)` }}>
              <ArrowIcon />
            </span>
          </PressButton>
        ))}
        {/* 원판 가운데의 새김 — 장식이 아니라 엄지가 돌아올 기준점 */}
        <span className="dpad__hub" aria-hidden="true" />
      </div>

      {/* 가장 자주 누르는 되돌리기를 가장 크게 둔다 */}
      <div className="actions">
        <PressButton
          className="action action--undo"
          label="한 수 되돌리기"
          disabled={!canUndo}
          onPress={onUndo}
        >
          <UndoIcon size={22} />
          되돌리기
        </PressButton>
        <div className="actions__row">
          <PressButton className="action" label="단계 다시 시작" onPress={onRestart}>
            <RestartIcon />
            다시하기
          </PressButton>
          <PressButton
            className="action"
            label={`조작부를 ${side === 'right' ? '왼쪽' : '오른쪽'}으로 옮기기`}
            onPress={onToggleSide}
          >
            <HandIcon />
            {side === 'right' ? '오른손' : '왼손'}
          </PressButton>
        </div>
      </div>
    </div>
  )
}
