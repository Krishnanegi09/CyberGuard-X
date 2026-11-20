import { useState, useEffect, useCallback } from 'react'
import { Sidebar, type NavItemKey } from './components/Sidebar'
import { TopHeader } from './components/TopHeader'
import { OverviewView } from './views/OverviewView'
import { FindingsView } from './views/FindingsView'
import { AssetsView } from './views/AssetsView'
import { DigitalTwinView } from './views/DigitalTwinView'
import { SimulationsView } from './views/SimulationsView'
import { IncidentsView } from './views/IncidentsView'
import NetworkDiscovery from './NetworkDiscovery'
import NIDSMonitor from './NIDSMonitor'
import { PlaybooksView } from './views/PlaybooksView'
import { JobsView } from './views/JobsView'
import { IntegrationsView } from './views/IntegrationsView'
import { ReportsView } from './views/ReportsView'
import { LearnView } from './views/LearnView'
import { EvidenceDrawer, type FindingDetail } from './components/EvidenceDrawer'
import { CommandPalette } from './components/CommandPalette'
import { RunDetectionModal } from './components/RunDetectionModal'
import { EmergencyStopModal } from './components/EmergencyStopModal'
import AuthScreen from './AuthScreen'
import HomePage from './HomePage'
import { useAuth } from './context/useAuth'
import {
  getOrganizations,
  type Organization,
} from './services/backendAuth'
import './App.css'

