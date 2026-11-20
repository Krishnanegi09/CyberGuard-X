import React, { useState } from 'react'
import {
  RefreshCw,
  AlertTriangle,
  Shield,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Lock,
  ChevronRight,
  X,
} from 'lucide-react'

interface AttackPathStep {
  nodeId: string
  name: string
  ip: string
  zone: string
  action: string
  vulnerability: string
}

interface AttackTrajectory {
  id: number
  title: string
  score: number // 0-100
  likelihood: 'CRITICAL' | 'HIGH' | 'MEDIUM'
  chokePointNodeId: string
  chokePointName: string
  mitigation: string
  steps: AttackPathStep[]
}

interface TwinNode {
  id: string
  label: string
  hostname: string
  ip: string
  zone: 'dmz' | 'internal' | 'crown' | 'external'
  type: 'server' | 'database' | 'workstation' | 'firewall' | 'attacker'
  status: 'compromised' | 'protected' | 'normal' | 'source'
  ports: number[]
  services: string[]
  findings: string[]
  x: number
  y: number
}

const ATTACK_TRAJECTORIES: AttackTrajectory[] = [
  {
    id: 1,
    title: 'External Ingress ➔ Core App Server ➔ SQL Crown Jewel',
    score: 88,
    likelihood: 'CRITICAL',
    chokePointNodeId: 'node-core',
    chokePointName: 'Core App Server (10.0.0.12)', // cgx-allow: lab replay telemetry
    mitigation: 'Isolate DMZ Port 21 (vsftpd) and apply dynamic firewall shun on ingress IP.',
    steps: [
      {
        nodeId: 'node-ext',
        name: 'Lab Adversary Node',
        ip: '192.168.1.105', // cgx-allow: lab replay telemetry
        zone: 'External Lab Subnet',
        action: 'Vertical SYN Reconnaissance on 50+ ports',
        vulnerability: 'MITRE T1046 (Network Service Discovery)',
      },
      {
        nodeId: 'node-core',
        name: 'Core App Server',
        ip: '10.0.0.12', // cgx-allow: lab replay telemetry
        zone: 'DMZ Perimeter (10.0.0.0/28)', // cgx-allow: lab replay telemetry
        action: 'Exploit unencrypted FTP daemon & unpatched RPC',
        vulnerability: 'CVE-2011-2523 / MITRE T1133', // cgx-allow: lab replay telemetry
      },
      {
        nodeId: 'node-db',
        name: 'Primary SQL Database',
        ip: '10.0.0.35', // cgx-allow: lab replay telemetry
        zone: 'Crown Jewels (10.0.0.32/29)', // cgx-allow: lab replay telemetry
        action: 'Direct lateral reachability across permissive DMZ rule',
        vulnerability: 'MITRE T1005 (Data from Local System)',
      },
    ],
  },
  {
    id: 2,
    title: 'Phished Workstation ➔ Auth Gateway ➔ SQL Cluster',
    score: 64,
    likelihood: 'HIGH',
    chokePointNodeId: 'node-auth',
    chokePointName: 'Auth Gateway (10.0.0.18)', // cgx-allow: lab replay telemetry
    mitigation: 'Enforce MFA challenge & rate-limit SSH connections on port 22.',
    steps: [
      {
        nodeId: 'node-ws',
        name: 'Operator Workstation',
        ip: '10.0.0.20', // cgx-allow: lab replay telemetry
        zone: 'Internal Trust (10.0.0.16/28)', // cgx-allow: lab replay telemetry
        action: 'Initial compromise via malicious payload execution',
        vulnerability: 'MITRE T1204 (User Execution)',
      },
      {
        nodeId: 'node-auth',
        name: 'Auth Gateway',
        ip: '10.0.0.18', // cgx-allow: lab replay telemetry
        zone: 'Internal Trust (10.0.0.16/28)', // cgx-allow: lab replay telemetry
        action: 'High-frequency brute-force authentication',
        vulnerability: 'MITRE T1110 (Brute Force)',
      },
      {
        nodeId: 'node-db',
        name: 'Primary SQL Database',
        ip: '10.0.0.35', // cgx-allow: lab replay telemetry
        zone: 'Crown Jewels (10.0.0.32/29)', // cgx-allow: lab replay telemetry
        action: 'Database administrative access via compromised token',
        vulnerability: 'MITRE T1078 (Valid Accounts)',
      },
    ],
  },
]

