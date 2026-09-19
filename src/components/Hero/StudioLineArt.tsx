import styles from './Hero.module.css'

// Keep the existing background component boundary; the scene is now sky only.
export default function NightSky() {
  return (
    <div className={styles.atmosphere} aria-hidden="true">
      <div className={styles.stars}>
        <span className={styles.starsFar} />
        <span className={styles.starsMid} />
        <span className={styles.starsNear} />
        <span className={styles.twinkleField}>
          <span style={{ left: '6.5%', top: '20%', animationDelay: '-1.2s', animationDuration: '8.8s' }} />
          <span style={{ left: '14.8%', top: '73%', animationDelay: '-5.1s', animationDuration: '10.4s' }} />
          <span style={{ left: '23.5%', top: '12%', animationDelay: '-3.7s', animationDuration: '9.6s' }} />
          <span style={{ left: '34.2%', top: '86%', animationDelay: '-7.4s', animationDuration: '11.2s' }} />
          <span style={{ left: '61.8%', top: '10%', animationDelay: '-4.6s', animationDuration: '10.8s' }} />
          <span style={{ left: '76.5%', top: '74%', animationDelay: '-2.8s', animationDuration: '9.2s' }} />
          <span style={{ left: '86.8%', top: '31%', animationDelay: '-6.3s', animationDuration: '11.6s' }} />
          <span style={{ left: '93.8%', top: '82%', animationDelay: '-4.1s', animationDuration: '9.9s' }} />
          <span style={{ left: '97.1%', top: '14%', animationDelay: '-8.0s', animationDuration: '12.1s' }} />
        </span>
      </div>
    </div>
  )
}
