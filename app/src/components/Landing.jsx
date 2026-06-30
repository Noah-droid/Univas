import { useState, useEffect } from "react";
import "./Landing.css";

function Typewriter({ text, delay = 0, speed = 60, onComplete }) {
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timeout);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    if (displayed.length < text.length) {
      const timeout = setTimeout(() => {
        setDisplayed(text.slice(0, displayed.length + 1));
      }, speed);
      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [displayed, started, text, speed, onComplete]);

  return (
    <span className="typewriter">
      {displayed}
      {started && displayed.length < text.length && (
        <span className="typewriter-cursor">|</span>
      )}
    </span>
  );
}

function Sparkle({ style }) {
  return (
    <span className="sparkle" style={style}>
      ✦
    </span>
  );
}

export default function Landing({ onGetStarted }) {
  const [titleDone, setTitleDone] = useState(false);
  const [subDone, setSubDone] = useState(false);

  return (
    <div className="landing">
      <div className="landing-stars">
        {Array.from({ length: 80 }, (_, i) => (
          <div
            key={i}
            className="landing-star-dot"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${Math.random() * 2.5 + 0.5}px`,
              height: `${Math.random() * 2.5 + 0.5}px`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${Math.random() * 3 + 2}s`,
            }}
          />
        ))}
      </div>

      <nav className="landing-nav">
        <div className="landing-logo">✦ Univas</div>
        <button className="landing-nav-btn" onClick={onGetStarted}>
          Sign In
        </button>
      </nav>

      <section className="hero">
        <div className="hero-glow" />
        <div className="hero-glow hero-glow--alt" />

        <div className="hero-title-wrapper">
          <h1 className="hero-title">
            <Typewriter
              text="Every moment becomes a "
              speed={50}
              onComplete={() => setTitleDone(true)}
            />
            {titleDone && (
              <span className="hero-star-word">
                <Sparkle style={{ animationDelay: "0s", top: "-8px", left: "-12px" }} />
                <Sparkle style={{ animationDelay: "0.5s", top: "4px", right: "-14px" }} />
                <Sparkle style={{ animationDelay: "1s", bottom: "-6px", left: "50%" }} />
                <Typewriter text="star" speed={80} onComplete={() => setSubDone(true)} />
              </span>
            )}
          </h1>
        </div>

        {subDone && (
          <p className="hero-sub hero-sub--reveal">
            A private shared universe for two people. Every activity, memory,
            and challenge you complete together lights up your cosmos.
          </p>
        )}

        {subDone && (
          <button className="hero-cta hero-cta--reveal" onClick={onGetStarted}>
            <span className="cta-sparkle">✦</span>
            Create Your Universe
          </button>
        )}
      </section>

      <section className="features">
        <div className="feature feature--reveal" style={{ animationDelay: "0.1s" }}>
          <span className="feature-icon">🧩</span>
          <h3>Puzzles</h3>
          <p>Upload images, solve them together. Each completed puzzle becomes a star.</p>
        </div>
        <div className="feature feature--reveal" style={{ animationDelay: "0.25s" }}>
          <span className="feature-icon">🎨</span>
          <h3>Drawing</h3>
          <p>Draw together in real-time on a shared canvas. Your art becomes a memory.</p>
        </div>
        <div className="feature feature--reveal" style={{ animationDelay: "0.4s" }}>
          <span className="feature-icon">🏠</span>
          <h3>Your Room</h3>
          <p>Build a shared space together. Paint walls, place objects, make it yours.</p>
        </div>
      </section>

      <section className="constellation-section">
        <div className="constellation-visual">
          {["⭐", "✨", "💫", "🌟", "⭐", "✨", "💫"].map((s, i) => (
            <span
              key={i}
              className="float-star"
              style={{
                left: `${15 + i * 12}%`,
                top: `${20 + Math.sin(i) * 30}%`,
                animationDelay: `${i * 0.4}s`,
                fontSize: `${18 + Math.random() * 16}px`,
              }}
            >
              {s}
            </span>
          ))}
          <svg className="constellation-lines" viewBox="0 0 400 200">
            <line x1="60" y1="60" x2="130" y2="90" />
            <line x1="130" y1="90" x2="200" y2="40" />
            <line x1="200" y1="40" x2="270" y2="100" />
            <line x1="270" y1="100" x2="340" y2="50" />
          </svg>
        </div>
        <h2>Your relationship, mapped across the cosmos</h2>
        <p>
          Over time, your universe grows. Every shared experience leaves a trace.
          Your memories form constellations.
        </p>
      </section>

      <footer className="landing-footer">
        <div className="footer-star">✦</div>
        <p>Univas — a living archive of moments created together</p>
      </footer>
    </div>
  );
}
