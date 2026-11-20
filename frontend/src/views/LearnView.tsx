import React, { useState } from 'react'
import {
  BookOpen,
  Shield,
  Activity,
  Layers,
  Zap,
  Cpu,
  Lock,
  GitBranch,
} from 'lucide-react'

export const LearnView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'mitre' | 'ml' | 'defend'>('architecture')

  return (
    <div className="view-container">
      <div className="discovery-view-header" style={{ marginBottom: '24px' }}>
        <div className="discovery-header-copy">
          <h2>Platform Knowledge Base & Intelligence Core</h2>
          <p>
            Architectural reference, MITRE ATT&CK technique taxonomy, ML threat detection mechanics,
            and deterministic defense engineering guidelines for CYBERGUARD-X.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
        <button
          type="button"
          className={`btn-layout-preset ${activeTab === 'architecture' ? 'active' : ''}`}
          onClick={() => setActiveTab('architecture')}
          style={{ height: '34px', padding: '0 14px' }}
        >
          <GitBranch size={13} />
          <span>Core 5-Pillar Architecture</span>
        </button>

        <button
          type="button"
          className={`btn-layout-preset ${activeTab === 'mitre' ? 'active' : ''}`}
          onClick={() => setActiveTab('mitre')}
          style={{ height: '34px', padding: '0 14px' }}
        >
          <Shield size={13} />
          <span>MITRE ATT&CK Mapping</span>
        </button>

        <button
          type="button"
          className={`btn-layout-preset ${activeTab === 'ml' ? 'active' : ''}`}
          onClick={() => setActiveTab('ml')}
          style={{ height: '34px', padding: '0 14px' }}
        >
          <Cpu size={13} />
          <span>ML Classifier Mechanics</span>
        </button>

        <button
          type="button"
          className={`btn-layout-preset ${activeTab === 'defend' ? 'active' : ''}`}
          onClick={() => setActiveTab('defend')}
          style={{ height: '34px', padding: '0 14px' }}
        >
          <Lock size={13} />
          <span>Four-Eyes & Zero Fake Data</span>
        </button>
      </div>

      {/* Tab 1: Architecture */}
      {activeTab === 'architecture' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          <div className="cg-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <Activity size={18} className="text-cyan" />
              <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)' }}>1. OBSERVE</h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Bounded Nmap discovery scans inside authorized CIDR blocks map live hosts, exposed TCP/UDP ports, and service banners.
              Wire-level BPF packet streams ingest raw Ethernet and IP frames without running the main API daemon as root.
            </p>
          </div>

          <div className="cg-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <Shield size={18} className="text-cyan" />
              <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)' }}>2. UNDERSTAND</h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Wire NIDS inspection engine detects scan signatures (SYN vertical bursts, UDP sweeps, multi-host sweeps)
              and deduplicates bursts with stateful sliding windows. CVEs are matched locally from service banners with explicit confidence scores.
            </p>
          </div>

          <div className="cg-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <Layers size={18} className="text-cyan" />
              <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)' }}>3. SIMULATE</h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Digital Twin constructs network reachability graphs using MulVAL attack graphs.
              Operators can test What-If interventions (e.g. closing FTP port 21 or isolating DMZ) to measure lateral path cost reduction before applying firewall rules.
            </p>
          </div>

          <div className="cg-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <Zap size={18} className="text-cyan" />
              <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)' }}>4. DEFEND</h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Four-eyes approval protocol requires two distinct operators to authorize high-impact firewall actions.
              All dynamic shun rules carry Time-To-Live (TTL) auto-rollback and instant emergency kill switches.
            </p>
          </div>

          <div className="cg-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <BookOpen size={18} className="text-cyan" />
              <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)' }}>5. LEARN</h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Analyst feedback verdicts (CONFIRMED / FALSE_POSITIVE) feed back into retrained classifiers.
              Exported datasets are cryptographically sealed with SHA-256 manifests to prevent data poisoning.
            </p>
          </div>
        </div>
      )}

      {/* Tab 2: MITRE */}
      {activeTab === 'mitre' && (
        <div className="cg-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
            MITRE ATT&CK Matrix Alignment (Enterprise v14.1)
          </h3>
          <table className="assets-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                <th style={{ padding: '12px 14px' }}>Tactic</th>
                <th style={{ padding: '12px 14px' }}>Technique ID</th>
                <th style={{ padding: '12px 14px' }}>Technique Name</th>
                <th style={{ padding: '12px 14px' }}>Detection Rule</th>
                <th style={{ padding: '12px 14px' }}>Countermeasure</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>Discovery</td>
                <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>T1046</td>
                <td style={{ padding: '12px 14px', fontWeight: 500 }}>Network Service Discovery</td>
                <td style={{ padding: '12px 14px' }}><code>RULE_PORT_SCAN_VERTICAL</code></td>
                <td style={{ padding: '12px 14px' }}>Dynamic Host Shun (TTL 15m)</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>Credential Access</td>
                <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>T1110</td>
                <td style={{ padding: '12px 14px', fontWeight: 500 }}>Brute Force (SSH/Auth)</td>
                <td style={{ padding: '12px 14px' }}><code>RULE_BRUTE_FORCE_AUTH</code></td>
                <td style={{ padding: '12px 14px' }}>Rate-limit & MFA Token Challenge</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>Initial Access</td>
                <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>T1133</td>
                <td style={{ padding: '12px 14px', fontWeight: 500 }}>External Remote Services</td>
                <td style={{ padding: '12px 14px' }}><code>RULE_RISKY_SERVICE</code></td>
                <td style={{ padding: '12px 14px' }}>Port Shun & Zero-Trust Quarantine</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>Lateral Movement</td>
                <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>T1021</td>
                <td style={{ padding: '12px 14px', fontWeight: 500 }}>Remote Services Pivot</td>
                <td style={{ padding: '12px 14px' }}><code>RULE_LATERAL_PIVOT</code></td>
                <td style={{ padding: '12px 14px' }}>Subnet Micro-Segmentation</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: ML */}
      {activeTab === 'ml' && (
        <div className="cg-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '14px' }}>
            Machine Learning Classifier & Feature Extraction Pipeline
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '20px' }}>
            The CYBERGUARD-X ML engine computes 28 statistical flow features across bidirectional packet windows.
            To eliminate data leakage, models are evaluated with temporal session splits rather than random k-fold splits.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            <div style={{ backgroundColor: 'var(--bg-canvas)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                Flow Timing Features
              </span>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <li>Inter-arrival time mean & variance</li>
                <li>Flow active / idle duration</li>
                <li>Sub-flow burst rate</li>
              </ul>
            </div>

            <div style={{ backgroundColor: 'var(--bg-canvas)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                TCP Flag Distribution
              </span>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <li>SYN flag ratio (probe indicator)</li>
                <li>RST flag frequency (closed port response)</li>
                <li>FIN/PSH/URG anomaly distribution</li>
              </ul>
            </div>

            <div style={{ backgroundColor: 'var(--bg-canvas)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                Packet Entropy & Symmetry
              </span>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <li>Byte length Shannon entropy</li>
                <li>Forward vs backward packet symmetry</li>
                <li>Header-to-payload ratio</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Defend & Rules */}
      {activeTab === 'defend' && (
        <div className="cg-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '14px' }}>
            Zero Fake Data & Four-Eyes Governance Principles
          </h3>
          <ul style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.8, paddingLeft: '20px' }}>
            <li>
              <strong>Zero Fake Data Guarantee:</strong> Operational security findings must originate from real database tables, live network sensors, or verified PCAP replays. Demonstrations of synthetic lab data are explicitly tagged with provenance badges (<code>OBSERVED</code>, <code>SIMULATED</code>, <code>PREDICTED</code>).
            </li>
            <li>
              <strong>Strict Multi-Tenant Row Level Security:</strong> Every SQL observation, finding, network scope, and audit log is partitioned by <code>organization_id</code>. Cross-organization access is rejected at both API and database layers.
            </li>
            <li>
              <strong>Append-Only Immutable Audit Trail:</strong> PostgreSQL stored triggers block any <code>UPDATE</code> or <code>DELETE</code> statements against the <code>audit_logs</code> table, ensuring non-repudiation for all SOC operations.
            </li>
            <li>
              <strong>Dual Authorization (Four-Eyes):</strong> High-risk defense mitigations require the approver to be a different user identity than the requester.
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}
export default LearnView
