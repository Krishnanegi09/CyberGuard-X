# 09 — Ethics, Legal & Data Minimisation

> This is a guide for an academic project, not legal advice. Confirm the details with your project guide or department.

## Legal context (India)
- The **Information Technology Act, 2000** (notably Sections 43 and 66) makes unauthorized access, scanning or interference with computer systems an offence, with civil and criminal liability.
- The **Digital Personal Data Protection Act, 2023** governs processing of personal data. IP addresses and traffic metadata linked to people can count as personal data.
- **College network policy:** scanning or sniffing the campus or hostel network without written IT permission is a violation, even "just to test".

## Project policy (enforced in code where possible)
1. **Authorization:** only the lab (`docs/design/08-lab.md`) or networks with written permission from their owner. Keep any permission letters in `docs/authorizations/`, outside the public repo if they contain personal data.
2. **Scope in code:** CIDR allowlist per org; rejected targets are audited (see threat E2).
3. **No exploitation:** simulations are graph analysis only. Lab attack scripts produce traffic (scans, login attempts) against team-owned containers and never deliver exploits beyond the lab.
4. **Data minimisation:** store flows (metadata) by default; packet samples only for flagged traffic, payload snippet ≤ 128 bytes or none, 7-day retention.
5. **Consent:** if any human-generated traffic is captured (for example a teammate's laptop on the physical lab), that person agrees in writing first and the data is deleted after the project.
6. **Datasets:** use public datasets under their licences and cite them. Never publish raw lab pcaps that contain teammates' personal traffic.
7. **Defensive actions:** lab targets only, approval required, TTL, emergency stop.
8. **Responsible disclosure:** if you find a real vulnerability in a third-party system by accident, stop, don't exploit it, and tell your guide.

## Statement for the report (adapt as needed)
> All network discovery, traffic capture, attack-scenario generation and automated response in this project were performed exclusively within an isolated laboratory network owned and operated by the project team. The system enforces an authorization scope in code, minimizes stored traffic data, and requires human approval for any defensive action.
