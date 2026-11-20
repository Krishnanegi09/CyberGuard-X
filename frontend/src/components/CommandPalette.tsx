import React, { useState, useEffect } from 'react'
import {
  Search,
  Server,
  AlertTriangle,
  Network,
  Radio,
  Shield,
  ArrowRight,
  X,
  Building,
  type LucideIcon,
} from 'lucide-react'
import type { NavItemKey } from './Sidebar'
import type { Organization } from '../services/backendAuth'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  onNavigate: (tab: NavItemKey) => void
  organizations?: Organization[]
  selectedOrgId?: string
  onSelectOrg?: (org: Organization) => void
}

interface PaletteItem {
  id: string
  title: string
  category: 'Navigation' | 'Assets' | 'Findings' | 'Actions' | 'Workspaces'
  icon: LucideIcon
  action: () => void
  meta?: string
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  organizations = [],
  selectedOrgId,
  onSelectOrg,
}) => {
  const [query, setQuery] = useState('')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (isOpen) {
          onClose()
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const items: PaletteItem[] = [
    {
      id: 'nav-overview',
      title: 'Command Center Overview',
      category: 'Navigation',
      icon: Shield,
      action: () => {
        onNavigate('overview')
        onClose()
      },
      meta: 'Main Dashboard',
    },
    {
      id: 'nav-findings',
      title: 'Top Findings & Detections',
      category: 'Navigation',
      icon: AlertTriangle,
      action: () => {
        onNavigate('findings')
        onClose()
      },
      meta: '24 Active findings',
    },
    {
      id: 'nav-assets',
      title: 'Asset Inventory & Risk Index',
      category: 'Navigation',
      icon: Server,
      action: () => {
        onNavigate('assets')
        onClose()
      },
      meta: '124 Monitored hosts',
    },
    {
      id: 'nav-twin',
      title: 'Network Digital Twin Topology',
      category: 'Navigation',
      icon: Network,
      action: () => {
        onNavigate('twin')
        onClose()
      },
      meta: 'Attack Graph Simulator',
    },
    {
      id: 'nav-nids',
      title: 'Live Wire NIDS Sensor',
      category: 'Navigation',
      icon: Radio,
      action: () => {
        onNavigate('nids')
        onClose()
      },
      meta: 'Passive BPF Capture',
    },
    {
      id: 'nav-discovery',
      title: 'Scope Discovery & Reconnaissance',
      category: 'Navigation',
      icon: Search,
      action: () => {
        onNavigate('discovery')
        onClose()
      },
      meta: '10.0.0.0/24 Nmap Scanner', // cgx-allow: lab replay telemetry
    },
    {
      id: 'asset-10-0-0-12',
      title: 'Core App Server (10.0.0.12)', // cgx-allow: lab replay telemetry
      category: 'Assets',
      icon: Server,
      action: () => {
        onNavigate('assets')
        onClose()
      },
      meta: 'CRITICAL · 50+ Port scan target',
    },
    {
      id: 'cve-search',
      title: 'CVE-2024-38077 (CVSS 9.8)', // cgx-allow: lab replay telemetry
      category: 'Findings',
      icon: AlertTriangle,
      action: () => {
        onNavigate('findings')
        onClose()
      },
      meta: 'Remote Code Execution match',
    },
    ...organizations.map((org) => ({
      id: `org-${org.id}`,
      title: `Switch Workspace: ${org.name}`,
      category: 'Workspaces' as const,
      icon: Building,
      action: () => {
        onSelectOrg?.(org)
        onClose()
      },
      meta: org.id === selectedOrgId ? 'Active Workspace' : `ID: ${org.slug}`,
    })),
  ]

  const filtered = items.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase()) ||
      (item.meta && item.meta.toLowerCase().includes(query.toLowerCase()))
  )

  return (
    <div className="palette-backdrop" onClick={onClose}>
      <div className="palette-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Search Input */}
        <div className="palette-search-bar">
          <Search size={18} className="palette-icon" />
          <input
            type="text"
            className="palette-input"
            placeholder="Search assets, findings, CVEs, or navigation..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <button type="button" className="btn-close-palette" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Results List */}
        <div className="palette-results">
          {filtered.length === 0 ? (
            <div className="palette-empty">No results found for "{query}"</div>
          ) : (
            filtered.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.id}
                  className="palette-item"
                  onClick={item.action}
                  role="button"
                  tabIndex={0}
                >
                  <div className="item-left">
                    <Icon size={16} className="item-icon" />
                    <span className="item-title">{item.title}</span>
                  </div>
                  <div className="item-right">
                    {item.meta && <span className="item-meta">{item.meta}</span>}
                    <span className="item-category">{item.category}</span>
                    <ArrowRight size={13} className="item-arrow" />
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Palette Footer */}
        <div className="palette-footer">
          <span className="footer-hint"><kbd>↑</kbd> <kbd>↓</kbd> Navigate</span>
          <span className="footer-hint"><kbd>↵</kbd> Select</span>
          <span className="footer-hint"><kbd>esc</kbd> Dismiss</span>
        </div>
      </div>
    </div>
  )
}
