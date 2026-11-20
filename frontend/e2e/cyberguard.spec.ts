import { test, expect } from '@playwright/test'

test.describe('CYBERGUARD-X — Application-Wide E2E Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('1. Sidebar Navigation, Collapse/Expand & Routing', async ({ page }) => {
    const sidebar = page.locator('.cg-sidebar')
    await expect(sidebar).toBeVisible()

    // Collapse toggle button
    const collapseBtn = page.locator('.btn-collapse-toggle')
    await expect(collapseBtn).toBeVisible()
    await collapseBtn.click()
    await expect(sidebar).toHaveClass(/collapsed/)

    // Expand sidebar by clicking the brand logo icon
    const logoWrap = page.locator('.brand-logo-wrap')
    await logoWrap.click()
    await expect(sidebar).not.toHaveClass(/collapsed/)

    // Navigate to Findings
    await page.locator('.nav-item', { hasText: 'Findings' }).click()
    await expect(page.locator('.view-title')).toContainText('Findings')

    // Navigate to Incidents
    await page.locator('.nav-item', { hasText: 'Incidents' }).click()
    await expect(page.locator('.view-title')).toContainText('Incident')

    // Navigate to Assets
    await page.locator('.nav-item', { hasText: 'Assets' }).click()
    await expect(page.locator('.view-title')).toContainText('Asset')

    // Navigate to Digital Twin
    await page.locator('.nav-item', { hasText: 'Digital Twin' }).click()
    await expect(page.locator('.view-title')).toContainText('Digital Twin')

    // Navigate to Simulations
    await page.locator('.nav-item', { hasText: 'Simulations' }).click()
    await expect(page.locator('.view-title')).toContainText('What-If')

    // Navigate to Scopes & Scans
    await page.locator('.nav-item', { hasText: 'Scopes & Scans' }).click()
    await expect(page.locator('h2')).toContainText('Network Discovery')

    // Navigate to Wire NIDS
    await page.locator('.nav-item', { hasText: 'Wire NIDS' }).click()
    await expect(page.locator('h2')).toContainText('Wire NIDS Sensor')

    // Return to Overview
    await page.locator('.nav-item', { hasText: 'Overview' }).click()
    await expect(page.locator('.hero-heading')).toContainText('Continuous defense')
  })

  test('2. Top Bar Controls (Search, Theme, Kill Switch, Notifications)', async ({ page }) => {
    // 2.1 Search / Command Palette
    const searchWrap = page.locator('.search-wrap')
    await expect(searchWrap).toBeVisible()
    await searchWrap.click()
    const palette = page.locator('.palette-backdrop')
    await expect(palette).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(palette).not.toBeVisible()

    // 2.2 Theme Toggle
    const html = page.locator('html')
    const initialTheme = await html.getAttribute('data-theme')
    const themeBtn = page.locator('.theme-toggle-btn')
    await themeBtn.click()
    const newTheme = await html.getAttribute('data-theme')
    expect(newTheme).not.toBe(initialTheme)
    // Toggle back to dark
    await themeBtn.click()
    await expect(html).toHaveAttribute('data-theme', 'dark')

    // 2.3 Kill Switch Guardrail
    const killSwitch = page.locator('.action-btn-danger')
    await expect(killSwitch).toBeVisible()
    await killSwitch.click()
    const stopModal = page.locator('.modal-backdrop')
    await expect(stopModal).toBeVisible()
    await expect(page.locator('.modal-title')).toContainText('Emergency Kill Switch')
    // Cancel modal
    await page.locator('.modal-footer .btn-secondary').click()
    await expect(stopModal).not.toBeVisible()

    // 2.4 Notifications Popover
    const notifBtn = page.locator('.icon-btn[title*="Notifications"]')
    await notifBtn.click()
    const notifPopover = page.locator('.notif-popover')
    await expect(notifPopover).toBeVisible()
    await notifBtn.click()
    await expect(notifPopover).not.toBeVisible()
  })

  test('3. Overview Page Resizability & Layout Controls', async ({ page }) => {
    // Layout toggle button
    const layoutToggle = page.locator('.btn-layout-toggle')
    await expect(layoutToggle).toBeVisible()
    await layoutToggle.click()

    // Layout presets bar
    const layoutBar = page.locator('.overview-layout-bar')
    await expect(layoutBar).toBeVisible()

    // Select 'Focus Twin' preset
    const focusTwinBtn = page.locator('.btn-layout-preset', { hasText: 'Focus Twin' })
    await focusTwinBtn.click()
    await expect(layoutToggle).toContainText('Focus Twin')

    // Select 'Balanced (1:1)' preset
    const balancedBtn = page.locator('.btn-layout-preset', { hasText: 'Balanced (1:1)' })
    await balancedBtn.click()
    await expect(layoutToggle).toContainText('1:1 Balanced')

    // Close layout bar
    await page.locator('.btn-layout-close').click()
    await expect(layoutBar).not.toBeVisible()

    // Splitter gutters present in DOM
    const colSplitter = page.locator('.split-gutter-col').first()
    await expect(colSplitter).toBeAttached()
  })

  test('4. Simulations Module — Equal Card Height & Interactive Countermeasures', async ({ page }) => {
    await page.locator('.nav-item', { hasText: 'Simulations' }).click()
    await expect(page.locator('.view-title')).toContainText('What-If')

    const configCard = page.locator('.sim-config-card')
    const resultsCard = page.locator('.sim-results-card')
    await expect(configCard).toBeVisible()
    await expect(resultsCard).toBeVisible()

    // Measure height equality: both cards must have matching bounding height
    const configBox = await configCard.boundingBox()
    const resultsBox = await resultsCard.boundingBox()
    expect(configBox).not.toBeNull()
    expect(resultsBox).not.toBeNull()
    if (configBox && resultsBox) {
      expect(Math.abs(configBox.height - resultsBox.height)).toBeLessThanOrEqual(2)
    }

    // Click 'Isolate SQL Database' mutation
    const isolateDbCard = page.locator('.mutation-card', { hasText: 'Isolate SQL Database' })
    await isolateDbCard.click()
    await expect(isolateDbCard).toHaveClass(/active/)
    await expect(page.locator('.score-box.mutated .score-box-val')).toHaveText('16')

    // Run simulation
    const runBtn = page.locator('.sim-form-body .btn-primary')
    await runBtn.click()
    await page.waitForTimeout(800)

    // Open deployment confirmation modal
    const deployBtn = page.locator('.sim-action-strip .btn-primary')
    await deployBtn.click()
    const modal = page.locator('.modal-dialog-box')
    await expect(modal).toBeVisible()
    await page.locator('.modal-footer .btn-secondary').click()
    await expect(modal).not.toBeVisible()
  })

  test('5. Digital Twin — Active Zone Filters (ALL, DMZ, INTERNAL, CROWN)', async ({ page }) => {
    await page.locator('.nav-item', { hasText: 'Digital Twin' }).click()
    await expect(page.locator('.view-title')).toContainText('Digital Twin')

    // Filter pills
    const dmzBtn = page.locator('.zone-pill-btn', { hasText: 'DMZ' })
    const internalBtn = page.locator('.zone-pill-btn', { hasText: 'INTERNAL' })
    const crownBtn = page.locator('.zone-pill-btn', { hasText: 'CROWN' })
    const allBtn = page.locator('.zone-pill-btn', { hasText: 'ALL' })

    // Click DMZ filter
    await dmzBtn.click()
    await expect(dmzBtn).toHaveClass(/active/)

    // Click INTERNAL filter
    await internalBtn.click()
    await expect(internalBtn).toHaveClass(/active/)

    // Click CROWN filter
    await crownBtn.click()
    await expect(crownBtn).toHaveClass(/active/)

    // Click ALL filter
    await allBtn.click()
    await expect(allBtn).toHaveClass(/active/)

    // Node inspection: click CORE APP
    const coreNode = page.locator('.node-card-group', { hasText: 'CORE APP' })
    await coreNode.click()
    const drawer = page.locator('.incident-drawer')
    await expect(drawer).toBeVisible()
    await expect(drawer).toContainText('srv-app-core.sec.local')

    // Close inspection drawer
    await page.locator('.btn-icon-close').click()
    await expect(drawer).not.toBeVisible()
  })

  test('6. Findings Module & Evidence Drawer', async ({ page }) => {
    await page.locator('.nav-item', { hasText: 'Findings' }).click()
    await expect(page.locator('.cg-table')).toBeVisible()

    // Click first finding row
    const firstRow = page.locator('.cg-table tbody tr').first()
    await firstRow.click()

    const drawer = page.locator('.drawer-panel')
    await expect(drawer).toBeVisible()
    await expect(drawer).toContainText('Raw Flow Evidence')

    // Close drawer
    await page.locator('.btn-close').click()
    await expect(drawer).not.toBeVisible()
  })

  test('7. Assets Module Master-Detail Workbench', async ({ page }) => {
    await page.locator('.nav-item', { hasText: 'Assets' }).click()
    await expect(page.locator('.cg-table')).toBeVisible()

    // Click on srv-app-core
    const assetRow = page.locator('.clickable-row', { hasText: 'srv-app-core.sec.local' })
    await assetRow.click()

    // Full-page workbench view rendered
    await expect(page.locator('.asset-hero-title')).toContainText('srv-app-core.sec.local')
    await expect(page.locator('text=Hardware & Identity Profile')).toBeVisible()
    await expect(page.locator('text=Listening Network Services')).toBeVisible()

    // Back to inventory table
    await page.locator('button', { hasText: 'Back to Asset Inventory' }).click()
    await expect(page.locator('.cg-table')).toBeVisible()
  })

  test('8. Wire NIDS — Dynamic Interface Dropdown & Error-Free Sensor Control', async ({ page }) => {
    await page.locator('.nav-item', { hasText: 'Wire NIDS' }).click()
    await expect(page.locator('h2')).toContainText('Wire NIDS Sensor')

    // Interface select element
    const ifaceSelect = page.locator('.nids-interface-select')
    await expect(ifaceSelect).toBeVisible()
    const options = await ifaceSelect.locator('option').allTextContents()
    expect(options.length).toBeGreaterThan(0)
    expect(options.some(opt => opt.includes('en0') || opt.includes('lo0'))).toBeTruthy()

    // Refresh button
    const refreshBtn = page.locator('button', { hasText: 'Refresh' })
    await expect(refreshBtn).toBeVisible()
    await refreshBtn.click()

    // Click Start Capture and verify NO HTTP 422 error banner appears
    const startBtn = page.locator('button', { hasText: 'Start Capture' })
    await expect(startBtn).toBeVisible()
    await startBtn.click()

    // Verify error banner does NOT show "HTTP 422"
    const errorBanner = page.locator('.nids-error-banner')
    if (await errorBanner.isVisible()) {
      const errorText = await errorBanner.textContent()
      expect(errorText).not.toContain('422')
    }
  })

  test('9. Automation & Insights Modules (Playbooks, Jobs, Integrations, Reports, Learn)', async ({ page }) => {
    // 9.1 Playbooks View
    await page.locator('.nav-item', { hasText: 'Playbooks' }).click()
    await expect(page.locator('.discovery-header-copy h2')).toContainText('Automated Defense Playbooks')
    await expect(page.locator('.cg-card').first()).toBeVisible()
    const runPlaybookBtn = page.locator('button', { hasText: 'Run Playbook' }).first()
    await runPlaybookBtn.click()
    await page.waitForTimeout(600)

    // 9.2 Jobs & Runs View
    await page.locator('.nav-item', { hasText: 'Jobs & Runs' }).click()
    await expect(page.locator('.discovery-header-copy h2')).toContainText('Background Jobs & Worker Execution Queue')
    await expect(page.locator('.cg-table')).toBeVisible()
    const enqueueBtn = page.locator('button', { hasText: 'Enqueue Discovery Scan' })
    await enqueueBtn.click()
    await expect(page.locator('.cg-card').first()).toBeVisible()

    // 9.3 Integrations View
    await page.locator('.nav-item', { hasText: 'Integrations' }).click()
    await expect(page.locator('.discovery-header-copy h2')).toContainText('Security Integrations & Telemetry Connectors')
    const configBtn = page.locator('button', { hasText: 'Configure Connection' }).first()
    await configBtn.click()
    const configModal = page.locator('.modal-backdrop')
    await expect(configModal).toBeVisible()
    await page.locator('button', { hasText: 'Cancel' }).click()
    await expect(configModal).not.toBeVisible()

    // 9.4 Reports View
    await page.locator('.nav-item', { hasText: 'Reports' }).click()
    await expect(page.locator('.discovery-header-copy h2')).toContainText('Security Assessment & Forensics Reports')
    const inspectBtn = page.locator('button', { hasText: 'View Full Report' }).first()
    await inspectBtn.click()
    const reportModal = page.locator('.modal-backdrop')
    await expect(reportModal).toBeVisible()
    await page.locator('button', { hasText: 'Close' }).click()
    await expect(reportModal).not.toBeVisible()

    // 9.5 Learn View
    await page.locator('.nav-item', { hasText: 'Learn' }).click()
    await expect(page.locator('.discovery-header-copy h2')).toContainText('Platform Knowledge Base & Intelligence Core')
    const mitreTab = page.locator('button', { hasText: 'MITRE ATT&CK Mapping' })
    await mitreTab.click()
    await expect(page.locator('.cg-card h3')).toContainText('MITRE ATT&CK Matrix Alignment')
  })
})
