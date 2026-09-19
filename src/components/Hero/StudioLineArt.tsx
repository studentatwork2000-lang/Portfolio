import styles from './Hero.module.css'

// Keep the existing background component boundary; the scene is now sky only.
export default function NightSky() {
  return (
    <div className={styles.atmosphere} aria-hidden="true">
      <div className={styles.stars}>
        <span className={styles.starsFar} />
        <span className={styles.starsMid} />
        <span className={styles.starsNear} />
      </div>
    </div>
  )
}
