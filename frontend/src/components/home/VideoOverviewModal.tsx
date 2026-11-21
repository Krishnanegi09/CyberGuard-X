import React, { useState } from 'react'
import { X, Play, Pause, RotateCcw, ArrowRight, Shield, Layers, Cpu, Terminal } from 'lucide-react'

interface VideoOverviewModalProps {
  isOpen: boolean
  onClose: () => void
  onLaunchConsole?: () => void
}

export const VideoOverviewModal: React.FC<VideoOverviewModalProps> = ({
  isOpen,
  onClose,
  onLaunchConsole,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [activeChapter, setActiveChapter] = useState<number>(0)

  if (!isOpen) return null

  const chapters = [
    {
      title: '01. Wire-Speed Ingestion',
      time: '0:00 - 0:28',
      icon: <Terminal size={14} />,
      summary: 'Real-time eBPF passive packet sensor capturing raw network flows within authorized CIDR boundaries.',
      log: '[SENSOR] Interface en0 in promisc mode. Captured 14,200 pkt/sec without kernel drop. Enforcing CIDR 10.0.0.0/16.', // cgx-allow: marketing demo log
    },
    {
      title: '02. Digital Twin Mapping',
      time: '0:29 - 0:54',
      icon: <Layers size={14} />,
      summary: 'Synchronizing topology graph, trust zone perimeters, and active open ports into in-memory twin.',
      log: '[TWIN] Graph synchronized: 1,284 assets, 3,412 edges. Identified 3 lateral hops to restricted Database cluster.',
    },
    {
      title: '03. Attack Simulation',
      time: '0:55 - 1:25',
      icon: <Cpu size={14} />,
      summary: 'Simulating lateral movement from compromised internal host to Domain Controller.',
      log: '[SIM] Executing Dijkstra path traversal: Host 10.0.2.14 -> 10.0.3.5 -> 10.0.4.88. Blast radius calculated: 32%.', // cgx-allow: marketing demo log
    },
    {
      title: '04. Calibrated Response',
      time: '1:26 - 2:00',
      icon: <Shield size={14} />,
      summary: 'Human-approved firewall shun deployment with auto-expiring 15-minute TTL.',
      log: '[DEFENSE] Four-Eyes approval confirmed by Operator. Deployed iptables DROP rule on 10.0.2.14. TTL 900s active.', // cgx-allow: marketing demo log
    },
  ]

  const current = chapters[activeChapter]

  return (
    <div className="video-modal-backdrop" onClick={onClose}>
      <div className="video-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="video-modal-header">
          <div className="modal-title-group">
            <span className="modal-badge">PLATFORM OVERVIEW · 2 MIN</span>
            <h3 className="modal-heading">CYBERGUARD-X Architecture Tour</h3>
          </div>

          <button
            type="button"
            className="btn-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Video Player Display Container */}
        <div className="video-player-display">
          <div className="player-screen-content">
            <div className="screen-watermark">
              <Shield size={32} className="text-cyan opacity-40" />
              <span>CYBERGUARD-X // LIVE SOC TELEMETRY PLAYBACK</span>
            </div>

            <div className="screen-active-log">
              <span className="log-prefix">&gt; </span>
              <span className="log-text">{current.log}</span>
            </div>

            {/* Interactive Play/Pause Overlay */}
            <div className="player-controls-overlay">
              <button
                type="button"
                className="btn-play-pause"
                onClick={() => setIsPlaying(!isPlaying)}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>

              <button
                type="button"
                className="btn-restart"
                onClick={() => setActiveChapter(0)}
                title="Restart"
              >
                <RotateCcw size={16} />
              </button>
            </div>
          </div>

          {/* Progress Timeline Bar */}
          <div className="timeline-track">
            <div
              className="timeline-fill"
              style={{ width: `${((activeChapter + 1) / chapters.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Chapter Selection Tabs */}
        <div className="modal-chapters-grid">
          {chapters.map((ch, idx) => (
            <div
              key={idx}
              className={`chapter-tab-item ${activeChapter === idx ? 'active' : ''}`}
              onClick={() => setActiveChapter(idx)}
            >
              <div className="chapter-header">
                <span className="chapter-icon">{ch.icon}</span>
                <span className="chapter-title">{ch.title}</span>
                <span className="chapter-time">{ch.time}</span>
              </div>
              <p className="chapter-summary">{ch.summary}</p>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="video-modal-footer">
          <button
            type="button"
            className="btn-ghost"
            onClick={onClose}
          >
            Close Overview
          </button>

          <button
            type="button"
            className="btn-launch-primary"
            onClick={() => {
              onClose()
              onLaunchConsole?.()
            }}
          >
            <span>Launch Operator Console</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default VideoOverviewModal
