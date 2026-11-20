import React, { useState } from 'react'
import { ShieldAlert, AlertTriangle, X } from 'lucide-react'

interface EmergencyStopModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirmStop: () => Promise<void>
}

export const EmergencyStopModal: React.FC<EmergencyStopModalProps> = ({
  isOpen,
  onClose,
  onConfirmStop,
}) => {
  const [confirmText, setConfirmText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!isOpen) return null

  const isConfirmed = confirmText.trim().toUpperCase() === 'STOP'

  const handleExecute = async () => {
    if (!isConfirmed) return
    setSubmitting(true)
    try {
      await onConfirmStop()
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog danger-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <ShieldAlert size={20} className="text-crimson" />
            <h3 className="modal-title text-crimson">Emergency Kill Switch</h3>
          </div>
          <button type="button" className="btn-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <div className="warning-callout">
            <AlertTriangle size={18} className="callout-icon" />
            <div className="callout-text">
              <strong>Emergency Defense Overrule:</strong> Triggering this action will immediately:
              <ul className="callout-list">
                <li>Abort all currently executing defense jobs in the queue.</li>
                <li>Flush all active dynamic firewall shuns (nftables/pf rules).</li>
                <li>Set the system-wide emergency halt flag in the PostgreSQL ledger.</li>
              </ul>
            </div>
          </div>

          <p className="confirm-prompt">
            Type <span className="text-crimson mono font-bold">STOP</span> below to confirm authorization:
          </p>

          <input
            type="text"
            className="form-input mono"
            placeholder="Type STOP to confirm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoFocus
          />
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={handleExecute}
            disabled={!isConfirmed || submitting}
          >
            <ShieldAlert size={14} />
            <span>{submitting ? 'Executing Halt...' : 'Trigger Emergency Halt'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