const TWIN_NODES: TwinNode[] = [
  {
    id: 'node-ext',
    label: 'Lab Adversary',
    hostname: 'adversary-node.lab',
    ip: '192.168.1.105', // cgx-allow: lab replay telemetry
    zone: 'external',
    type: 'attacker',
    status: 'source',
    ports: [54101, 54102],
    services: ['Metasploit Pro', 'Nmap 7.94'],
    findings: ['Active Reconnaissance Source'],
    x: 75,
    y: 180,
  },
  {
    id: 'node-core',
    label: 'Core App Server',
    hostname: 'srv-app-core.sec.local',
    ip: '10.0.0.12', // cgx-allow: lab replay telemetry
    zone: 'dmz',
    type: 'server',
    status: 'compromised',
    ports: [21, 22, 80, 443],
    services: ['Nginx 1.26', 'Node.js Express', 'vsftpd 2.3.4'],
    findings: ['Port scan (vertical) T1046', 'Exposed FTP 21 T1133'],
    x: 240,
    y: 180,
  },
  {
    id: 'node-ws',
    label: 'Operator Station',
    hostname: 'operator-ws.internal',
    ip: '10.0.0.20', // cgx-allow: lab replay telemetry
    zone: 'internal',
    type: 'workstation',
    status: 'normal',
    ports: [22],
    services: ['macOS Sonoma 14.6', 'OpenSSH 9.4'],
    findings: [],
    x: 430,
    y: 110,
  },
  {
    id: 'node-auth',
    label: 'Auth Gateway',
    hostname: 'auth-gw.internal.local',
    ip: '10.0.0.18', // cgx-allow: lab replay telemetry
    zone: 'internal',
    type: 'server',
    status: 'normal',
    ports: [22, 6379],
    services: ['Alpine Linux 3.20', 'OpenSSH 9.7', 'Redis 7.2'],
    findings: ['Brute force (SSH) T1110'],
    x: 580,
    y: 110,
  },
  {
    id: 'node-db',
    label: 'Primary SQL Cluster',
    hostname: 'db-primary.crown.local',
    ip: '10.0.0.35', // cgx-allow: lab replay telemetry
    zone: 'crown',
    type: 'database',
    status: 'protected',
    ports: [5432, 22],
    services: ['PostgreSQL 17.2', 'pg_bouncer', 'OpenSSH 9.2'],
    findings: ['High Value Target (Crown Jewel)'],
    x: 510,
    y: 285,
  },
]

