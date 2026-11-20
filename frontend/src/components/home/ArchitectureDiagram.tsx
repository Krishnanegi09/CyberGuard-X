import React, { useState } from 'react'
import {
  Cpu,
  Database,
  Radio,
  Layers,
  Zap,
  ArrowRight,
  Terminal,
  Activity,
} from 'lucide-react'

export const ArchitectureDiagram: React.FC = () => {
  const [activeComponent, setActiveComponent] = useState<string>('sensor')

  const components = [
    {
      id: 'sensor',
      name: 'Passive Packet Sensor',
      tech: 'Python AF_PACKET / Scapy / eBPF',
      role: 'Captures raw packet headers from network interfaces in promisc mode without dropping packets.',
      specs: 'Non-root capability bounding, zero payload storage, CIDR scope filter.',
    },
    {
      id: 'api',
      name: 'FastAPI Application Plane',
      tech: 'Python 3.12+ / FastAPI / Uvicorn',
      role: 'High-throughput async REST API & WebSocket server streaming live wire events to operators.',
      specs: 'Firebase Auth verification, OrgContext RLS dependency, Pydantic v2 validation.',
    },
    {
      id: 'db',
      name: 'PostgreSQL 17 Data Core',
      tech: 'Postgres 17 / Alembic / SQLAlchemy',
      role: 'ACID storage for assets, findings, attack paths, and asynchronous transactional job queue.',
      specs: 'Row-Level Security (RLS) on all tables, audit logging, restore-tested schema.',
    },
    {
      id: 'nids',
      name: 'NIDS Detection Engine',
      tech: 'Deterministic Snort Rules + CVE DB',
      role: 'Evaluates packet flows against community signatures and CVE database indicators.',
      specs: 'Zero synthetic alerts, provenance DERIVED, sub-millisecond evaluation.',
    },
    {
      id: 'twin',
      name: 'Cyber Digital Twin',
      tech: 'NetworkX Graph Modeling',
      role: 'In-memory multi-tenant graph modeling hosts, services, credential reuse, and trust zones.',
      specs: 'Air-gapped attack simulation, Dijkstra lateral pathing, blast radius projection.',
    },
    {
      id: 'ml',
      name: 'ML Risk Estimators',
      tech: 'Scikit-learn / IsolationForest / RF',
      role: 'Predicts flow compromise probability and calculates asset risk scores with explainability.',
      specs: 'Held-out test accuracy >= 0.90, versioned model artifacts, provenance PREDICTED.',
    },
    {
      id: 'executor',
      name: 'Defense Action Executor',
      tech: 'iptables / pf / Docker network',
      role: 'Enforces firewall shuns and container isolation with mandatory auto-expiring TTLs.',
      specs: 'Four-Eyes human confirmation, audit logged transitions, 1-click Emergency Stop.',
    },
  ]

  const active = components.find((c) => c.id === activeComponent) || components[0]

  return (
    <section id="architecture" className="architecture-section">
      <div className="section-header-centered">
        <span className="eyebrow-badge">ENGINEERING SPECIFICATIONS</span>
        <h2 className="section-main-heading">Evidence-Driven Architecture</h2>
        <p className="section-sub-heading max-w-2xl">
          An end-to-end pipeline connecting wire-speed passive packet capture to in-memory attack graph simulation
          and human-approved automated defense.
        </p>
      </div>

      {/* Visual Pipeline Flow */}
      <div className="architecture-pipeline-wrapper">
        <div className="pipeline-nodes-row">
          {components.map((comp, idx) => (
            <React.Fragment key={comp.id}>
              <div
                className={`pipeline-component-node ${activeComponent === comp.id ? 'active' : ''}`}
                onClick={() => setActiveComponent(comp.id)}
                role="button"
                tabIndex={0}
              >
                <div className="node-icon-avatar">
                  {comp.id === 'sensor' && <Radio size={16} />}
                  {comp.id === 'api' && <Terminal size={16} />}
                  {comp.id === 'db' && <Database size={16} />}
                  {comp.id === 'nids' && <Activity size={16} />}
                  {comp.id === 'twin' && <Layers size={16} />}
                  {comp.id === 'ml' && <Cpu size={16} />}
                  {comp.id === 'executor' && <Zap size={16} />}
                </div>
                <span className="node-title">{comp.name}</span>
                <span className="node-tech-tag">{comp.tech.split('/')[0]}</span>
              </div>

              {idx < components.length - 1 && (
                <div className="pipeline-connector-line">
                  <ArrowRight size={14} />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Component Detail Card */}
      <div className="architecture-detail-panel">
        <div className="panel-header-row">
          <div className="panel-title-group">
            <span className="panel-badge-category">COMPONENT SPECIFICATION</span>
            <h3 className="panel-component-name">{active.name}</h3>
            <span className="panel-tech-stack mono">{active.tech}</span>
          </div>

          <div className="panel-status-pill">
            <span className="status-dot-active" />
            OPERATIONAL
          </div>
        </div>

        <div className="panel-body-grid">
          <div className="body-col">
            <span className="col-label">PRIMARY RESPONSIBILITY</span>
            <p className="col-desc">{active.role}</p>
          </div>
          <div className="body-col">
            <span className="col-label">SECURITY &amp; PERFORMANCE GUARANTEES</span>
            <p className="col-desc highlight">{active.specs}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ArchitectureDiagram
