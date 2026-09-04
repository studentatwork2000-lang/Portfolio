import styles from './Hero.module.css'

export default function StudioLineArt() {
  return (
    <div className={styles.atmosphere} aria-hidden="true">
      <svg className={styles.constructionLines} viewBox="0 0 1440 1000" preserveAspectRatio="none">
        <g className={styles.gridQuiet}>
          <path d="M287 0V1000M586 0V1000M877 0V1000" />
          <path d="M0 321H1115M0 638H1284M0 850H944" />
        </g>
        <g className={styles.gridSelected}>
          <path d="M1171 0V330M0 484H1440" />
          <path d="M995 294v54M960 294h35" />
        </g>
      </svg>

      <svg className={styles.localGridLight} viewBox="0 0 1440 1000" preserveAspectRatio="none">
        <path d="M287 0V1000M586 0V1000M877 0V1000" />
        <path d="M0 321H1115M0 638H1284M0 850H944" />
        <path d="M1171 0V330M0 484H1440" />
        <path d="M995 294v54M960 294h35" />
      </svg>

      <svg className={`${styles.drawing} ${styles.shelfDrawing}`} viewBox="0 0 420 280">
        <path className={styles.lineNear} d="M42 34h336M42 34v174M54 48h280M54 48v146M18 208h384M18 208v12M52 220v62" />
        <path className={styles.lineMid} d="M112 198l24-92h48l-22 92M184 198V94h49v104M207 94v104" />
        <path className={`${styles.drawingSoft} ${styles.lineFar}`} d="M273 61h75v98h-75zM283 72h55v76h-55z" />
        <path className={styles.lineMid} d="M366 94v92M352 186h28" />
      </svg>

      <svg className={`${styles.drawing} ${styles.deskDrawing}`} viewBox="0 0 540 390">
        <path className={styles.lineMid} d="M252 48h250l-15 198H229zM252 48l-23 198M487 246l-6 43M353 289h130" />
        <path className={styles.lineFar} d="M15 307l326-20 188 9M15 307v27l514 6M56 334v56M478 340v50" />
        <path className={styles.lineMid} d="M350 268h136M322 280l33-12M202 302l53-7" />
        <path className={`${styles.drawingSoft} ${styles.lineFar}`} d="M80 291c6-55 30-92 73-111M153 180l-18 105M153 180l45 29M198 209l-16 72" />
        <path className={styles.lineFar} d="M121 286h112M114 289l-27 48M223 287l31 47" />
      </svg>
    </div>
  )
}
