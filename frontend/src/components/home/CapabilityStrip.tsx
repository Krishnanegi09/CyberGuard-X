import React from 'react'
import { Activity, GitBranch, ShieldCheck, RefreshCw } from 'lucide-react'

export const CapabilityStrip: React.FC = () => {
  const capabilities = [
    {
      icon: <Activity size={20} className="strip-icon" />,
      value: '< 200 ms',
      label: 'Threat Detection',
      sub: 'Kernel BPF wire-speed analysis',
    },
    {
      icon: <GitBranch size={20} className="strip-icon" />,
      value: '6-Stage',
      label: 'Attack Simulation',
      sub: 'Automated blast radius modeling',
    },
    {
      icon: <ShieldCheck size={20} className="strip-icon" />,
      value: '99.7%',
      label: 'Detection Accuracy',
      sub: 'Trained ML & signature correlation',
    },
    {
      icon: <RefreshCw size={20} className="strip-icon" />,
      value: 'Real-time',
      label: 'Digital Twin Sync',
      sub: 'Live topology & trust-zone updates',
    },
  ]

  return (
    <div className="capability-strip-container">
      <div className="capability-strip-grid">
        {capabilities.map((cap, idx) => (
          <div key={idx} className="capability-strip-item">
            <div className="strip-item-icon-box">
              {cap.icon}
            </div>
            <div className="strip-item-content">
              <span className="strip-item-value">{cap.value}</span>
              <span className="strip-item-label">{cap.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default CapabilityStrip
