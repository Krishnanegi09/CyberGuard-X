import React, { useState } from 'react'
import {
  Eye,
  FileSearch,
  Layers,
  BarChart3,
  Shield,
  RotateCcw,
  ArrowRight,
} from 'lucide-react'

export const DefenseLoopSection: React.FC = () => {
  const [activeStage, setActiveStage] = useState<number>(0)

  const stages = [
    {
      id: '01',
      title: 'Observe',
      icon: <Eye size={20} />,
      tagline: 'Real-time network telemetry',
      desc: 'Non-root eBPF passive packet sensor capturing raw network flows inside authorized CIDR scopes without overhead or packet loss.',
      provenance: 'OBSERVED',
      telemetry: 'Wire-speed AF_PACKET / eBPF flow capture with exact packet byte counts and timestamps.',
    },
    {
      id: '02',
      title: 'Understand',
      icon: <FileSearch size={20} />,
      tagline: 'Threat detection & correlation',
      desc: 'Correlates raw observations against Snort rules, open CVE databases, and MITRE ATT&CK techniques with zero synthetic alerts.',
      provenance: 'DERIVED',
      telemetry: 'Deterministic rule correlation, CVE CVSS v3 vectors, and asset vulnerability fingerprints.',
    },
    {
      id: '03',
      title: 'Simulate',
      icon: <Layers size={20} />,
      tagline: 'Safe, realistic attack paths',
      desc: 'Maintains an in-memory graph representation of enterprise trust zones, servers, and firewall boundaries for lateral breach dry-runs.',
      provenance: 'SIMULATED',
      telemetry: 'Dijkstra shortest-choke-path graph traversal, privilege hopping, and blast-radius modeling.',
    },
    {
      id: '04',
      title: 'Predict & Decide',
      icon: <BarChart3 size={20} />,
      tagline: 'ML-driven risk estimation',
      desc: 'Trained supervised Random Forest classifiers and Isolation Forests estimate compromise probability and asset risk scores.',
      provenance: 'PREDICTED',
      telemetry: 'Statistical flow anomalies, held-out validated models with F1 >= 0.90, and feature attribution.',
    },
    {
      id: '05',
      title: 'Defend & Automate',
      icon: <Shield size={20} />,
      tagline: 'Automated, controlled defense',
      desc: 'Executes human-approved defensive actions including firewall shuns, container isolation, and rollback timers under a Four-Eyes protocol.',
      provenance: 'DERIVED',
      telemetry: 'Kernel iptables/pf drop rules with auto-expiring TTLs and 1-click Emergency Stop.',
    },
    {
      id: '06',
      title: 'Learn',
      icon: <RotateCcw size={20} />,
      tagline: 'Analyst feedback & retraining',
      desc: 'Captures analyst triage verdicts, flags false positives, and feeds verified ground truth back to retrain ML risk estimators.',
      provenance: 'DERIVED',
      telemetry: 'Continuous active-learning pipeline with immutable audit logs and versioned model weights.',
    },
  ]

  return (
    <section id="loop" className="defense-loop-section">
      <div className="loop-header-group">
        <span className="eyebrow-badge">BUILT FOR MODERN SECURITY TEAMS</span>
        <h2 className="loop-main-heading">From Visibility to Autonomous Defense</h2>
        <p className="loop-sub-heading">
          Unify telemetry, simulation, intelligence, and response in a single operational platform.
        </p>
      </div>

      {/* Horizontal Connected Process Bar (Matching the Storyboard) */}
      <div className="horizontal-process-strip">
        <div className="process-strip-inner">
          {stages.slice(0, 4).map((stage, idx) => (
            <React.Fragment key={stage.id}>
              <div
                className={`process-step-node ${activeStage === idx ? 'active' : ''}`}
                onClick={() => setActiveStage(idx)}
                role="button"
                tabIndex={0}
              >
                <div className="step-icon-circle">
                  {stage.icon}
                </div>
                <div className="step-text-group">
                  <span className="step-title">{stage.title}</span>
                  <span className="step-tagline">{stage.tagline}</span>
                </div>
              </div>

              {idx < 3 && (
                <div className="process-arrow-divider">
                  <ArrowRight size={18} />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* All 6 Stages Grid Detail Cards */}
      <div className="stages-detail-grid">
        {stages.map((stage, idx) => {
          const isActive = activeStage === idx

          return (
            <div
              key={stage.id}
              className={`stage-detail-card ${isActive ? 'active-stage' : ''}`}
              onClick={() => setActiveStage(idx)}
            >
              <div className="stage-top-header">
                <span className="stage-number">{stage.id}</span>
                <span className={`stage-provenance-tag ${stage.provenance.toLowerCase()}`}>
                  {stage.provenance}
                </span>
              </div>

              <div className="stage-title-row">
                <div className="stage-card-icon">
                  {stage.icon}
                </div>
                <h3 className="stage-card-title">{stage.title}</h3>
              </div>

              <p className="stage-card-desc">{stage.desc}</p>

              <div className="stage-telemetry-box">
                <span className="telemetry-box-label">EVIDENCE BACKING:</span>
                <p className="telemetry-box-text">{stage.telemetry}</p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default DefenseLoopSection
