import { useMemo } from 'react'
import type { CSSProperties, ReactNode, RefObject } from 'react'
import type { Direction, GameState, ParsedLevel } from '../game/types'
import { DIRECTION_VECTORS } from '../game/types'
import { isGoal } from '../game/engine'
import { AppleSprite, CrateSprite, ExplorerSprite, RuneSprite } from './sprites'

interface BoardProps {
  level: ParsedLevel
  game: GameState
  facing: Direction
  /** 벽에 막힐 때마다 증가 — key 로 써서 흔들림 애니메이션을 재시작시킨다 */
  bumpNonce: number
  bumpActive: boolean
  settleNonce: number
  settleActive: boolean
  settleBoxId: number | null
  areaRef: RefObject<HTMLDivElement | null>
  /** 보드 바로 아래에 붙는 요소 — 스와이프 영역 안에 함께 둔다 */
  children?: ReactNode
}

/** 셀마다 고정된 질감 변주 — 같은 맵은 항상 같은 모양으로 보인다. */
function variantOf(x: number, y: number): number {
  return (x * 7 + y * 13 + x * y * 3) % 4
}

export function Board({
  level,
  game,
  facing,
  bumpNonce,
  bumpActive,
  settleNonce,
  settleActive,
  settleBoxId,
  areaRef,
  children,
}: BoardProps) {
  // 벽·바닥·룬은 단계가 바뀌지 않는 한 다시 만들지 않는다.
  const cells = useMemo(() => {
    const out = []
    for (let y = 0; y < level.height; y++) {
      for (let x = 0; x < level.width; x++) {
        const wall = level.walls[y * level.width + x] === true
        const goal = level.goals[y * level.width + x] === true
        out.push(
          <div
            key={`${x},${y}`}
            className={wall ? 'cell cell--wall' : 'cell cell--floor'}
            data-v={variantOf(x, y)}
          >
            {goal && (
              <span className="rune">
                <RuneSprite />
              </span>
            )}
          </div>,
        )
      }
    }
    return out
  }, [level])

  const face = DIRECTION_VECTORS[facing]
  const placed = game.boxes.filter((box) => isGoal(level, box.x, box.y)).length

  return (
    <div className="board-area" ref={areaRef}>
      <div
        className="board"
        style={{ '--cols': level.width, '--rows': level.height } as CSSProperties}
        role="img"
        aria-label={`${level.data.name}. 상자 ${placed}/${game.boxes.length}개 배치됨, ${game.moveCount}수 이동, 사과 ${game.appleCount}개 수집${
          game.apples.length > 0 ? `, 바닥에 사과 ${game.apples.length}개` : ''
        }`}
      >
        <div className="board__grid">{cells}</div>

        <div className="entities">
          {/* 사과는 상자·플레이어보다 먼저 그려서 아래에 깔린다 */}
          {game.apples.map((apple) => (
            <div
              key={apple.id}
              className="entity apple"
              style={{ '--x': apple.x, '--y': apple.y } as CSSProperties}
            >
              <span className="apple__glow" />
              <span className="apple__inner">
                <AppleSprite />
              </span>
            </div>
          ))}

          {game.boxes.map((box) => {
            const onGoal = isGoal(level, box.x, box.y)
            const settled = settleActive && settleBoxId === box.id
            return (
              <div
                key={box.id}
                className={`entity crate${onGoal ? ' crate--on-goal' : ''}${
                  settled ? ' crate--settled' : ''
                }`}
                style={{ '--x': box.x, '--y': box.y } as CSSProperties}
              >
                <span className="crate__glow" />
                <span className="crate__inner" key={settleNonce}>
                  <CrateSprite />
                </span>
              </div>
            )
          })}

          <div
            className={`entity player${bumpActive ? ' player--bump' : ''}`}
            style={
              {
                '--x': game.player.x,
                '--y': game.player.y,
                '--fx': face.x,
                '--fy': face.y,
              } as CSSProperties
            }
          >
            <span className="player__light" />
            <span className="player__inner" key={bumpNonce}>
              <ExplorerSprite />
            </span>
          </div>
        </div>
      </div>
      {children}
    </div>
  )
}
