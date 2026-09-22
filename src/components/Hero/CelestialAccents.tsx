import { useId } from 'react'
import styles from './CelestialAccents.module.css'

/** A quiet illustrated Earth follows the sky while the wordmark stays still. */
export default function CelestialAccents() {
  const id = useId()
  const ref = (name: string) => `url(#${id}-${name})`

  return (
    <div className={styles.accents} aria-hidden="true">
      <div className={styles.earth}>
        <svg viewBox="0 0 200 200" fill="none" focusable="false">
          <defs>
            <clipPath id={`${id}-globe`}>
              <circle cx="100" cy="100" r="82" />
            </clipPath>
            <radialGradient id={`${id}-ocean`} cx=".27" cy=".24" r=".86">
              <stop stopColor="#456579" />
              <stop offset=".35" stopColor="#243e50" />
              <stop offset=".7" stopColor="#101f2c" />
              <stop offset="1" stopColor="#050a10" />
            </radialGradient>
            <linearGradient id={`${id}-land`} x1="35" y1="37" x2="157" y2="146" gradientUnits="userSpaceOnUse">
              <stop stopColor="#81908b" />
              <stop offset=".42" stopColor="#566e6d" />
              <stop offset="1" stopColor="#243b40" />
            </linearGradient>
            <radialGradient id={`${id}-night`} cx=".15" cy=".18" r=".94">
              <stop offset=".18" stopColor="#020509" stopOpacity="0" />
              <stop offset=".47" stopColor="#020509" stopOpacity=".16" />
              <stop offset=".68" stopColor="#020509" stopOpacity=".82" />
              <stop offset=".85" stopColor="#020509" stopOpacity=".96" />
              <stop offset="1" stopColor="#020509" />
            </radialGradient>
            <linearGradient id={`${id}-rim`} x1="39" y1="33" x2="145" y2="169" gradientUnits="userSpaceOnUse">
              <stop stopColor="#b4ccda" stopOpacity=".76" />
              <stop offset=".37" stopColor="#7aa0b9" stopOpacity=".4" />
              <stop offset=".76" stopColor="#477086" stopOpacity=".03" />
              <stop offset="1" stopColor="#477086" stopOpacity="0" />
            </linearGradient>
            <filter id={`${id}-atmosphere`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.1" />
            </filter>
          </defs>

          <circle cx="100" cy="100" r="83" stroke={ref('rim')} strokeWidth="2.4" filter={ref('atmosphere')} />
          <g clipPath={ref('globe')}>
            <circle cx="100" cy="100" r="82" fill={ref('ocean')} />
            <g fill={ref('land')} opacity=".55">
              {/* A curved Atlantic-facing projection, drawn directly for this scene. */}
              <path d="M31 49 37 40 46 33 53 31 56 35 53 40 46 43 49 47 45 52 49 58 44 66 40 71 36 70 34 79 29 85 27 92 22 85 20 73Z" />
              <path d="m24 103 7-3 10 3 6 6 7 1 4 6-2 9-5 5-3 12-6 9-3 12-5-3-1-10-5-6-3-12-5-9-3-9Z" />
              <path d="m59 27 9-5 13-3 10 1 5 4-7 5-2 6-9 5-7-2-6-7Z" />
              <path d="m94 53 6-8 1-8 6-6 6 1-1 8-5 6-2 8-6 3Z" />
              <path d="m88 64 5-5 7 2 7-3 1-6 7-4 8 3 7-5 10 2 10 5 8 9 9 4 11 10 4 10-7 8-13-4-8 4-8-7-6 1-4-7-9 1-3-6-9 2-4-6-7 2-3-5-6 1-2-5-6 2Z" />
              <path d="m85 79 7-5 8 2 7-1 7 5 2 6 10 5 2 7-7 9-3 12-8 7-4 12-7 5-6-7-2-10-6-8-2-11-7-5-1-10 4-8Z" />
              <path d="m118 122 2 4-2 10-3 5-2-4 3-7Z" />
              <path d="m141 99 6 4 4 8 7 1 3 7-4 4-6-3-3-9-5-2Z" />
              <path d="m159 137 9-4 9 3 6 8-4 9-11 5-8-4-5-7Z" />
              <path d="m53 169 16-3 15 5 15-1 12 4 14-3 14 2 10-2 8 5-22 8-46 4-24-8Z" />
              <path d="m89 56 2-4 2 1 1 6-3 3-2-2ZM83 60l3-1 2 4-3 3-3-2Z" />
            </g>
            <g stroke="#ccdadf" strokeLinecap="round" opacity=".13">
              <path d="M35 57c9-9 20-11 28-7s12 4 16 1" strokeWidth="2.7" />
              <path d="M28 66c11-9 19-8 28-4m-4-17c7-3 13-3 19-1" strokeWidth="1.1" />
              <path d="M44 88c13-4 19-1 28 5s16 6 24 4" strokeWidth="2.1" />
              <path d="M48 94c10-2 17 2 24 6s12 4 17 3" strokeWidth=".8" />
              <path d="M84 39c12-4 19-3 28 0m10 5c9 1 15 4 21 9" strokeWidth="1.7" />
              <path d="M61 143c14 6 25 4 37 0s21-4 31 0" strokeWidth="2.7" />
              <path d="M71 151c13 3 21 1 30-2m-11-27c8-1 15-4 21-9" strokeWidth="1.1" />
              <path d="M123 74c12-4 21-1 28 5" strokeWidth="2" />
            </g>
            <circle cx="100" cy="100" r="82" fill={ref('night')} />
          </g>
          <circle cx="100" cy="100" r="81.9" stroke={ref('rim')} strokeWidth=".85" />
          <path d="M24 68A82 82 0 0 1 97 18" stroke="#d5e2e9" strokeOpacity=".27" strokeWidth=".7" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  )
}
