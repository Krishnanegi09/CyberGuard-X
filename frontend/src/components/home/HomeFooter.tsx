import React from 'react'
import { Shield, Terminal, ArrowRight, ExternalLink } from 'lucide-react'

interface HomeFooterProps {
  onLaunchConsole?: () => void
}

export const HomeFooter: React.FC<HomeFooterProps> = ({ onLaunchConsole }) => {
  return (
    <footer className="home-footer-section">
      {/* Final Call To Action Banner */}
      <div className="footer-cta-banner">
        <div className="cta-banner-content">
          <span className="cta-eyebrow">AUTONOMOUS CYBER DEFENSE</span>
          <h2 className="cta-heading">
            See Your Network. Understand the Threat. Control the Response.
          </h2>
          <p className="cta-description">
            Deploy CYBERGUARD-X in your enterprise environment or test lab to gain real-time wire visibility,
            simulate lateral attack exposure, and execute calibrated countermeasures.
          </p>

          <div className="cta-actions-row">
            <button
              type="button"
              className="btn-cta-launch"
              onClick={onLaunchConsole}
            >
              <span>Launch CYBERGUARD-X</span>
              <ArrowRight size={16} />
            </button>

            <a
              href="https://github.com/Krishnanegi09/CyberGuard-X"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-cta-docs"
            >
              <Terminal size={15} />
              <span>View Source on GitHub</span>
              <ExternalLink size={13} />
            </a>
          </div>
        </div>
      </div>

      {/* Main Footer Links Grid */}
      <div className="footer-links-container">
        <div className="footer-brand-col">
          <div className="footer-brand-logo">
            <div className="brand-logo-icon">
              <Shield size={20} />
            </div>
            <span className="brand-title">CYBERGUARD-X</span>
          </div>

          <p className="footer-brand-tagline">
            Autonomous AI-Powered Cyber Defense and Digital Twin Security Platform.
            Engineered with strict zero-fake-data provenance and four-eyes human guardrails.
          </p>

          <div className="footer-status-pill">
            <span className="status-dot-green" />
            <span>CORE ENGINE · OPERATIONAL</span>
          </div>
        </div>

        <div className="footer-nav-col">
          <h4 className="footer-col-title">Platform</h4>
          <ul className="footer-links-list">
            <li><a href="#twin">Cyber Digital Twin</a></li>
            <li><a href="#capabilities">Attack-Path Simulation</a></li>
            <li><a href="#capabilities">AI Threat Intelligence</a></li>
            <li><a href="#capabilities">Automated Response</a></li>
            <li><a href="#loop">6-Stage Defense Loop</a></li>
          </ul>
        </div>

        <div className="footer-nav-col">
          <h4 className="footer-col-title">Solutions</h4>
          <ul className="footer-links-list">
            <li><a href="#provenance">Zero Fake Data Telemetry</a></li>
            <li><a href="#safety">Tenant Isolation &amp; RLS</a></li>
            <li><a href="#safety">Four-Eyes Approval Workflow</a></li>
            <li><a href="#safety">Global Emergency Stop</a></li>
            <li><a href="#specs">Enterprise Security Specs</a></li>
          </ul>
        </div>

        <div className="footer-nav-col">
          <h4 className="footer-col-title">Resources &amp; Docs</h4>
          <ul className="footer-links-list">
            <li>
              <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer">
                OpenAPI / Swagger Docs
              </a>
            </li>
            <li>
              <a href="https://github.com/Krishnanegi09/CyberGuard-X" target="_blank" rel="noreferrer">
                GitHub Repository
              </a>
            </li>
            <li><a href="#architecture">Architecture Diagram</a></li>
            <li><a href="#provenance">Data Provenance Standard</a></li>
          </ul>
        </div>
      </div>

      {/* Bottom Sub-Footer Bar */}
      <div className="footer-bottom-bar">
        <div className="bottom-bar-inner">
          <span className="copyright-text">
            &copy; {new Date().getFullYear()} CYBERGUARD-X Platform. BTech CSE Major Project. All rights reserved.
          </span>

          <div className="legal-links">
            <span className="provenance-pill">STRICT ZERO-FAKE-DATA COMPLIANT</span>
            <span className="divider">·</span>
            <span>PROVENANCE: OBSERVED | DERIVED | PREDICTED | SIMULATED</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default HomeFooter
