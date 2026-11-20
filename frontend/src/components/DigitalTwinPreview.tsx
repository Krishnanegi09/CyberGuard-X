import React, { useState } from 'react'
import { ArrowUpRight, X, Shield, AlertTriangle } from 'lucide-react'

interface DigitalTwinPreviewProps {
  onViewFullTwin: () => void
  nodes?: TopologyNode[]
}

interface TopologyNode {
  id: string
  name: string
  ip: string
  os: string
  type: 'workstation' | 'switch' | 'server_compromised' | 'database' | 'firewall' | 'server'
  x: number
  y: number
  status: 'normal' | 'compromised' | 'protected'
  zone: 'DMZ' | 'Internal' | 'Crown Jewel'
  services: string[]
  findings: string[]
  connectedTo: string[]
}

const NODES: TopologyNode[] = [
  {
    id: 'node-ws',
    name: 'Operator Workstation',
    ip: '10.0.0.44', // cgx-allow: lab replay telemetry
    os: 'macOS Sonoma 14.6',
    type: 'workstation',
    x: 80,
    y: 130,
    status: 'normal',
    zone: 'Internal',
    services: ['OpenSSH 9.4'],
    findings: [],
    connectedTo: ['Access Switch 01 (10.0.0.1)'], // cgx-allow: lab replay telemetry
  },
  {
    id: 'node-switch',
    name: 'Access Switch 01',
    ip: '10.0.0.1', // cgx-allow: lab replay telemetry
    os: 'Cisco IOS-XE 17.9',
    type: 'switch',
    x: 160,
    y: 190,
    status: 'normal',
    zone: 'Internal',
    services: ['SNMP v3', 'SSH v2'],
    findings: [],
    connectedTo: ['Operator Workstation (10.0.0.44)', 'Core App Server (10.0.0.12)'], // cgx-allow: lab replay telemetry
  },
  {
    id: 'node-central',
    name: 'Core Application Server',
    ip: '10.0.0.12', // cgx-allow: lab replay telemetry
    os: 'Ubuntu Linux 24.04 LTS',
    type: 'server_compromised',
    x: 245,
    y: 135,
    status: 'compromised',
    zone: 'DMZ',
    services: ['Nginx 1.26', 'Node.js Express', 'FTP vsftpd 2.3.4'],
    findings: ['Port scan (vertical) T1046', 'Exposed FTP 21 T1133'],
    connectedTo: ['Access Switch 01 (10.0.0.1)', 'Primary SQL Cluster (10.0.0.5)', 'Border Firewall (10.0.0.254)'], // cgx-allow: lab replay telemetry
  },
  {
    id: 'node-db',
    name: 'Primary SQL Cluster',
    ip: '10.0.0.5', // cgx-allow: lab replay telemetry
    os: 'Debian 12 Bookworm',
    type: 'database',
    x: 350,
    y: 75,
    status: 'protected',
    zone: 'Crown Jewel',
    services: ['PostgreSQL 17.2 (Port 5432)', 'pg_bouncer'],
    findings: ['Target of Simulated Attack Trajectory #1'],
    connectedTo: ['Core Application Server (10.0.0.12)', 'Auth Gateway (10.0.0.18)'], // cgx-allow: lab replay telemetry
  },
  {
    id: 'node-fw',
    name: 'Border Firewall',
    ip: '10.0.0.254', // cgx-allow: lab replay telemetry
    os: 'FreeBSD 14 / pfSense',
    type: 'firewall',
    x: 350,
    y: 190,
    status: 'normal',
    zone: 'DMZ',
    services: ['pf Packet Filter', 'Unbound DNS'],
    findings: [],
    connectedTo: ['Core Application Server (10.0.0.12)', 'Auth Gateway (10.0.0.18)'], // cgx-allow: lab replay telemetry
  },
  {
    id: 'node-srv2',
    name: 'Auth Gateway',
    ip: '10.0.0.18', // cgx-allow: lab replay telemetry
    os: 'Alpine Linux 3.20',
    type: 'server',
    x: 420,
    y: 130,
    status: 'normal',
    zone: 'Internal',
    services: ['OpenSSH 9.7 (Port 22)', 'Redis 7.2'],
    findings: ['Brute force (SSH) T1110'],
    connectedTo: ['Border Firewall (10.0.0.254)', 'Primary SQL Cluster (10.0.0.5)'], // cgx-allow: lab replay telemetry
  },
]

