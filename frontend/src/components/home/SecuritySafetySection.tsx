import React from 'react'
import { Lock, ShieldCheck, Users, Clock, AlertOctagon, Network } from 'lucide-react'

export const SecuritySafetySection: React.FC = () => {
  const safetyFeatures = [
    {
      icon: <Lock size={22} />,
      title: 'PostgreSQL Row-Level Security (RLS)',
      desc: 'Multi-tenant isolation enforced at the database kernel level with session variables. No query can leak cross-organization records.',
    },
    {
      icon: <Network size={22} />,
      title: 'Authorized CIDR Scope Enforcement',
      desc: 'Scans and packet inspection execute strictly within administrator-authorized CIDRs. Out-of-scope targets are rejected at the API gate.',
    },
    {
      icon: <Users size={22} />,
      title: 'Four-Eyes Approval Workflow',
      desc: 'No active defensive countermeasure (such as firewall shuns) executes automatically in production without explicit human analyst confirmation.',
    },
    {
      icon: <Clock size={22} />,
      title: 'Auto-Expiring Time-To-Live (TTL)',
      desc: 'All defensive network shun rules carry mandatory TTL expiration timestamps (default 15–60 min) with deterministic automatic rollback.',
    },
    {
      icon: <ShieldCheck size={22} />,
      title: 'Role-Based Access Control (RBAC)',
      desc: 'Separation of privileges between Security Analysts, System Administrators, and Read-Only Auditors with Firebase cryptographic tokens.',
    },
    {
      icon: <AlertOctagon size={22} />,
      title: 'One-Click Global Emergency Stop',
      desc: 'Hardware/software kill switch that instantly revokes all active firewall shuns and restores normal network routing in under 500 milliseconds.',
    },
  ]

  return (
    <section id="safety" className="safety-section">
      <div className="section-header-centered">
        <span className="eyebrow-badge">ENTERPRISE SAFETY GUARDRAILS</span>
        <h2 className="section-main-heading">Engineered for Safe, Responsible Defense</h2>
        <p className="section-sub-heading max-w-2xl">
          Autonomous defense requires rigorous safety guarantees. CYBERGUARD-X enforces multi-layered controls to prevent accidental outages,
          unauthorized actions, or out-of-scope network interactions.
        </p>
      </div>

      <div className="safety-cards-grid">
        {safetyFeatures.map((feat, idx) => (
          <div key={idx} className="safety-feature-card">
            <div className="safety-icon-wrapper">
              {feat.icon}
            </div>
            <div className="safety-content">
              <h3 className="safety-title">{feat.title}</h3>
              <p className="safety-desc">{feat.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default SecuritySafetySection