export default function App() {
  const {
    firebaseUser,
    backendUser,
    loading,
    signOutUser,
  } = useAuth()

  // Theme State ('dark' | 'light' with localStorage persistence)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('cg-theme') as 'dark' | 'light') || 'dark'
  })

  // Collapsible Sidebar State with localStorage and responsive auto-collapse
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('cgx_sidebar_collapsed')
    if (saved !== null) return saved === 'true'
    return typeof window !== 'undefined' && window.innerWidth < 1200
  })
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  // Responsive auto-collapse on smaller viewports
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1200) {
        setSidebarCollapsed(true)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleToggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('cgx_sidebar_collapsed', String(next))
      return next
    })
  }

  // Navigation & Modal State
  const [activeNav, setActiveNav] = useState<NavItemKey>('overview')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [selectedFinding, setSelectedFinding] = useState<FindingDetail | null>(null)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [isRunDetectionOpen, setIsRunDetectionOpen] = useState(false)
  const [isEmergencyStopOpen, setIsEmergencyStopOpen] = useState(false)

  // Organizations State
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [orgs, setOrgs] = useState<Organization[]>([])

  // Update Theme attribute on HTML element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('cg-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  const getIdToken = useCallback(async () => {
    if (!firebaseUser) return ''
    return firebaseUser.getIdToken()
  }, [firebaseUser])

  // Fetch Orgs if authenticated and synchronize selection with localStorage
  useEffect(() => {
    if (!firebaseUser) return
    let active = true
    firebaseUser
      .getIdToken()
      .then((token) => getOrganizations(token))
      .then((data) => {
        if (!active) return
        setOrgs(data)
        if (data.length > 0) {
          const savedOrgId = localStorage.getItem('cgx_selected_org_id')
          const found = data.find((o) => o.id === savedOrgId)
          setSelectedOrg(found || data[0])
        }
      })
      .catch((err) => {
        console.error('Failed to load organizations', err)
      })
    return () => {
      active = false
    }
  }, [firebaseUser])

  useEffect(() => {
    if (selectedOrg?.id) {
      localStorage.setItem('cgx_selected_org_id', selectedOrg.id)
    }
  }, [selectedOrg])

  // Listen for ⌘ K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsCommandPaletteOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Execute scan handler
  const handleExecuteScan = async () => {
    await new Promise((resolve) => setTimeout(resolve, 800))
  }

  // Emergency stop handler
  const handleConfirmStop = async () => {
    await new Promise((resolve) => setTimeout(resolve, 600))
    alert('EMERGENCY HALT EXECUTED: All defense jobs aborted. Dynamic firewall shuns flushed.')
  }

  const userEmail = firebaseUser?.email || backendUser?.email || 'operator@soc.alpha'
  const userInitials = userEmail.slice(0, 2).toUpperCase()
  const orgName = selectedOrg?.name || 'Acme Corp'
  const orgEnv = 'Production • SOC'

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'var(--bg-canvas, #090d16)',
          color: 'var(--text-primary, #f0f6fc)',
          fontFamily: 'var(--font-sans, sans-serif)',
          gap: '16px',
        }}
      >
        <div className="status-dot-pulse" style={{ width: '16px', height: '16px' }} />
        <span style={{ fontSize: '13px', letterSpacing: '0.08em', color: 'var(--accent-cyan, #00f0ff)' }}>
          INITIALIZING CYBERGUARD-X OPERATOR SESSION...
        </span>
      </div>
    )
  }

  if (!firebaseUser) {
    if (showAuthModal) {
      return <AuthScreen onBackToHome={() => setShowAuthModal(false)} />
    }
    return (
      <HomePage
        onLaunchConsole={() => setShowAuthModal(true)}
        isAuthenticated={false}
      />
    )
  }

  return (
    <div className={`cg-app-layout ${theme}-mode`}>
      {/* 1. Left Navigation Sidebar (Collapsible) */}
      <Sidebar
        activeItem={activeNav}
        onSelect={(item) => {
          setActiveNav(item)
          setMobileSidebarOpen(false)
        }}
        currentOrgName={orgName}
        currentEnv={orgEnv}
        onSwitchOrg={() => setIsCommandPaletteOpen(true)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        mobileOpen={mobileSidebarOpen}
      />

      {/* 2. Main Content Frame */}
      <div className="cg-main-frame">
        {/* Top Header Bar with Theme Switcher & Kill Switch */}
        <TopHeader
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          userInitials={userInitials}
          userEmail={userEmail}
          onSignOut={signOutUser}
          onTriggerEmergencyStop={() => setIsEmergencyStopOpen(true)}
          theme={theme}
          onToggleTheme={toggleTheme}
          onToggleMobileSidebar={() => setMobileSidebarOpen((prev) => !prev)}
        />

        {/* View Switcher */}
        {activeNav === 'home' && (
          <div className="view-container" style={{ padding: 0 }}>
            <HomePage
              onLaunchConsole={() => setActiveNav('overview')}
              isAuthenticated={true}
            />
          </div>
        )}

        {activeNav === 'overview' && (
          <OverviewView
            onRunDetection={() => setIsRunDetectionOpen(true)}
            onViewTwin={() => setActiveNav('twin')}
            onViewAllFindings={() => setActiveNav('findings')}
            onSelectFinding={(f) => setSelectedFinding(f)}
            onSelectRiskCategory={() => setActiveNav('assets')}
            onViewLiveActivity={() => setActiveNav('nids')}
            organizationId={selectedOrg?.id || ''}
            getIdToken={getIdToken}
          />
        )}

        {activeNav === 'findings' && (
          <FindingsView
            onSelectFinding={(f) => setSelectedFinding(f)}
            organizationId={selectedOrg?.id || ''}
            getIdToken={getIdToken}
          />
        )}

        {activeNav === 'assets' && (
          <AssetsView
            organizationId={selectedOrg?.id || ''}
            getIdToken={getIdToken}
          />
        )}

        {activeNav === 'twin' && (
          <DigitalTwinView
            organizationId={selectedOrg?.id || ''}
            getIdToken={getIdToken}
          />
        )}

        {activeNav === 'simulations' && <SimulationsView />}

        {activeNav === 'incidents' && <IncidentsView />}

        {activeNav === 'discovery' && (
          <div className="view-container">
            <NetworkDiscovery
              organizationId={selectedOrg?.id || ''}
              getIdToken={getIdToken}
            />
          </div>
        )}

        {activeNav === 'nids' && (
          <div className="view-container">
            <NIDSMonitor
              organizationId={selectedOrg?.id || ''}
              scopeId=""
              getIdToken={getIdToken}
            />
          </div>
        )}

        {activeNav === 'playbooks' && <PlaybooksView />}

        {activeNav === 'jobs' && (
          <JobsView
            organizationId={selectedOrg?.id || ''}
            getIdToken={getIdToken}
          />
        )}

        {activeNav === 'integrations' && <IntegrationsView />}

        {activeNav === 'reports' && <ReportsView />}

        {activeNav === 'learn' && <LearnView />}
      </div>

      {/* 3. Interactive Modals & Drawers */}
      <EvidenceDrawer
        finding={selectedFinding}
        onClose={() => setSelectedFinding(null)}
        onAcknowledge={(id) => {
          alert(`Finding ${id} marked as ACKNOWLEDGED.`)
          setSelectedFinding(null)
        }}
        onContain={(_id, target) => {
          alert(`Defense Shun enqueued for target ${target} (TTL: 15 minutes).`)
          setSelectedFinding(null)
        }}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={(tab) => setActiveNav(tab)}
        organizations={orgs}
        selectedOrgId={selectedOrg?.id}
        onSelectOrg={(org) => setSelectedOrg(org)}
      />

      <RunDetectionModal
        isOpen={isRunDetectionOpen}
        onClose={() => setIsRunDetectionOpen(false)}
        onExecuteScan={handleExecuteScan}
      />

      <EmergencyStopModal
        isOpen={isEmergencyStopOpen}
        onClose={() => setIsEmergencyStopOpen(false)}
        onConfirmStop={handleConfirmStop}
      />
    </div>
  )
}
