import { Link } from 'react-router-dom';
import './HomePage.css';

export function HomePage() {
  return (
    <div className="homepage">
      <header className="hp-header">
        <div className="hp-header-inner">
          <Link to="/" className="hp-brand">WellnessHub</Link>
          <nav className="hp-header-nav" aria-label="Site navigation">
            <Link to="/login" className="hp-btn-ghost">Log In</Link>
            <Link to="/signup" className="hp-btn-primary">Get Started</Link>
          </nav>
        </div>
      </header>

      <main id="main-content">
        {/* Hero */}
        <section className="hp-hero" aria-labelledby="hero-heading">
          <div className="hp-hero-inner">
            <h1 id="hero-heading">Your Health Journey Starts Here</h1>
            <p className="hp-hero-subtitle">
              Monitor, track, and improve your wellness with our comprehensive health dashboard.
              Get real-time insights into your vital signs and take control of your health.
            </p>
            <div className="hp-hero-ctas">
              <Link to="/signup" className="hp-btn-hero-primary">Get Started Free</Link>
              <Link to="#domains" className="hp-btn-hero-secondary">Learn More</Link>
            </div>
          </div>
        </section>

        {/* Domain cards */}
        <section id="domains" className="hp-domains" aria-labelledby="domains-heading">
          <div className="hp-section-inner">
            <h2 id="domains-heading" className="hp-section-title">
              Everything you need to track your wellness
            </h2>
            <p className="hp-section-subtitle">
              Four core health domains monitored in one unified dashboard
            </p>
            <div className="hp-domain-grid">
              <article className="hp-domain-card">
                <div className="hp-domain-icon" aria-hidden="true">🏃</div>
                <h3>Activity</h3>
                <p>
                  Track your daily steps, active minutes, calories burned, and workout patterns
                  to stay motivated and reach your fitness goals.
                </p>
              </article>
              <article className="hp-domain-card">
                <div className="hp-domain-icon" aria-hidden="true">😴</div>
                <h3>Sleep</h3>
                <p>
                  Monitor sleep duration, quality, and consistency to understand your rest
                  patterns and improve recovery.
                </p>
              </article>
              <article className="hp-domain-card">
                <div className="hp-domain-icon" aria-hidden="true">❤️</div>
                <h3>Vital Metrics</h3>
                <p>
                  Keep an eye on heart rate, resting heart rate, blood pressure, and other
                  vital signs for complete health awareness.
                </p>
              </article>
              <article className="hp-domain-card">
                <div className="hp-domain-icon" aria-hidden="true">⚖️</div>
                <h3>Body Composition</h3>
                <p>
                  Track weight, body fat percentage, muscle mass, and other composition metrics
                  to understand your body changes over time.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* Statistics */}
        <section className="hp-stats" aria-label="Key statistics">
          <div className="hp-stats-grid">
            <div>
              <div className="hp-stat-value">4</div>
              <div className="hp-stat-label">Core health domains monitored</div>
            </div>
            <div>
              <div className="hp-stat-value">1</div>
              <div className="hp-stat-label">Unified dashboard replacing multiple apps</div>
            </div>
            <div>
              <div className="hp-stat-value">Daily</div>
              <div className="hp-stat-label">Near-daily synchronization visibility</div>
            </div>
            <div>
              <div className="hp-stat-value">100%</div>
              <div className="hp-stat-label">Privacy-first handling of your data</div>
            </div>
          </div>
        </section>

        {/* Trust */}
        <section className="hp-trust" aria-labelledby="trust-heading">
          <div className="hp-section-inner">
            <h2 id="trust-heading" className="hp-section-title">Your data, your control</h2>
            <p className="hp-trust-lead">
              We never sell your health information to third parties. Your wellness data is
              encrypted, secure, and always under your control.
            </p>
            <div className="hp-trust-grid">
              <div className="hp-trust-item">
                <div className="hp-trust-icon" aria-hidden="true">🔒</div>
                <h3>You Own Your Data</h3>
                <p>Your health information belongs to you. Export or delete it anytime.</p>
              </div>
              <div className="hp-trust-item">
                <div className="hp-trust-icon" aria-hidden="true">🛡️</div>
                <h3>Encrypted &amp; Secure</h3>
                <p>
                  All data is encrypted at rest and in transit with industry-standard security.
                </p>
              </div>
              <div className="hp-trust-item">
                <div className="hp-trust-icon" aria-hidden="true">🚫</div>
                <h3>Never Sold</h3>
                <p>
                  We will never sell your personal health data to advertisers or third parties.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="hp-footer">
        <div className="hp-footer-inner">
          <Link to="/" className="hp-footer-brand">WellnessHub</Link>
          <nav className="hp-footer-nav" aria-label="Footer navigation">
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
            <Link to="/contact">Contact</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
