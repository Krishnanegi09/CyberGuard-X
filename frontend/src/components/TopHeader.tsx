import React from 'react'
import {
  Search,
  Bell,
  ShieldAlert,
  LogOut,
  CheckCircle2,
  Sun,
  Moon,
  Menu,
} from 'lucide-react'

interface TopHeaderProps {
  onOpenCommandPalette: () => void
  userInitials?: string
  userEmail?: string
  onSignOut?: () => void
  onTriggerEmergencyStop?: () => void
  theme: 'dark' | 'light'
  onToggleTheme: () => void
  onToggleMobileSidebar?: () => void
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  onOpenCommandPalette,
  userInitials = 'KS',
  userEmail = 'operator@soc.alpha',
  onSignOut,
  onTriggerEmergencyStop,
  theme,
  onToggleTheme,
  onToggleMobileSidebar,
}) => {
  const [showProfileMenu, setShowProfileMenu] = React.useState(false)
  const [showNotifications, setShowNotifications] = React.useState(false)

  return (
    <header className="cg-topbar">
      {/* Left Area: Mobile hamburger toggle & Search Bar */}
      <div className="topbar-left-area">
        {onToggleMobileSidebar && (
          <button
            type="button"
            className="btn-mobile-menu"
            onClick={onToggleMobileSidebar}
            aria-label="Open Navigation"
          >
            <Menu size={18} />
          </button>
        )}

        {/* Search Input triggering Command Palette */}
        <div className="search-wrap" onClick={onOpenCommandPalette} role="button" tabIndex={0}>
          <Search size={15} className="search-icon" />
          <span className="search-placeholder">Search assets, findings, CVEs, or MITRE...</span>
          <kbd className="search-kbd">⌘ K</kbd>
        </div>
      </div>

      {/* Right Controls */}
      <div className="topbar-actions">
        {/* Authoritative Environment & Telemetry Status */}
        <div className="telemetry-badge-pill" title="Telemetry source: Verified Lab Replay Session & BPF Wire Sensor">
          <span className="telemetry-dot" />
          <span className="telemetry-label">LAB REPLAY TELEMETRY</span>
        </div>

        {/* Emergency Stop Button (Deliberate Guardrail) */}
        {onTriggerEmergencyStop && (
          <button
            type="button"
            className="action-btn-danger"
            onClick={onTriggerEmergencyStop}
            title="Emergency Kill Switch: Abort active actions & flush firewall shuns"
          >
            <ShieldAlert size={14} />
            <span className="btn-text-responsive">Kill Switch</span>
          </button>
        )}

        {/* Visual grouping separator */}
        <div className="topbar-separator" />

        {/* Theme Toggle (Dark / Light) */}
        <button
          type="button"
          className="icon-btn theme-toggle-btn"
          onClick={onToggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`}
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Notifications */}
        <div className="dropdown-anchor">
          <button
            type="button"
            className="icon-btn"
            onClick={() => setShowNotifications((prev) => !prev)}
            title="Notifications & Alerts"
            aria-label="Notifications"
          >
            <Bell size={16} />
            <span className="notif-badge-dot" />
          </button>

          {showNotifications && (
            <div className="popover-panel notif-popover">
              <div className="popover-header">
                <span className="popover-title">Active Security Notifications</span>
                <span className="popover-count">3 New</span>
              </div>
              <div className="notif-list">
                <div className="notif-item">
                  <div className="notif-indicator critical" />
                  <div className="notif-body">
                    <span className="notif-text">Vertical port scan detected on 10.0.0.12 (50+ ports).{/* cgx-allow: lab replay telemetry */}</span>
                    <span className="notif-time mono">2m ago · Heuristic T1046</span>
                  </div>
                </div>
                <div className="notif-item">
                  <div className="notif-indicator high" />
                  <div className="notif-body">
                    <span className="notif-text">Automated shun applied to 10.0.0.56 (TTL 15m).{/* cgx-allow: lab replay telemetry */}</span>
                    <span className="notif-time mono">8m ago · nftables/pf</span>
                  </div>
                </div>
                <div className="notif-item">
                  <div className="notif-indicator low" />
                  <div className="notif-body">
                    <span className="notif-text">Scope sweep completed for 10.0.0.0/24.{/* cgx-allow: lab replay telemetry */}</span>
                    <span className="notif-time mono">14m ago · 124 hosts live</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Avatar */}
        <div className="dropdown-anchor">
          <button
            type="button"
            className="avatar-btn"
            onClick={() => setShowProfileMenu((prev) => !prev)}
            title={`Signed in as ${userEmail}`}
            aria-label="User Profile"
          >
            <span className="avatar-text">{userInitials}</span>
          </button>

          {showProfileMenu && (
            <div className="popover-panel profile-popover">
              <div className="profile-header">
                <span className="profile-name">Security Operator</span>
                <span className="profile-email mono">{userEmail}</span>
                <span className="profile-role">
                  <CheckCircle2 size={12} className="role-icon" /> Role: SecOps Analyst (Tier-2)
                </span>
              </div>

              <div className="profile-divider" />

              {/* Theme Selector inside settings dropdown */}
              <div className="profile-theme-section">
                <span className="theme-section-label">Interface Theme</span>
                <div className="theme-toggle-row">
                  <button
                    type="button"
                    className={`theme-pill ${theme === 'dark' ? 'active' : ''}`}
                    onClick={() => onToggleTheme()}
                  >
                    <Moon size={13} />
                    <span>Dark</span>
                  </button>
                  <button
                    type="button"
                    className={`theme-pill ${theme === 'light' ? 'active' : ''}`}
                    onClick={() => onToggleTheme()}
                  >
                    <Sun size={13} />
                    <span>Light</span>
                  </button>
                </div>
              </div>

              <div className="profile-divider" />

              {onSignOut && (
                <button
                  type="button"
                  className="popover-item danger"
                  onClick={() => {
                    setShowProfileMenu(false)
                    onSignOut()
                  }}
                >
                  <LogOut size={14} />
                  <span>Sign Out Console</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
