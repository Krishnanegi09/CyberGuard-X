import React from 'react'
import { FileCheck2, Cpu, BarChart3, Layers, CheckCircle2 } from 'lucide-react'

export const EvidenceArchitecture: React.FC = () => {
  const provenanceCategories = [
    {
      badge: 'OBSERVED',
      color: 'teal',
      icon: <FileCheck2 size={20} />,
      title: 'Direct Wire Telemetry',
      definition: 'Captured straight from genuine raw network traffic, verified Nmap port scans, or system telemetry.',
      examples: 'Raw packet headers, open ports, IP flow byte counters, TCP handshake flags.',
    },
    {
      badge: 'DERIVED',
      color: 'blue',
      icon: <Cpu size={20} />,
      title: 'Deterministic Processing',
      definition: 'Calculated from genuine observations through deterministic logic, CVE matching, or signature rules.',
      examples: 'Snort signature alerts, CVSS vulnerability mappings, MITRE ATT&CK technique tagging.',
    },
    {
      badge: 'PREDICTED',
      color: 'purple',
      icon: <BarChart3 size={20} />,
      title: 'Validated ML Estimations',
      definition: 'Estimated by statistical algorithms or trained machine learning models with known held-out test accuracy.',
      examples: 'RandomForest compromise probability, IsolationForest flow anomaly scores.',
    },
    {
      badge: 'SIMULATED',
      color: 'amber',
      icon: <Layers size={20} />,
      title: 'Digital Twin Graph Traversal',
      definition: 'Generated inside the in-memory digital twin to evaluate hypothetical breach paths without touching real assets.',
      examples: 'Shortest attack path hops, simulated lateral traversal, blast-radius projections.',
    },
  ]

  return (
    <section id="provenance" className="provenance-section">
      <div className="section-header-centered">
        <span className="eyebrow-badge">STRICT DATA PROVENANCE</span>
        <h2 className="section-main-heading">Zero Fake Data. Every Record Verifiable.</h2>
        <p className="section-sub-heading max-w-2xl">
          CYBERGUARD-X enforces a strict four-category provenance model across all API responses, database records, and UI views.
          We never fabricate synthetic operational metrics to make dashboards look populated.
        </p>
      </div>

      <div className="provenance-cards-grid">
        {provenanceCategories.map((item) => (
          <div key={item.badge} className={`provenance-card ${item.color}`}>
            <div className="provenance-card-header">
              <span className={`provenance-badge-pill ${item.badge.toLowerCase()}`}>
                {item.badge}
              </span>
              <div className="provenance-icon-box">
                {item.icon}
              </div>
            </div>

            <h3 className="provenance-title">{item.title}</h3>
            <p className="provenance-desc">{item.definition}</p>

            <div className="provenance-example-box">
              <span className="example-label">AUDITED ATTRIBUTES:</span>
              <p className="example-text">{item.examples}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="provenance-guarantee-banner">
        <div className="guarantee-icon">
          <CheckCircle2 size={22} className="text-cyan" />
        </div>
        <div className="guarantee-content">
          <span className="guarantee-heading">Strict Forensic Integrity Guarantee</span>
          <p className="guarantee-text">
            If an environment has zero observed packets or open ports, CYBERGUARD-X renders a clean empty state rather than inventing hypothetical assets.
            Every security finding can be traced back to its raw network evidence packet or scan record.
          </p>
        </div>
      </div>
    </section>
  )
}

export default EvidenceArchitecture
