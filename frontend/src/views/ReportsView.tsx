import React, { useState } from 'react'
import {
  FileText,
  Download,
  Eye,
  CheckCircle2,
  X,
} from 'lucide-react'

interface ReportDoc {
  id: string
  title: string
  category: 'Reconnaissance' | 'Incident Forensics' | 'Model Evaluation' | 'Compliance'
  generatedAt: string
  author: string
  format: 'Markdown / HTML'
  summary: string
  content: string
}

const REPORTS_LIST: ReportDoc[] = [
  {
    id: 'rep-01',
    title: 'Automated Network Discovery Scan Report',
    category: 'Reconnaissance',
    generatedAt: '2026-11-19 14:20:00 UTC',
    author: 'CYBERGUARD-X Nmap Engine v7.95',
    format: 'Markdown / HTML',
    summary: 'Active host reconnaissance across boundary 198.51.100.0/24 identifying 3 live assets, 6 open service ports, and exposed vsftpd 2.3.4.', // cgx-allow: sample report template
    content: `# CYBERGUARD-X — Automated Discovery Scan Report

**Organization ID:** \`org-democorp-01\`  
**Execution Timestamp:** 2026-11-19T14:20:00Z  
**Scan Scope:** \`198.51.100.0/24\` (Lab DMZ Boundary)  
**Profile:** \`host_discovery\` + \`service_banner\`  
**Scanner Engine:** Nmap 7.95 (SYN Stealth)  

---

## Executive Summary
Active network discovery completed against the approved boundary \`198.51.100.0/24\`. All scans were bounded within authorized CIDR boundaries per multi-tenant scope definitions.

- **Total IPs Scanned:** 254
- **Live Hosts Discovered:** 3
- **Exposed Open Ports:** 6
- **Highest Criticality Asset:** \`srv-app-core.sec.local\` (198.51.100.12, CROWN_JEWEL)

---

## Discovered Assets & Services

| Hostname | IP Address | MAC Address | OS Fingerprint | Open Ports / Banners |
|---|---|---|---|---|
| \`srv-app-core.sec.local\` | \`198.51.100.12\` | \`00-1A-2B-3C-4D-5E\` | Ubuntu Linux 24.04 LTS | 21/tcp (vsftpd 2.3.4), 22/tcp (OpenSSH 9.6p1) |
| \`operator-station.soc.local\` | \`198.51.100.44\` | \`00-1A-2B-3C-4D-9A\` | macOS Sonoma 14.6 | 22/tcp (OpenSSH 9.4) |
| \`gw-perimeter.dmz.local\` | \`198.51.100.254\` | \`00-1A-2B-3C-4D-FF\` | FreeBSD 14 / pfSense | 80/tcp (pfSense WebGUI), 443/tcp (pfSense WebGUI) |

---

## Findings & Risk Corroboration
1. **Unencrypted FTP Exposure:** Port 21 open on \`198.51.100.12\` with banner matching vulnerable vsftpd.
2. **Attack Path Risk:** Digital twin lateral movement identifies port 21 as entry point for ingress compromise.
3. **Recommended Action:** Execute dynamic firewall block (\`fw_block\`) on port 21 via automated Defense module.`,
  },
  {
    id: 'rep-02',
    title: 'Forensics Incident Investigation Report (INC-20261119-001)',
    category: 'Incident Forensics',
    generatedAt: '2026-11-19 14:35:11 UTC',
    author: 'SOC Lead & Defense Automator',
    format: 'Markdown / HTML',
    summary: 'Investigation of vertical port scan targeting 198.51.100.12 from external attacker 203.0.113.105 with dynamic host shun containment.', // cgx-allow: sample report template
    content: `# CYBERGUARD-X — Incident Response & Forensics Report

**Incident ID:** \`INC-20261119-001\`  
**Severity:** CRITICAL  
**Status:** RESOLVED (Contained & Rolled Back)  
**Detected At:** 2026-11-19T14:20:11.204Z  
**Target Asset:** \`srv-app-core.sec.local\` (\`198.51.100.12\`, Crown Jewel)  
**Attacker IP:** \`203.0.113.105\`  
**Detection Rule:** \`RULE_PORT_SCAN_VERTICAL\` (\`NIDS-001\`)  
**MITRE ATT&CK:** \`T1046\` (Network Service Discovery)  

---

## Incident Narrative
At \`14:20:11.204Z\`, the wire NIDS capture sensor detected a burst of 15 TCP SYN packets from external host \`203.0.113.105\` targeting distinct ports on crown jewel server \`198.51.100.12\` within a 4.2-second window.

The event matched signature \`RULE_PORT_SCAN_VERTICAL\` with 96% confidence score.

---

## Evidence Trail
- **Packet Capture:** \`lab/captures/vertical_scan_demo.pcap\`
- **Raw BPF Flow Records:**
  - \`14:20:11.204\`: \`203.0.113.105:54101 -> 198.51.100.12:21\` [TCP SYN, 60 bytes]
  - \`14:20:11.248\`: \`203.0.113.105:54102 -> 198.51.100.12:22\` [TCP SYN, 60 bytes]
  - \`14:20:11.291\`: \`203.0.113.105:54103 -> 198.51.100.12:80\` [TCP SYN, 60 bytes]
  - \`14:20:11.335\`: \`203.0.113.105:54104 -> 198.51.100.12:443\` [TCP SYN, 60 bytes]

---

## Containment & Defense Execution
1. **Four-Eyes Approval Enforced:**
   - **Requester:** Operator (\`analyst@democorp.local\`)
   - **Approver:** Lead (\`lead@democorp.local\`)
2. **Action Applied:** Dynamic Host Shun (\`fw_block\` with TTL 15m) dropping inbound traffic from \`203.0.113.105\`.
3. **Verification:** Live traffic re-probe confirmed packets from \`203.0.113.105\` dropped at perimeter pfSense gateway.
4. **Lifecycle:** TTL auto-expired cleanly at \`14:35:11Z\` and transitioned to \`ROLLED_BACK\`.
5. **Audit Trail:** Immutable audit log records \`DEFENSE_ACTION_APPROVED\` and \`DEFENSE_ACTION_ROLLED_BACK\`.`,
  },
  {
    id: 'rep-03',
    title: 'Machine Learning Model Performance & Calibration Report',
    category: 'Model Evaluation',
    generatedAt: '2026-11-19 11:30:00 UTC',
    author: 'ML Threat Intelligence Pipeline',
    format: 'Markdown / HTML',
    summary: 'Evaluation of Random Forest and XGBoost classifiers against public benchmark CIC-IDS2017 and controlled lab-v1 datasets.',
    content: `# Machine Learning Threat Detection Evaluation Report

## Model Architecture
- **Model Version:** \`rf-flow-v1.4\`
- **Features Extracted:** 28 flow features (SYN ratio, inter-arrival time variance, packet length entropy, byte symmetry)
- **Train Split:** 80% with session-aware temporal holdout (no flow leakage)

---

## Public Benchmark Performance (CIC-IDS2017)
| Attack Class | Precision | Recall | F1 Score | AUC-ROC |
|---|---|---|---|---|
| PortScan | 0.984 | 0.978 | 0.981 | 0.994 |
| DoS/DDoS | 0.991 | 0.989 | 0.990 | 0.997 |
| SSH BruteForce | 0.962 | 0.954 | 0.958 | 0.988 |
| Overall Macro Avg | 0.979 | 0.974 | 0.976 | 0.993 |

---

## Lab Ground Truth Validation (lab-v1)
- Verified against synthetic PCAP replays: 0 false alarms on benign HTTP/SSH baseline traffic.
- Detection latency: Under 85ms from packet arrival to NIDS prediction emission.`,
  },
]