export const DigitalTwinPreview: React.FC<DigitalTwinPreviewProps> = ({
  onViewFullTwin,
  nodes = [],
}) => {
  const [hoveredNode, setHoveredNode] = useState<TopologyNode | null>(null)
  const [inspectedNode, setInspectedNode] = useState<TopologyNode | null>(null)

  return (
    <div className="cg-card digital-twin-card">
      <div className="card-header">
        <div>
          <h3 className="card-title">Network Digital Twin</h3>
          <p className="card-subtitle">Live topology from observed telemetry</p>
        </div>
        <button
          type="button"
          className="btn-card-action"
          onClick={onViewFullTwin}
          title="Open full interactive digital twin & attack-path simulation"
        >
          <span>View Twin</span>
          <ArrowUpRight size={14} />
        </button>
      </div>

      <div className="twin-canvas-wrap">
        {nodes.length === 0 ? (
          <div
            className="twin-empty-state"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              minHeight: '220px',
              gap: '10px',
              color: 'var(--text-muted)',
              padding: '24px',
            }}
          >
            <Shield size={34} style={{ color: 'var(--accent-cyan)', opacity: 0.7 }} />
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
              Digital Twin Topology Idle
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '300px' }}>
              Discovered hosts and active services will automatically map into this interactive digital twin model.
            </span>
          </div>
        ) : (
          <>
          <svg viewBox="0 0 500 240" className="twin-svg">
          <defs>
            {/* Red Compromised Threat Aura */}
            <radialGradient id="compromisedAura" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#ef4444" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </radialGradient>

            {/* Glowing Laser Red Edge */}
            <linearGradient id="laserEdge" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff4d6a" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>

            {/* Isometric Grid Floor pattern */}
            <pattern id="isoGrid" width="40" height="20" patternUnits="userSpaceOnUse">
              <path
                d="M 20 0 L 40 10 L 20 20 L 0 10 Z"
                fill="none"
                stroke="var(--border-subtle)"
                strokeWidth="0.6"
              />
            </pattern>
          </defs>

          {/* Isometric subtle ground plane */}
          <rect x="0" y="0" width="500" height="240" fill="url(#isoGrid)" />

          {/* Connection Lines between nodes */}
          <g stroke="var(--border-default)" strokeWidth="1.2">
            {/* WS -> Switch (Observed) */}
            <line x1={80} y1={130} x2={160} y2={190} />
            {/* Switch -> Central Server (Observed) */}
            <line x1={160} y1={190} x2={245} y2={135} />
            {/* Firewall -> Server 2 (Observed) */}
            <line x1={350} y1={190} x2={420} y2={130} />
            {/* DB -> Server 2 (Observed) */}
            <line x1={350} y1={75} x2={420} y2={130} />
          </g>

          {/* SIMULATED ATTACK PATH: Central Server -> DB Crown Jewel (Red Dashed Laser) */}
          <line
            x1={245}
            y1={135}
            x2={350}
            y2={75}
            stroke="url(#laserEdge)"
            strokeWidth="2"
            strokeDasharray="4 3"
            className="anim-threat-beam"
          />

          {/* Lateral probe line: Central Server -> Firewall */}
          <line
            x1={245}
            y1={135}
            x2={350}
            y2={190}
            stroke="url(#laserEdge)"
            strokeWidth="1.4"
            strokeDasharray="4 3"
          />

          {/* Threat Pulse Particle along path */}
          <circle cx="280" cy="115" r="3" fill="#ff3856" className="anim-pulse-particle" />

          {/* Central Compromised Server Aura */}
          <circle cx="245" cy="135" r="40" fill="url(#compromisedAura)" className="pulsing-aura" />
          <circle
            cx="245"
            cy="135"
            r="26"
            fill="rgba(239, 68, 68, 0.12)"
            stroke="#ef4444"
            strokeWidth="1"
            strokeDasharray="3 3"
          />

          {/* Render Isometric Nodes */}
          {NODES.map((node) => {
            const isCompromised = node.status === 'compromised'
            const isHovered = hoveredNode?.id === node.id

            return (
              <g
                key={node.id}
                className="twin-node-group"
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => setInspectedNode(node)}
                style={{ cursor: 'pointer' }}
                tabIndex={0}
                aria-label={`Node: ${node.name}`}
              >
                {/* Node Ground Shadow */}
                <ellipse
                  cx={node.x}
                  cy={node.y + 14}
                  rx="15"
                  ry="7"
                  fill="rgba(0, 0, 0, 0.3)"
                />

                {/* Node Icon Graphic */}
                {node.type === 'workstation' && (
                  <g transform={`translate(${node.x - 14}, ${node.y - 12})`}>
                    <rect x="2" y="2" width="24" height="17" rx="3" fill="var(--bg-surface-elevated)" stroke="var(--border-default)" strokeWidth="1.2" />
                    <line x1="8" y1="23" x2="20" y2="23" stroke="var(--border-default)" strokeWidth="1.5" />
                    <line x1="14" y1="19" x2="14" y2="23" stroke="var(--border-default)" strokeWidth="1.5" />
                  </g>
                )}

                {node.type === 'switch' && (
                  <g transform={`translate(${node.x - 14}, ${node.y - 10})`}>
                    <rect x="0" y="4" width="28" height="12" rx="2" fill="var(--bg-surface-elevated)" stroke="var(--border-default)" strokeWidth="1.2" />
                    <circle cx="6" cy="10" r="1.5" fill="#10b981" />
                    <circle cx="12" cy="10" r="1.5" fill="#10b981" />
                    <circle cx="18" cy="10" r="1.5" fill="var(--accent-cyan)" />
                    <circle cx="24" cy="10" r="1.5" fill="var(--text-muted)" />
                  </g>
                )}

                {node.type === 'server_compromised' && (
                  <g transform={`translate(${node.x - 16}, ${node.y - 16})`}>
                    <path
                      d="M 16 0 L 32 8 L 16 16 L 0 8 Z"
                      fill="#ef4444"
                      stroke="#ff6b81"
                      strokeWidth="1.2"
                    />
                    <path
                      d="M 0 8 L 16 16 L 16 30 L 0 22 Z"
                      fill="#991b1b"
                      stroke="#ff6b81"
                      strokeWidth="1.2"
                    />
                    <path
                      d="M 32 8 L 16 16 L 16 30 L 32 22 Z"
                      fill="#b91c1c"
                      stroke="#ff6b81"
                      strokeWidth="1.2"
                    />
                  </g>
                )}

                {node.type === 'database' && (
                  <g transform={`translate(${node.x - 12}, ${node.y - 14})`}>
                    <ellipse cx="12" cy="6" rx="12" ry="5" fill="#334155" stroke="var(--text-secondary)" strokeWidth="1.2" />
                    <path d="M 0 6 L 0 18 A 12 5 0 0 0 24 18 L 24 6 Z" fill="var(--bg-surface-elevated)" stroke="var(--text-secondary)" strokeWidth="1.2" />
                    <ellipse cx="12" cy="18" rx="12" ry="5" fill="none" stroke="var(--text-secondary)" strokeWidth="1.2" />
                  </g>
                )}

                {node.type === 'firewall' && (
                  <g transform={`translate(${node.x - 12}, ${node.y - 12})`}>
                    <rect x="0" y="0" width="24" height="20" rx="3" fill="var(--bg-surface-elevated)" stroke="var(--border-default)" strokeWidth="1.2" />
                    <line x1="0" y1="7" x2="24" y2="7" stroke="var(--border-default)" strokeWidth="1" />
                    <line x1="0" y1="13" x2="24" y2="13" stroke="var(--border-default)" strokeWidth="1" />
                  </g>
                )}

                {node.type === 'server' && (
                  <g transform={`translate(${node.x - 14}, ${node.y - 14})`}>
                    <rect x="0" y="0" width="28" height="22" rx="3" fill="var(--bg-surface-elevated)" stroke="var(--border-default)" strokeWidth="1.2" />
                    <circle cx="6" cy="6" r="1.5" fill="#10b981" />
                    <line x1="12" y1="6" x2="22" y2="6" stroke="var(--border-default)" strokeWidth="1.5" />
                    <line x1="6" y1="12" x2="22" y2="12" stroke="var(--border-subtle)" strokeWidth="1" />
                  </g>
                )}

                {/* Compromised Alert Pin */}
                {isCompromised && (
                  <circle cx={node.x + 13} cy={node.y - 10} r="4" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
                )}

                {/* Hover outline */}
                {isHovered && (
                  <ellipse cx={node.x} cy={node.y} rx="22" ry="18" fill="none" stroke="var(--accent-cyan)" strokeWidth="1.5" />
                )}
              </g>
            )
          })}
        </svg>

        {/* Node Hover Tooltip */}
        {hoveredNode && !inspectedNode && (
          <div
            className="twin-node-tooltip"
            style={{
              left: `${(hoveredNode.x / 500) * 100}%`,
              top: `${(hoveredNode.y / 240) * 100}%`,
            }}
          >
            <div className="tooltip-node-name">{hoveredNode.name}</div>
            <div className="tooltip-node-ip mono">{hoveredNode.ip}</div>
            <div className="tooltip-node-tags">
              <span className={`tag-zone ${hoveredNode.zone.toLowerCase().replace(' ', '-')}`}>
                {hoveredNode.zone}
              </span>
              <span className={`tag-status ${hoveredNode.status}`}>
                {hoveredNode.status.toUpperCase()}
              </span>
            </div>
          </div>
        )}

        {/* Compact Semantics Legend */}
        <div className="twin-compact-legend">
          <div className="legend-item">
            <span className="legend-line solid" />
            <span>Observed Link</span>
          </div>
          <div className="legend-item">
            <span className="legend-line dashed red" />
            <span>Simulated Attack Path</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot-comp" />
            <span>Choke Point</span>
          </div>
        </div>
        </>
        )}
      </div>

      {/* Contextual Asset Inspector Modal on Node Click */}
      {inspectedNode && (
        <div className="inspector-backdrop" onClick={() => setInspectedNode(null)}>
          <div className="inspector-card" onClick={(e) => e.stopPropagation()}>
            <div className="inspector-header">
              <div className="inspector-title-group">
                <Shield size={16} className="text-cyan" />
                <h4 className="inspector-title">{inspectedNode.name}</h4>
              </div>
              <button
                type="button"
                className="btn-close-sm"
                onClick={() => setInspectedNode(null)}
              >
                <X size={15} />
              </button>
            </div>

            <div className="inspector-body">
              <div className="inspector-row">
                <span className="row-label">IP Address:</span>
                <span className="row-val mono">{inspectedNode.ip}</span>
              </div>
              <div className="inspector-row">
                <span className="row-label">Operating System:</span>
                <span className="row-val">{inspectedNode.os}</span>
              </div>
              <div className="inspector-row">
                <span className="row-label">Trust Zone:</span>
                <span className={`tag-zone ${inspectedNode.zone.toLowerCase().replace(' ', '-')}`}>
                  {inspectedNode.zone}
                </span>
              </div>
              <div className="inspector-row">
                <span className="row-label">Discovered Services:</span>
                <span className="row-val mono">{inspectedNode.services.join(', ')}</span>
              </div>

              {inspectedNode.findings.length > 0 && (
                <div className="inspector-findings">
                  <span className="row-label text-crimson">
                    <AlertTriangle size={13} /> Active Findings:
                  </span>
                  <ul className="findings-ul">
                    {inspectedNode.findings.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="inspector-row">
                <span className="row-label">Observed Neighbors:</span>
                <span className="row-val">{inspectedNode.connectedTo.join(' · ')}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
