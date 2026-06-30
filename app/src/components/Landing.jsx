import "./Landing.css";

export default function Landing({ onGetStarted }) {
  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="landing-logo">Univas</div>
        <button className="landing-nav-btn" onClick={onGetStarted}>
          Sign In
        </button>
      </nav>

      <section className="hero">
        <div className="hero-glow" />
        <h1 className="hero-title">
          Every moment becomes a <span className="hero-star">star</span>
        </h1>
        <p className="hero-sub">
          A private shared universe for two people. Every activity, memory, and
          challenge you complete together lights up your cosmos.
        </p>
        <button className="hero-cta" onClick={onGetStarted}>
          Create Your Universe
        </button>
      </section>

      <section className="features">
        <div className="feature">
          <span className="feature-icon">🧩</span>
          <h3>Puzzles</h3>
          <p>Upload images, solve them together. Each completed puzzle becomes a star.</p>
        </div>
        <div className="feature">
          <span className="feature-icon">🎨</span>
          <h3>Drawing</h3>
          <p>Draw together in real-time on a shared canvas. Your art becomes a memory.</p>
        </div>
        <div className="feature">
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
        <p>Univas — a living archive of moments created together</p>
      </footer>
    </div>
  );
}
