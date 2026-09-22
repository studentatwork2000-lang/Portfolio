import styles from './Hero.module.css'

// Deterministic round stars give an immediate sky without requiring WebGL.
// Cover viewBoxes preserve circular profiles at every viewport aspect ratio.
const layers = [340, 150, 32].map((count, layer) => {
  let seed = 7143 + layer * 191
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
  return Array.from({ length: count }, (_, index) => {
    const x = random() * 1600
    const y = random() * 1000
    const quiet = Math.exp(-(((x - 800) / 310) ** 2 + ((y - 430) / 160) ** 2))
    return {
      id: index, x, y,
      radius: [.45, .7, 1.15][layer] + random() * [.45, .65, .5][layer],
      opacity: (.25 + random() * .5) * (1 - quiet * .65),
    }
  })
})

export default function CssSkyFallback({ embedded = false }: { embedded?: boolean }) {
  return (
    <div className={embedded ? styles.skyFallback : styles.atmosphere} aria-hidden="true">
      <div className={styles.stars}>
        {layers.map((stars, index) => (
          <svg
            key={index}
            className={[styles.starsFar, styles.starsMid, styles.starsNear][index]}
            viewBox="0 0 1600 1000"
            preserveAspectRatio="xMidYMid slice"
            focusable="false"
          >
            {stars.map((star) => (
              <circle key={star.id} cx={star.x} cy={star.y} r={star.radius} opacity={star.opacity} />
            ))}
          </svg>
        ))}
      </div>
    </div>
  )
}
