import React from 'react'
import {
  Box,
  GitBranch,
  Cpu,
  Zap,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'

interface PlatformCapabilitiesProps {
  onSelectCapability?: (key: string) => void
  onLaunchConsole?: () => void
}

export const PlatformCapabilities: React.FC<PlatformCapabilitiesProps> = ({
  onLaunchConsole,
}) => {
  const cards = [
    {
      id: 'twin',
      title: 'Cyber Digital Twin',
      icon: <Box size={24} />,
      desc: 'A live, high-fidelity model of your network for safe, realistic attack simulation.',
      highlights: [
        'Real network topology & trust-zone boundaries',
        'Dynamic asset connectivity & edge weights',
        'Air-gapped safe environment for attack dry-runs',
      ],
    },
    {
      id: 'simulation',
      title: 'Attack-Path Simulation',
      icon: <GitBranch size={24} />,
      desc: 'Simulate multi-stage lateral movement and identify critical exposure paths.',
      highlights: [
        'Multi-stage lateral traversal calculations',
        'Critical bottleneck & choke-point isolation',
        'Blast-radius estimation & what-if analysis',
      ],
    },
    {
      id: 'ml',
      title: 'AI Threat Intelligence',
      icon: <Cpu size={24} />,
      desc: 'Detect, prioritize, and predict threats using trained ML models and behavioral analytics.',
      highlights: [
        'Supervised network flow classification',
        'Unsupervised statistical anomaly detection',
        'Explainable asset risk scoring & MITRE mapping',
      ],
    },
    {
      id: 'defense',
      title: 'Automated Response',
      icon: <Zap size={24} />,
      desc: 'Execute calibrated, policy-aware defensive actions in real time.',
      highlights: [
        'Four-Eyes human authorization & audit trail',
        'Precision firewall shuns & container isolation',
        'Automatic TTL expiry & 1-click Emergency Stop',
      ],
    },
  ]

  return (
    <section id="capabilities" className="capabilities-section">
      <div className="section-header-row">
        <div className="section-title-group">
          <span className="eyebrow-badge">PLATFORM CAPABILITIES</span>
          <h2 className="section-main-heading">A Unified Cyber Defense Platform</h2>
          <p className="section-sub-heading">
            One connected intelligence layer for observing, understanding, predicting, and defending enterprise infrastructure.
          </p>
        </div>

        <button
          type="button"
          className="section-explore-link"
          onClick={onLaunchConsole}
        >
          <span>Explore All Capabilities</span>
          <ArrowRight size={15} />
        </button>
      </div>

      <div className="capabilities-cards-grid">
        {cards.map((card) => (
          <div key={card.id} className="capability-card" tabIndex={0}>
            <div className="card-top-row">
              <div className="card-icon-wrapper">
                {card.icon}
              </div>
              <button
                type="button"
                className="card-arrow-btn"
                onClick={onLaunchConsole}
                aria-label={`Open ${card.title} console`}
              >
                <ArrowRight size={14} />
              </button>
            </div>

            <h3 className="card-title">{card.title}</h3>
            <p className="card-description">{card.desc}</p>

            <div className="card-highlights-list">
              {card.highlights.map((h, i) => (
                <div key={i} className="highlight-item">
                  <CheckCircle2 size={13} className="check-icon" />
                  <span>{h}</span>
                </div>
              ))}
            </div>

            <div className="card-bottom-accent" />
          </div>
        ))}
      </div>
    </section>
  )
}

export default PlatformCapabilities
