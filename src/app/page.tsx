import Link from "next/link";
import styles from "./page.module.scss";

export default function Home() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <div className={styles.soundBars}>
            <span />
            <span />
            <span />
            <span />
          </div>
          Soundcheck
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.hero}>
          <h1>Soundcheck</h1>
          <p>The AI-powered music pop quiz</p>
        </div>

        <div className={styles.card}>
          <div className={styles.features}>
            <div className={styles.feature}>
              <div className={styles.icon}>🎵</div>
              <h3>Listen</h3>
              <p>Hear 5-second snippets of songs from themed rounds</p>
            </div>
            <div className={styles.feature}>
              <div className={styles.icon}>🎤</div>
              <h3>Guess</h3>
              <p>Tell the AI host the song title or artist name</p>
            </div>
            <div className={styles.feature}>
              <div className={styles.icon}>🏆</div>
              <h3>Score</h3>
              <p>Race through 10 songs and see how many you know</p>
            </div>
          </div>

          <div className={styles.cta}>
            <Link href="/play" className={styles.playButton}>
              Start playing
              <span>→</span>
            </Link>
          </div>
        </div>

        <footer className={styles.footer}>
          <p>
            Powered by <a href="https://elevenlabs.io">ElevenLabs</a> and{" "}
            <a href="https://spotify.com">Spotify</a>
          </p>
        </footer>
      </main>
    </div>
  );
}
