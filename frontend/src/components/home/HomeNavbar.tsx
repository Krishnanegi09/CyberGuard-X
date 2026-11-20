import React, { useState, useEffect } from 'react'
import {
  Shield,
  ArrowRight,
  ChevronDown,
  Terminal,
  Menu,
  X,
  Cpu,
  Layers,
  Activity,
  Lock,
  GitBranch,
  BookOpen,
  FileCode,
  Users,
} from 'lucide-react'

interface HomeNavbarProps {
  onLaunchConsole: () => void
  isAuthenticated?: boolean
}

export const HomeNavbar: React.FC<HomeNavbarProps> = ({
  onLaunchConsole,
  isAuthenticated = false,
}) => {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const toggleDropdown = (name: string) => {
    setActiveDropdown((prev) => (prev === name ? null : name))
  }

  const closeAllMenus = () => {
    setActiveDropdown(null)
    setMobileMenuOpen(false)
  }

  return (
    <header className={`home-nav-bar ${isScrolled ? 'scrolled' : ''}`}>
      <div className="home-nav-container">
        {/* Left: Brand Identity */}
        <div className="home-nav-brand">
          <a href="#" className="brand-link" onClick={closeAllMenus}>
            <div className="brand-logo-icon">
              <Shield size={20} />
            </div>
            <span className="brand-title">CYBERGUARD-X</span>
          </a>

          <div className="brand-status-indicator">
            <span className="status-ping" />
            <span className="status-label">CORE ENGINE · OPERATIONAL</span>
          </div>
        </div>

        {/* Center: Navigation Links with Accessible Dropdowns */}
        <nav className="home-nav-menu" aria-label="Main Navigation">
          {/* Platform Dropdown */}
          <div
            className={`nav-dropdown ${activeDropdown === 'platform' ? 'open' : ''}`}
            onMouseEnter={() => setActiveDropdown('platform')}
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <button
              type="button"
              className="nav-link-btn"
              onClick={() => toggleDropdown('platform')}
              aria-expanded={activeDropdown === 'platform'}
            >
              <span>Platform</span>
              <ChevronDown size={14} className="chevron-icon" />
            </button>

            <div className="dropdown-panel">
              <a href="#twin" className="dropdown-item" onClick={closeAllMenus}>
                <div className="dropdown-item-icon">
                  <Layers size={16} />
                </div>
                <div className="dropdown-item-text">
                  <span className="item-title">Cyber Digital Twin</span>
                  <span className="item-desc">High-fidelity topology & trust zones</span>
                </div>
              </a>
              <a href="#capabilities" className="dropdown-item" onClick={closeAllMenus}>
                <div className="dropdown-item-icon">
                  <GitBranch size={16} />
                </div>
                <div className="dropdown-item-text">
                  <span className="item-title">Attack-Path Simulation</span>
                  <span className="item-desc">Lateral movement & blast radius estimation</span>
                </div>
              </a>
              <a href="#loop" className="dropdown-item" onClick={closeAllMenus}>
                <div className="dropdown-item-icon">
                  <Activity size={16} />
                </div>
                <div className="dropdown-item-text">
                  <span className="item-title">Six-Stage Defense Loop</span>
                  <span className="item-desc">Observe, Understand, Simulate, Predict, Defend, Learn</span>
                </div>
              </a>
              <a href="#architecture" className="dropdown-item" onClick={closeAllMenus}>
                <div className="dropdown-item-icon">
                  <Cpu size={16} />
                </div>
                <div className="dropdown-item-text">
                  <span className="item-title">System Architecture</span>
                  <span className="item-desc">FastAPI, BPF sensor & Postgres RLS</span>
                </div>
              </a>
            </div>
          </div>

          {/* Solutions Dropdown */}
          <div
            className={`nav-dropdown ${activeDropdown === 'solutions' ? 'open' : ''}`}
            onMouseEnter={() => setActiveDropdown('solutions')}
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <button
              type="button"
              className="nav-link-btn"
              onClick={() => toggleDropdown('solutions')}
              aria-expanded={activeDropdown === 'solutions'}
            >
              <span>Solutions</span>
              <ChevronDown size={14} className="chevron-icon" />
            </button>

            <div className="dropdown-panel">
              <a href="#provenance" className="dropdown-item" onClick={closeAllMenus}>
                <div className="dropdown-item-icon">
                  <Lock size={16} />
                </div>
                <div className="dropdown-item-text">
                  <span className="item-title">Zero Fake Telemetry</span>
                  <span className="item-desc">Verifiable OBSERVED & DERIVED provenance</span>
                </div>
              </a>
              <a href="#safety" className="dropdown-item" onClick={closeAllMenus}>
                <div className="dropdown-item-icon">
                  <Shield size={16} />
                </div>
                <div className="dropdown-item-text">
                  <span className="item-title">Autonomous Defense with 4-Eyes</span>
                  <span className="item-desc">Human-approved playbooks and TTL shuns</span>
                </div>
              </a>
            </div>
          </div>

          {/* Resources Dropdown */}
          <div
            className={`nav-dropdown ${activeDropdown === 'resources' ? 'open' : ''}`}
            onMouseEnter={() => setActiveDropdown('resources')}
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <button
              type="button"
              className="nav-link-btn"
              onClick={() => toggleDropdown('resources')}
              aria-expanded={activeDropdown === 'resources'}
            >
              <span>Resources</span>
              <ChevronDown size={14} className="chevron-icon" />
            </button>

            <div className="dropdown-panel">
              <a href="#specs" className="dropdown-item" onClick={closeAllMenus}>
                <div className="dropdown-item-icon">
                  <BookOpen size={16} />
                </div>
                <div className="dropdown-item-text">
                  <span className="item-title">Technical Specifications</span>
                  <span className="item-desc">REST API, WebSocket contracts & schemas</span>
                </div>
              </a>
              <a
                href="http://localhost:8000/docs"
                target="_blank"
                rel="noreferrer"
                className="dropdown-item"
                onClick={closeAllMenus}
              >
                <div className="dropdown-item-icon">
                  <FileCode size={16} />
                </div>
                <div className="dropdown-item-text">
                  <span className="item-title">Interactive OpenAPI Docs</span>
                  <span className="item-desc">Swagger UI at localhost:8000/docs</span>
                </div>
              </a>
            </div>
          </div>

          {/* Company Dropdown */}
          <div
            className={`nav-dropdown ${activeDropdown === 'company' ? 'open' : ''}`}
            onMouseEnter={() => setActiveDropdown('company')}
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <button
              type="button"
              className="nav-link-btn"
              onClick={() => toggleDropdown('company')}
              aria-expanded={activeDropdown === 'company'}
            >
              <span>Company</span>
              <ChevronDown size={14} className="chevron-icon" />
            </button>

            <div className="dropdown-panel">
              <a href="#team" className="dropdown-item" onClick={closeAllMenus}>
                <div className="dropdown-item-icon">
                  <Users size={16} />
                </div>
                <div className="dropdown-item-text">
                  <span className="item-title">Engineering Project</span>
                  <span className="item-desc">BTech CSE Major Project Architecture</span>
                </div>
              </a>
            </div>
          </div>
        </nav>

        {/* Right: GitHub & Launch CTA */}
        <div className="home-nav-actions">
          <a
            href="https://github.com/Krishnanegi09/CyberGuard-X"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-github-ghost"
            title="View Source on GitHub"
          >
            <Terminal size={14} />
            <span>GitHub</span>
          </a>

          <button
            type="button"
            className="btn-launch-console"
            onClick={onLaunchConsole}
          >
            <span>{isAuthenticated ? 'Open SOC Console' : 'Launch Console'}</span>
            <ArrowRight size={14} />
          </button>

          {/* Mobile Hamburger Toggle */}
          <button
            type="button"
            className="btn-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer">
          <a href="#twin" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>
            Cyber Digital Twin
          </a>
          <a href="#capabilities" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>
            Platform Capabilities
          </a>
          <a href="#loop" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>
            6-Stage Defense Loop
          </a>
          <a href="#provenance" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>
            Evidence Provenance
          </a>
          <a href="#architecture" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>
            Architecture Specs
          </a>
          <div className="mobile-actions">
            <button
              type="button"
              className="btn-launch-console w-full"
              onClick={() => {
                setMobileMenuOpen(false)
                onLaunchConsole()
              }}
            >
              <span>{isAuthenticated ? 'Open SOC Console' : 'Launch Console'}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
    </header>
  )
}

export default HomeNavbar