export const DigitalTwinView: React.FC = () => {
  const [selectedTrajectoryId, setSelectedTrajectoryId] = useState<number>(1)
  const [activeZoneFilter, setActiveZoneFilter] = useState<'ALL' | 'DMZ' | 'INTERNAL' | 'CROWN'>('ALL')
  const [inspectedNode, setInspectedNode] = useState<TwinNode | null>(null)
  const [zoomLevel, setZoomLevel] = useState<number>(1)
  const [isRebuilding, setIsRebuilding] = useState<boolean>(false)

  const activeTrajectory =
    ATTACK_TRAJECTORIES.find((t) => t.id === selectedTrajectoryId) || ATTACK_TRAJECTORIES[0]

  const handleRebuildTwin = () => {
    setIsRebuilding(true)
    setTimeout(() => {
      setIsRebuilding(false)
    }, 900)
  }

  // Determine if a link or node is part of the currently active attack trajectory
  const isNodeInActiveTrajectory = (nodeId: string) => {
    return activeTrajectory.steps.some((s) => s.nodeId === nodeId)
  }

  // Zone filter matcher for isolating specific trust boundaries
  const isZoneMatch = (zone: 'dmz' | 'internal' | 'crown' | 'external') => {
    if (activeZoneFilter === 'ALL') return true
    if (activeZoneFilter === 'DMZ') return zone === 'dmz'
    if (activeZoneFilter === 'INTERNAL') return zone === 'internal'
    if (activeZoneFilter === 'CROWN') return zone === 'crown'
    return false
  }

  return (
    <div className="view-container">
      {/* View Header */}
      <div className="view-header">
        <div>
          <h2 className="view-title">Network Digital Twin & Attack Graph Modeling</h2>
          <p className="view-subtitle">
            Algorithmic topology compilation (NetworkX) evaluating k-shortest attack trajectories and critical enterprise choke points.
          </p>
        </div>
        <div className="header-action-group">
          <button
            type="button"
            className="btn-secondary"
            onClick={handleRebuildTwin}
            disabled={isRebuilding}
            title="Re-run reachability analysis against current discovery state"
          >
            <RefreshCw size={14} className={isRebuilding ? 'anim-spin' : ''} />
            <span>{isRebuilding ? 'Compiling Graph...' : 'Rebuild Twin Snapshot'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="twin-layout-split">
        {/* Left: Interactive Canvas Card */}
        <div className="cg-card twin-main-card">
          <div className="card-header">
            <div className="twin-header-left">
              <h3 className="card-title">Topological Twin Projection (MulVAL Reachability)</h3>
              <span className="badge-provenance simulated">SIMULATED / OFFLINE GRAPH</span>
            </div>

            {/* Canvas Toolbar */}
            <div className="twin-canvas-controls">
              <div className="zone-filter-pills">
                {(['ALL', 'DMZ', 'INTERNAL', 'CROWN'] as const).map((z) => (
                  <button
                    key={z}
                    type="button"
                    className={`zone-pill-btn ${activeZoneFilter === z ? 'active' : ''}`}
                    onClick={() => setActiveZoneFilter(z)}
                  >
                    {z}
                  </button>
                ))}
              </div>

              <div className="zoom-btn-group">
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => setZoomLevel((z) => Math.min(z + 0.15, 1.45))}
                  title="Zoom In"
                >
                  <ZoomIn size={14} />
                </button>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => setZoomLevel((z) => Math.max(z - 0.15, 0.7))}
                  title="Zoom Out"
                >
                  <ZoomOut size={14} />
                </button>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => setZoomLevel(1)}
                  title="Reset Zoom"
                >
                  <Maximize2 size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* SVG Canvas Area */}
          <div className="full-twin-canvas-wrap">
            <svg
              viewBox="0 0 740 370"
              className="full-twin-svg"
              style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
            >
              <defs>
                {/* Laser Threat Gradient */}
                <linearGradient id="threatBeam" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ff4d6a" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>

                {/* Subtle Grid Pattern */}
                <pattern id="twinGridPattern" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />
                </pattern>

                {/* Compromised Glow Filter */}
                <filter id="compromisedGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#ef4444" floodOpacity="0.65" />
                </filter>
                <filter id="crownJewelGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#10b981" floodOpacity="0.5" />
                </filter>
              </defs>

              {/* Background Canvas Grid */}
              <rect width="100%" height="100%" fill="url(#twinGridPattern)" />

              {/* ZONE CONTAINERS - With dedicated header strips so lines NEVER overlap text */}
              <g className="zone-boundaries">
                {/* 1. External Ingress Zone */}
                <g
                  className="zone-group"
                  style={{
                    opacity: isZoneMatch('external') ? 1 : 0.15,
                    transition: 'opacity 0.25s ease',
                  }}
                >
                  <rect
                    x="20"
                    y="30"
                    width="110"
                    height="310"
                    rx="10"
                    fill="rgba(239, 68, 68, 0.02)"
                    stroke={activeZoneFilter === 'ALL' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.4)'}
                    strokeDasharray="4 4"
                  />
                  {/* Dedicated Header Bar */}
                  <rect x="20" y="30" width="110" height="26" rx="10" fill="rgba(239, 68, 68, 0.08)" />
                  <text x="30" y="47" fill="#f87171" fontSize="10" fontFamily="var(--font-mono)" fontWeight="700">
                    LAB ADVERSARY
                  </text>
                </g>

                {/* 2. DMZ Perimeter Subnet: 10.0.0.0/28 */} // cgx-allow: lab replay telemetry
                <g
                  className="zone-group"
                  style={{
                    opacity: isZoneMatch('dmz') ? 1 : 0.15,
                    transition: 'opacity 0.25s ease',
                  }}
                >
                  <rect
                    x="150"
                    y="30"
                    width="180"
                    height="310"
                    rx="10"
                    fill={activeZoneFilter === 'DMZ' ? 'rgba(6, 182, 212, 0.06)' : 'rgba(6, 182, 212, 0.02)'}
                    stroke={activeZoneFilter === 'DMZ' ? '#06b6d4' : 'rgba(6, 182, 212, 0.25)'}
                    strokeWidth={activeZoneFilter === 'DMZ' ? 2 : 1}
                    strokeDasharray="4 4"
                  />
                  <rect x="150" y="30" width="180" height="26" rx="10" fill="rgba(6, 182, 212, 0.08)" />
                  <text x="162" y="47" fill="#38bdf8" fontSize="10" fontFamily="var(--font-mono)" fontWeight="700">
                    DMZ PERIMETER · 10.0.0.0/28 // cgx-allow: lab replay telemetry
                  </text>
                </g>

                {/* 3. Internal Trust Subnet: 10.0.0.16/28 */} // cgx-allow: lab replay telemetry
                <g
                  className="zone-group"
                  style={{
                    opacity: isZoneMatch('internal') ? 1 : 0.15,
                    transition: 'opacity 0.25s ease',
                  }}
                >
                  <rect
                    x="350"
                    y="30"
                    width="370"
                    height="160"
                    rx="10"
                    fill={activeZoneFilter === 'INTERNAL' ? 'rgba(148, 163, 184, 0.06)' : 'rgba(148, 163, 184, 0.02)'}
                    stroke={activeZoneFilter === 'INTERNAL' ? '#38bdf8' : 'rgba(148, 163, 184, 0.2)'}
                    strokeWidth={activeZoneFilter === 'INTERNAL' ? 2 : 1}
                    strokeDasharray="4 4"
                  />
                  <rect x="350" y="30" width="370" height="26" rx="10" fill="rgba(148, 163, 184, 0.06)" />
                  <text x="362" y="47" fill="#94a3b8" fontSize="10" fontFamily="var(--font-mono)" fontWeight="700">
                    INTERNAL TRUST · 10.0.0.16/28 // cgx-allow: lab replay telemetry
                  </text>
                </g>

                {/* 4. Crown Jewels Subnet: 10.0.0.32/29 (Protected DB Core) */} // cgx-allow: lab replay telemetry
                <g
                  className="zone-group"
                  style={{
                    opacity: isZoneMatch('crown') ? 1 : 0.15,
                    transition: 'opacity 0.25s ease',
                  }}
                >
                  <rect
                    x="350"
                    y="210"
                    width="370"
                    height="130"
                    rx="10"
                    fill={activeZoneFilter === 'CROWN' ? 'rgba(16, 185, 129, 0.06)' : 'rgba(16, 185, 129, 0.02)'}
                    stroke={activeZoneFilter === 'CROWN' ? '#10b981' : 'rgba(16, 185, 129, 0.25)'}
                    strokeWidth={activeZoneFilter === 'CROWN' ? 2 : 1}
                    strokeDasharray="4 4"
                  />
                  <rect x="350" y="210" width="370" height="26" rx="10" fill="rgba(16, 185, 129, 0.08)" />
                  <text x="362" y="227" fill="#34d399" fontSize="10" fontFamily="var(--font-mono)" fontWeight="700">
                    CROWN JEWELS · 10.0.0.32/29 // cgx-allow: lab replay telemetry
                  </text>
                </g>
              </g>

              {/* ROUTED LINKS (Orthogonal / Smooth Curves with Ample Clearance) */}
              <g className="topology-links">
                {/* Baseline Normal Connections */}
                {/* WS -> Auth GW */}
                <path
                  d="M 430 110 L 580 110"
                  fill="none"
                  stroke={selectedTrajectoryId === 2 ? '#ef4444' : 'rgba(148, 163, 184, 0.2)'}
                  strokeWidth={selectedTrajectoryId === 2 ? 2.5 : 1.5}
                  strokeDasharray={selectedTrajectoryId === 2 ? '6 4' : undefined}
                  style={{
                    opacity: isZoneMatch('internal') ? 1 : 0.12,
                    transition: 'opacity 0.25s ease',
                  }}
                />

                {/* Auth GW -> SQL DB */}
                <path
                  d="M 580 110 L 580 285 L 510 285"
                  fill="none"
                  stroke={selectedTrajectoryId === 2 ? '#ef4444' : 'rgba(148, 163, 184, 0.2)'}
                  strokeWidth={selectedTrajectoryId === 2 ? 2.5 : 1.5}
                  strokeDasharray={selectedTrajectoryId === 2 ? '6 4' : undefined}
                  style={{
                    opacity: isZoneMatch('internal') || isZoneMatch('crown') ? 1 : 0.12,
                    transition: 'opacity 0.25s ease',
                  }}
                />

                {/* Core App -> WS (Internal connection) */}
                <path
                  d="M 240 180 C 300 180, 360 110, 430 110"
                  fill="none"
                  stroke="rgba(148, 163, 184, 0.18)"
                  strokeWidth="1.5"
                  style={{
                    opacity: isZoneMatch('dmz') || isZoneMatch('internal') ? 1 : 0.12,
                    transition: 'opacity 0.25s ease',
                  }}
                />

                {/* TRAJECTORY #1 ACTIVE PATH: Ext Ingress -> Core App -> SQL DB */}
                {/* 1. Attacker -> Core App Server */}
                <path
                  d="M 75 180 L 240 180"
                  fill="none"
                  stroke={selectedTrajectoryId === 1 ? 'url(#threatBeam)' : 'rgba(239, 68, 68, 0.3)'}
                  strokeWidth={selectedTrajectoryId === 1 ? 3 : 1.5}
                  strokeDasharray={selectedTrajectoryId === 1 ? '6 4' : undefined}
                  className={selectedTrajectoryId === 1 ? 'anim-threat-beam' : ''}
                  style={{
                    opacity: isZoneMatch('external') || isZoneMatch('dmz') ? 1 : 0.12,
                    transition: 'opacity 0.25s ease',
                  }}
                />

                {/* 2. Core App Server -> SQL DB (Routed cleanly with cubic bezier avoiding zone headers) */}
                <path
                  d="M 240 180 C 300 180, 320 285, 510 285"
                  fill="none"
                  stroke={selectedTrajectoryId === 1 ? 'url(#threatBeam)' : 'rgba(148, 163, 184, 0.2)'}
                  strokeWidth={selectedTrajectoryId === 1 ? 3 : 1.5}
                  strokeDasharray={selectedTrajectoryId === 1 ? '6 4' : undefined}
                  className={selectedTrajectoryId === 1 ? 'anim-threat-beam' : ''}
                  style={{
                    opacity: isZoneMatch('dmz') || isZoneMatch('crown') ? 1 : 0.12,
                    transition: 'opacity 0.25s ease',
                  }}
                />

                {/* Threat Pulse Particle */}
                {selectedTrajectoryId === 1 && (
                  <circle cx="150" cy="180" r="4.5" fill="#ffffff">
                    <animate attributeName="cx" from="75" to="240" dur="1.8s" repeatCount="indefinite" />
                  </circle>
                )}
              </g>

              {/* NODE HARDWARE/SERVICE CARDS */}
              <g className="topology-nodes">
                {TWIN_NODES.map((node) => {
                  const isInPath = isNodeInActiveTrajectory(node.id)
                  const isChoke = activeTrajectory.chokePointNodeId === node.id
                  const isSelected = inspectedNode?.id === node.id
                  const isMatch = isZoneMatch(node.zone)

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.id === 'node-core' ? node.x - 55 : node.x - 45}, ${
                        node.y - 25
                      })`}
                      className="node-card-group"
                      onClick={() => setInspectedNode(node)}
                      style={{
                        cursor: 'pointer',
                        opacity: isMatch ? 1 : 0.18,
                        filter: isMatch ? 'none' : 'grayscale(80%)',
                        transition: 'opacity 0.25s ease, filter 0.25s ease',
                      }}
                    >
                      {/* Node Card Box */}
                      <rect
                        x="0"
                        y="0"
                        width={node.id === 'node-core' ? 110 : 90}
                        height="52"
                        rx="7"
                        fill="#14171c"
                        stroke={
                          isSelected
                            ? '#06b6d4'
                            : isChoke
                            ? '#ef4444'
                            : isInPath
                            ? '#f59e0b'
                            : node.status === 'compromised'
                            ? '#ef4444'
                            : node.status === 'protected'
                            ? '#10b981'
                            : '#2a313d'
                        }
                        strokeWidth={isSelected ? 2.5 : isChoke ? 2 : 1.2}
                        filter={
                          isChoke || node.status === 'compromised'
                            ? 'url(#compromisedGlow)'
                            : node.status === 'protected'
                            ? 'url(#crownJewelGlow)'
                            : undefined
                        }
                      />

                      {/* Header Line */}
                      <line
                        x1="0"
                        y1="22"
                        x2={node.id === 'node-core' ? 110 : 90}
                        y2="22"
                        stroke="rgba(255, 255, 255, 0.07)"
                        strokeWidth="1"
                      />

                      {/* Status Pip */}
                      <circle
                        cx="10"
                        cy="11"
                        r="3.5"
                        fill={
                          node.status === 'compromised'
                            ? '#ef4444'
                            : node.status === 'protected'
                            ? '#10b981'
                            : node.status === 'source'
                            ? '#f59e0b'
                            : '#94a3b8'
                        }
                      />

                      {/* Node Title */}
                      <text
                        x="20"
                        y="14"
                        fill="#f2f4f6"
                        fontSize="9.5"
                        fontWeight="600"
                        fontFamily="var(--font-sans)"
                      >
                        {node.label}
                      </text>

                      {/* IP Address Pill */}
                      <text
                        x="10"
                        y="38"
                        fill={node.status === 'compromised' ? '#ff4d6a' : '#38bdf8'}
                        fontSize="9"
                        fontFamily="var(--font-mono)"
                        fontWeight="500"
                      >
                        {node.ip}
                      </text>

                      {/* Choke Point Alert Glyph */}
                      {isChoke && (
                        <g transform={`translate(${node.id === 'node-core' ? 92 : 72}, 4)`}>
                          <circle cx="6" cy="6" r="6" fill="#ef4444" />
                          <text x="6" y="9.5" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">
                            !
                          </text>
                        </g>
                      )}
                    </g>
                  )
                })}
              </g>
            </svg>
          </div>

          {/* Graph Legend */}
          <div className="twin-canvas-footer">
            <div className="twin-legend-group">
              <span className="legend-item">
                <span className="legend-line normal" /> Observed Route
              </span>
              <span className="legend-item">
                <span className="legend-line threat" /> Active Attack Trajectory
              </span>
              <span className="legend-item">
                <span className="legend-pip choke" /> Critical Choke Point
              </span>
              <span className="legend-item">
                <span className="legend-pip crown" /> Crown Jewel Target
              </span>
            </div>
          </div>
        </div>

        {/* Right: Attack Trajectories & Remediation Panel */}
        <div className="twin-side-panel">
          <div className="cg-card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Attack Trajectories (K-Shortest)</h3>
                <p className="card-subtitle">Algorithmic paths ranked by reachability risk</p>
              </div>
            </div>

            <div className="path-list">
              {ATTACK_TRAJECTORIES.map((traj) => {
                const isActive = selectedTrajectoryId === traj.id
                return (
                  <div
                    key={traj.id}
                    className={`path-item ${isActive ? 'active' : ''}`}
                    onClick={() => setSelectedTrajectoryId(traj.id)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="path-header">
                      <span className="path-num">Trajectory #{traj.id}</span>
                      <span className={`badge-severity ${traj.likelihood.toLowerCase()}`}>
                        {traj.score}% Risk
                      </span>
                    </div>

                    <h4 className="path-name">{traj.title}</h4>

                    {/* Step Breadcrumbs */}
                    <div className="path-steps-flow">
                      {traj.steps.map((st, i) => (
                        <React.Fragment key={st.nodeId}>
                          <span className="step-crumb mono">{st.name}</span>
                          {i < traj.steps.length - 1 && <ChevronRight size={11} className="crumb-arrow" />}
                        </React.Fragment>
                      ))}
                    </div>

                    {/* Choke Point Callout */}
                    <div className="path-chokepoint">
                      <AlertTriangle size={13} className="text-crimson" />
                      <div>
                        <span className="choke-label">Critical Choke Point:</span>{' '}
                        <span className="choke-val mono">{traj.chokePointName}</span>
                      </div>
                    </div>

                    {/* Recommended Mitigation */}
                    <div className="path-remedy">
                      <Shield size={13} className="text-cyan" />
                      <div>
                        <span className="remedy-label">Intervention:</span>{' '}
                        <span className="remedy-val">{traj.mitigation}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Node Inspector Drawer */}
      {inspectedNode && (
        <div className="incident-drawer-overlay" onClick={() => setInspectedNode(null)}>
          <div className="incident-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <div className="drawer-badges">
                  <span className={`badge-severity ${inspectedNode.status}`}>
                    {inspectedNode.status.toUpperCase()}
                  </span>
                  <span className="incident-id-tag mono">{inspectedNode.ip}</span>
                  <span className="tag-zone">{inspectedNode.zone.toUpperCase()}</span>
                </div>
                <h2 className="drawer-title">{inspectedNode.label}</h2>
              </div>
              <button
                type="button"
                className="btn-icon-close"
                onClick={() => setInspectedNode(null)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="drawer-body">
              <div className="drawer-section">
                <h4 className="drawer-section-title">Network Identity</h4>
                <div className="drawer-info-grid">
                  <div className="info-cell">
                    <span className="cell-label">HOSTNAME</span>
                    <span className="cell-val mono">{inspectedNode.hostname}</span>
                  </div>
                  <div className="info-cell">
                    <span className="cell-label">IP ADDRESS</span>
                    <span className="cell-val mono text-cyan">{inspectedNode.ip}</span>
                  </div>
                  <div className="info-cell">
                    <span className="cell-label">DEVICE TYPE</span>
                    <span className="cell-val" style={{ textTransform: 'capitalize' }}>
                      {inspectedNode.type}
                    </span>
                  </div>
                  <div className="info-cell">
                    <span className="cell-label">TOPOLOGY STATUS</span>
                    <span className="cell-val">{inspectedNode.status}</span>
                  </div>
                </div>
              </div>

              <div className="drawer-section">
                <h4 className="drawer-section-title">Active Services & Ports</h4>
                <div className="drawer-services-list">
                  {inspectedNode.services.map((svc, i) => (
                    <div key={i} className="service-chip-row">
                      <span className="service-port mono">Port {inspectedNode.ports[i] || '—'}</span>
                      <span className="service-banner">{svc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {inspectedNode.findings.length > 0 && (
                <div className="drawer-section">
                  <h4 className="drawer-section-title">Correlated Reachability Findings</h4>
                  <div className="findings-list">
                    {inspectedNode.findings.map((f, i) => (
                      <div key={i} className="finding-item-row critical">
                        <AlertTriangle size={14} className="text-crimson" />
                        <span className="finding-title">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="drawer-section">
                <h4 className="drawer-section-title">Defensive Twin Actions</h4>
                <div className="drawer-actions-row">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      alert(`Isolating node ${inspectedNode.ip} in MulVAL topological twin model.`)
                      setInspectedNode(null)
                    }}
                  >
                    <Lock size={13} />
                    <span>Simulate Node Severance</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