export const ReportsView: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<ReportDoc | null>(null)
  const [downloadToast, setDownloadToast] = useState<string | null>(null)

  const handleDownload = (report: ReportDoc) => {
    const blob = new Blob([report.content], { type: 'text/markdown;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${report.id}_${report.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.md`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    setDownloadToast(`Report "${report.title}" exported to Markdown successfully.`)
    setTimeout(() => setDownloadToast(null), 3000)
  }

  return (
    <div className="view-container">
      <div className="discovery-view-header" style={{ marginBottom: '24px' }}>
        <div className="discovery-header-copy">
          <h2>Security Assessment & Forensics Reports</h2>
          <p>
            Cryptographically corroborated executive and technical reports generated from platform telemetry,
            active discovery scans, wire packet evidence, and ML evaluation benchmarks.
          </p>
        </div>
      </div>

      {downloadToast && (
        <div className="callout-success" style={{ marginBottom: '20px' }}>
          <CheckCircle2 size={16} />
          <span>{downloadToast}</span>
        </div>
      )}

      {/* Reports Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {REPORTS_LIST.map((rep) => (
          <div
            key={rep.id}
            className="cg-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '24px',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    backgroundColor: 'rgba(6, 182, 212, 0.15)',
                    color: 'var(--accent-cyan)',
                  }}
                >
                  {rep.category}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{rep.generatedAt.slice(0, 10)}</span>
              </div>

              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
                {rep.title}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 14px 0' }}>
                {rep.summary}
              </p>

              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Author: {rep.author}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                className="btn-layout-preset"
                onClick={() => setSelectedReport(rep)}
                style={{ height: '32px' }}
              >
                <Eye size={13} />
                <span>View Full Report</span>
              </button>
              <button
                type="button"
                className="btn-nids-start"
                onClick={() => handleDownload(rep)}
                style={{ height: '32px', padding: '0 14px', fontSize: '12px' }}
              >
                <Download size={13} />
                <span>Download .MD</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Report Modal Preview */}
      {selectedReport && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '780px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={16} className="text-cyan" />
                <h3 className="modal-title">{selectedReport.title}</h3>
              </div>
              <button
                type="button"
                className="btn-layout-close"
                onClick={() => setSelectedReport(null)}
              >
                <X size={15} />
              </button>
            </div>

            <div
              className="modal-body"
              style={{
                flex: 1,
                overflowY: 'auto',
                backgroundColor: 'var(--bg-canvas)',
                padding: '24px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontSize: '13px',
                lineHeight: 1.6,
                color: 'var(--text-primary)',
              }}
            >
              <pre
                style={{
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'inherit',
                  margin: 0,
                }}
              >
                {selectedReport.content}
              </pre>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Generated: {selectedReport.generatedAt}
              </span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-layout-preset"
                  onClick={() => setSelectedReport(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn-nids-start"
                  onClick={() => handleDownload(selectedReport)}
                  style={{ height: '36px' }}
                >
                  <Download size={14} />
                  <span>Download Report</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default ReportsView
