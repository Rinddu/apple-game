/** 동굴 테마 스프라이트 — 외부 이미지 없이 인라인 SVG 로 그린다 (오프라인·초기 로딩 대응). */

export function ExplorerSprite() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <ellipse cx="10" cy="21.2" rx="5.6" ry="1.5" fill="rgba(0,0,0,.5)" />

      {/* 망토 */}
      <path
        d="M10 4c3.2 0 5.2 2.6 5.5 5.9l.66 7.7c.1 1.05-.66 1.95-1.72 1.95H5.56c-1.06 0-1.82-.9-1.72-1.95l.66-7.7C4.8 6.6 6.8 4 10 4Z"
        fill="var(--cloak)"
      />
      {/* 후드 — 얼굴을 감싸는 그늘 */}
      <path
        d="M10 4c2.85 0 4.85 2 5.4 4.85-1.6 1.25-3.4 1.9-5.4 1.9s-3.8-.65-5.4-1.9C5.15 6 7.15 4 10 4Z"
        fill="var(--cloak-dark)"
      />
      {/* 얼굴 */}
      <ellipse cx="10" cy="8.5" rx="1.85" ry="2.05" fill="var(--skin)" />
      {/* 망토 앞자락 */}
      <path d="M10 12.4v7" stroke="var(--cloak-dark)" strokeWidth="1" opacity=".5" />

      {/* 들고 있는 랜턴 */}
      <circle cx="19" cy="14.8" r="4.3" fill="var(--lantern)" opacity=".17" />
      <path d="M15.5 13.4h1.6" stroke="var(--cloak)" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M17.7 12.1a1.3 1.3 0 0 1 2.6 0"
        fill="none"
        stroke="#c9a05a"
        strokeWidth=".85"
      />
      <rect x="17.1" y="12.1" width="3.8" height="4.4" rx=".9" fill="var(--lantern)" />
      <rect
        x="17.1"
        y="12.1"
        width="3.8"
        height="4.4"
        rx=".9"
        fill="none"
        stroke="#9c7433"
        strokeWidth=".8"
      />
    </svg>
  )
}

export function CrateSprite() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2.2" y="2.2" width="19.6" height="19.6" rx="2.6" fill="var(--wood)" />
      <path d="M2.2 8.6h19.6M2.2 15.4h19.6" stroke="var(--wood-dark)" strokeWidth="1.3" />
      <path d="M5.5 2.2v19.6M18.5 2.2v19.6" stroke="var(--wood-dark)" strokeWidth="1" opacity=".5" />
      <path
        d="M4.8 4.6h14.4"
        stroke="var(--wood-lit)"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity=".75"
      />
      <rect
        x="2.2"
        y="2.2"
        width="19.6"
        height="19.6"
        rx="2.6"
        fill="none"
        stroke="var(--wood-dark)"
        strokeWidth="2.2"
      />
    </svg>
  )
}

export function AppleSprite() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <ellipse cx="12" cy="21.4" rx="4.6" ry="1.2" fill="rgba(0,0,0,.45)" />

      {/* 열매 — 위가 살짝 갈라진 하트 모양 */}
      <path
        d="M12 7.6c1.5-1.6 4-1.9 5.6-.5 1.9 1.7 2 4.9.5 7.6-1.2 2.2-3.1 4.1-4.6 4.8-.9.4-1.8.4-2.7 0-1.6-.7-3.5-2.6-4.7-4.8-1.5-2.7-1.4-5.9.5-7.6 1.6-1.4 4.1-1.1 5.4.5Z"
        fill="var(--apple)"
      />
      {/* 왼쪽 위에 맺히는 랜턴 반사광 */}
      <path
        d="M9.3 9.2c-1.2.7-2 2-2.2 3.4-.1.7.9.9 1.2.3.4-1 1-1.9 1.9-2.5.6-.4.2-1.5-.9-1.2Z"
        fill="var(--apple-lit)"
        opacity=".85"
      />
      {/* 꼭지와 잎 */}
      <path
        d="M12 7.6V4.2"
        stroke="var(--apple-stem)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M12.4 5.2c1-1.6 2.8-2.2 4.2-1.8.3 1.7-1.1 3.4-3 3.6-.9.1-1.6-1-1.2-1.8Z"
        fill="var(--apple-leaf)"
      />
    </svg>
  )
}

export function RuneSprite() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M12 1.8v3M12 19.2v3M1.8 12h3M19.2 12h3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

interface IconProps {
  size?: number
}

export function ArrowIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 5v14M12 5l-6 6M12 5l6 6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function UndoIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 9h11a5 5 0 1 1 0 10h-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 5 4 9l4 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function RestartIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 12a8 8 0 1 1-2.6-5.9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M20 3.5V9h-5.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function BackIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15 5l-7 7 7 7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function CheckIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 12.5l5.5 5.5L20 6"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function LockIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" stroke="currentColor" strokeWidth="2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

export function HandIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 13V5.5a1.5 1.5 0 1 1 3 0V12m0-1.5a1.5 1.5 0 1 1 3 0V12m0-1a1.5 1.5 0 1 1 3 0v1.5m0-.5a1.5 1.5 0 1 1 3 0V16a5 5 0 0 1-5 5h-1.6a5 5 0 0 1-4-2l-3.1-4.2a1.5 1.5 0 0 1 2.3-1.9L7 14.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function AppleIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 7.6c1.5-1.6 4-1.9 5.6-.5 1.9 1.7 2 4.9.5 7.6-1.2 2.2-3.1 4.1-4.6 4.8-.9.4-1.8.4-2.7 0-1.6-.7-3.5-2.6-4.7-4.8-1.5-2.7-1.4-5.9.5-7.6 1.6-1.4 4.1-1.1 5.4.5Z"
        fill="currentColor"
      />
      <path
        d="M12 7.6V4.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M12.4 5.2c1-1.6 2.8-2.2 4.2-1.8.3 1.7-1.1 3.4-3 3.6-.9.1-1.6-1-1.2-1.8Z"
        fill="currentColor"
        opacity=".75"
      />
    </svg>
  )
}
