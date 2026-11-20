import React from 'react'
import {
  Shield,
  Home,
  FileSearch,
  AlertTriangle,
  Server,
  Network,
  Box,
  GitBranch,
  Clock,
  Share2,
  FileText,
  GraduationCap,
  Building,
  ChevronDown,
  Radio,
  Search,
  PanelLeftClose,
  PanelLeft,
  Globe,
} from 'lucide-react'

export type NavItemKey =
  | 'home'
  | 'overview'
  | 'findings'
  | 'incidents'
  | 'assets'
  | 'twin'
  | 'simulations'
  | 'discovery'
  | 'nids'
  | 'playbooks'
  | 'jobs'
  | 'integrations'
  | 'reports'
  | 'learn'

interface SidebarProps {
  activeItem: NavItemKey
  onSelect: (item: NavItemKey) => void
  currentOrgName?: string
  currentEnv?: string
  onSwitchOrg?: () => void
  collapsed: boolean
  onToggleCollapse: () => void
  mobileOpen?: boolean
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeItem,
  onSelect,
  currentOrgName = 'Acme Corp · SOC Alpha',
  currentEnv = 'Production Operations',
  onSwitchOrg,
  collapsed,
  onToggleCollapse,
  mobileOpen = false,
}) => {
  return (
    <aside
      className={`cg-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}
      aria-label="Main Navigation"
    >
      {/* Brand Header & Collapse Toggle */}
      <div className="sidebar-brand">
        <div
          className="brand-logo-wrap"
          onClick={collapsed ? onToggleCollapse : undefined}
          title={collapsed ? 'Click to expand sidebar' : 'CYBERGUARD-X Platform'}
          style={{ cursor: collapsed ? 'pointer' : 'default' }}
          role={collapsed ? 'button' : undefined}
          tabIndex={collapsed ? 0 : undefined}
          onKeyDown={collapsed ? (e) => e.key === 'Enter' && onToggleCollapse() : undefined}
        >
          <Shield className="brand-logo-icon" size={19} />
        </div>
        {!collapsed && <span className="brand-title">CYBERGUARD-X</span>}

        <button
          type="button"
          className="btn-collapse-toggle"
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand Navigation Sidebar' : 'Collapse Navigation Sidebar'}
          aria-label={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* Navigation Sections */}
      <nav className="sidebar-nav">
        {/* OPERATE SECTION */}
        <div className="nav-group">
          {!collapsed && <div className="nav-group-title">Operate</div>}

          <button
            type="button"
            className={`nav-item ${activeItem === 'home' ? 'active' : ''}`}
            onClick={() => onSelect('home')}
            title="Home Platform Portal"
          >
            <Globe size={17} className="nav-icon" />
            {!collapsed && <span className="nav-label">Home Portal</span>}
          </button>

          <button
            type="button"
            className={`nav-item ${activeItem === 'overview' ? 'active' : ''}`}
            onClick={() => onSelect('overview')}
            title="Overview (Command Center)"
          >
            <Home size={17} className="nav-icon" />
            {!collapsed && <span className="nav-label">Overview</span>}
          </button>

          <button
            type="button"
            className={`nav-item ${activeItem === 'findings' ? 'active' : ''}`}
            onClick={() => onSelect('findings')}
            title="Findings (24 active)"
          >
            <FileSearch size={17} className="nav-icon" />
            {!collapsed ? (
              <>
                <span className="nav-label">Findings</span>
                <span className="nav-badge neutral">24</span>
              </>
            ) : (
              <span className="collapsed-badge-dot neutral" />
            )}
          </button>

          <button
            type="button"
            className={`nav-item ${activeItem === 'incidents' ? 'active' : ''}`}
            onClick={() => onSelect('incidents')}
            title="Incidents (3 critical)"
          >
            <AlertTriangle size={17} className="nav-icon" />
            {!collapsed ? (
              <>
                <span className="nav-label">Incidents</span>
                <span className="nav-badge crimson">3</span>
              </>
            ) : (
              <span className="collapsed-badge-dot crimson" />
            )}
          </button>

          <button
            type="button"
            className={`nav-item ${activeItem === 'assets' ? 'active' : ''}`}
            onClick={() => onSelect('assets')}
            title="Assets Inventory"
          >
            <Server size={17} className="nav-icon" />
            {!collapsed && <span className="nav-label">Assets</span>}
          </button>

          <button
            type="button"
            className={`nav-item ${activeItem === 'twin' ? 'active' : ''}`}
            onClick={() => onSelect('twin')}
            title="Network Digital Twin"
          >
            <Network size={17} className="nav-icon" />
            {!collapsed && <span className="nav-label">Digital Twin</span>}
          </button>

          <button
            type="button"
            className={`nav-item ${activeItem === 'simulations' ? 'active' : ''}`}
            onClick={() => onSelect('simulations')}
            title="What-If Simulations"
          >
            <Box size={17} className="nav-icon" />
            {!collapsed && <span className="nav-label">Simulations</span>}
          </button>

          <button
            type="button"
            className={`nav-item ${activeItem === 'discovery' ? 'active' : ''}`}
            onClick={() => onSelect('discovery')}
            title="Scopes & Scans"
          >
            <Search size={17} className="nav-icon" />
            {!collapsed && <span className="nav-label">Scopes & Scans</span>}
          </button>

          <button
            type="button"
            className={`nav-item ${activeItem === 'nids' ? 'active' : ''}`}
            onClick={() => onSelect('nids')}
            title="Wire NIDS Sensor"
          >
            <Radio size={17} className="nav-icon" />
            {!collapsed && <span className="nav-label">Wire NIDS</span>}
          </button>
        </div>

        {/* AUTOMATE SECTION */}
        <div className="nav-group">
          {!collapsed && <div className="nav-group-title">Automate</div>}

          <button
            type="button"
            className={`nav-item ${activeItem === 'playbooks' ? 'active' : ''}`}
            onClick={() => onSelect('playbooks')}
            title="Defensive Playbooks"
          >
            <GitBranch size={17} className="nav-icon" />
            {!collapsed && <span className="nav-label">Playbooks</span>}
          </button>

          <button
            type="button"
            className={`nav-item ${activeItem === 'jobs' ? 'active' : ''}`}
            onClick={() => onSelect('jobs')}
            title="Job Queue & Runs"
          >
            <Clock size={17} className="nav-icon" />
            {!collapsed && <span className="nav-label">Jobs & Runs</span>}
          </button>

          <button
            type="button"
            className={`nav-item ${activeItem === 'integrations' ? 'active' : ''}`}
            onClick={() => onSelect('integrations')}
            title="Security Integrations"
          >
            <Share2 size={17} className="nav-icon" />
            {!collapsed && <span className="nav-label">Integrations</span>}
          </button>
        </div>

        {/* INSIGHTS SECTION */}
        <div className="nav-group">
          {!collapsed && <div className="nav-group-title">Insights</div>}

          <button
            type="button"
            className={`nav-item ${activeItem === 'reports' ? 'active' : ''}`}
            onClick={() => onSelect('reports')}
            title="Security Reports & Metrics"
          >
            <FileText size={17} className="nav-icon" />
            {!collapsed && <span className="nav-label">Reports</span>}
          </button>

          <button
            type="button"
            className={`nav-item ${activeItem === 'learn' ? 'active' : ''}`}
            onClick={() => onSelect('learn')}
            title="Learn & Feedback Loop"
          >
            <GraduationCap size={17} className="nav-icon" />
            {!collapsed && <span className="nav-label">Learn</span>}
          </button>
        </div>
      </nav>

      {/* Bottom Organization Switcher */}
      <div className="sidebar-footer">
        <button
          type="button"
          className="org-switcher-button"
          onClick={onSwitchOrg}
          title={`Active Workspace: ${currentOrgName} (${currentEnv})`}
        >
          <div className="org-icon-wrap">
            <Building size={16} />
          </div>
          {!collapsed && (
            <div className="org-meta">
              <span className="org-name">{currentOrgName}</span>
              <span className="org-sub">{currentEnv}</span>
            </div>
          )}
          {!collapsed && <ChevronDown size={14} className="org-chevron" />}
        </button>
      </div>
    </aside>
  )
}
