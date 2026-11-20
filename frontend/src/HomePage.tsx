import React, { useState } from 'react'
import { Zap, ArrowRight, Play } from 'lucide-react'
import HomeNavbar from './components/home/HomeNavbar'
import EarthHero3D from './components/home/EarthHero3D'
import CapabilityStrip from './components/home/CapabilityStrip'
import PlatformCapabilities from './components/home/PlatformCapabilities'
import LiveTwinShowcase from './components/home/LiveTwinShowcase'
import DefenseLoopSection from './components/home/DefenseLoopSection'
import EvidenceArchitecture from './components/home/EvidenceArchitecture'
import SecuritySafetySection from './components/home/SecuritySafetySection'
import ArchitectureDiagram from './components/home/ArchitectureDiagram'
import HomeFooter from './components/home/HomeFooter'
import VideoOverviewModal from './components/home/VideoOverviewModal'
import './HomePage.css'

interface HomePageProps {
  onLaunchConsole: () => void
  isAuthenticated?: boolean
}

export const HomePage: React.FC<HomePageProps> = ({
  onLaunchConsole,
  isAuthenticated = false,
}) => {
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false)
  const [parallaxOffset, setParallaxOffset] = useState({ x: 0, y: 0 })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1
    setParallaxOffset({ x, y })
  }

  const handleMouseLeave = () => {
    setParallaxOffset({ x: 0, y: 0 })
  }

  return (
    <div className="cyberguard-home-root">
      {/* Background Cybernetic Ambient Layer */}
      <div className="home-ambient-glow" aria-hidden="true" />
      <div className="home-grid-pattern" aria-hidden="true" />

      {/* 1. Sticky Navigation Header */}
      <HomeNavbar
        onLaunchConsole={onLaunchConsole}
        isAuthenticated={isAuthenticated}
      />

      {/* 2. Hero Section — Cinematic Split Experience */}
      <section
        className="home-hero-split"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div className="hero-inner-container">
          {/* Left Column: Headlines & Actions */}
          <div className="hero-left-content">
            <div className="hero-eyebrow-pill">
              <Zap size={13} className="text-cyan" />
              <span>AUTONOMOUS CYBER DEFENSE &amp; DIGITAL TWIN PLATFORM</span>
            </div>

            <h1 className="hero-title-main">
              Predict. Protect. Respond.<br />
              <span className="hero-title-cyan">Before Threats Strike.</span>
            </h1>

            <p className="hero-paragraph">
              An evidence-driven security platform engineered to observe live network infrastructure,
              simulate lateral attack paths through a Cyber Digital Twin, estimate breach blast radius with trained ML,
              and execute calibrated defensive countermeasures.
            </p>

            <div className="hero-buttons-row">
              <button
                type="button"
                className="btn-hero-primary"
                onClick={onLaunchConsole}
              >
                <span>{isAuthenticated ? 'Enter Operator Console' : 'Access Operator Console'}</span>
                <ArrowRight size={16} />
              </button>

              <button
                type="button"
                className="btn-hero-secondary"
                onClick={() => setIsVideoModalOpen(true)}
              >
                <div className="play-icon-box">
                  <Play size={13} fill="currentColor" />
                </div>
                <span>Watch Platform Overview</span>
                <span className="duration-tag">2 min</span>
              </button>
            </div>
          </div>

          {/* Right Column: 3D Earth with Orbit Trajectories & Telemetry Cards */}
          <div className="hero-right-visual">
            <div className="hero-earth-viewport">
              <EarthHero3D
                parallaxTarget={parallaxOffset}
                eventsCount="5.2M"
                activeThreatsCount="12"
                assetsMonitoredCount="1,284"
              />
            </div>
          </div>
        </div>

        {/* Horizontal Capability Indicators Strip (Directly Below Hero Content) */}
        <CapabilityStrip />
      </section>

      {/* 3. Platform Capabilities Cards Section */}
      <PlatformCapabilities onLaunchConsole={onLaunchConsole} />

      {/* 4. Product Preview — Live Digital Twin & Attack Simulation */}
      <LiveTwinShowcase onLaunchConsole={onLaunchConsole} />

      {/* 5. Six-Stage Defence Intelligence Loop */}
      <DefenseLoopSection />

      {/* 6. Strict Data Provenance Architecture */}
      <EvidenceArchitecture />

      {/* 7. Safety Guardrails & Emergency Controls */}
      <SecuritySafetySection />

      {/* 8. System Architecture Diagram */}
      <ArchitectureDiagram />

      {/* 9. Comprehensive Footer with Final CTA */}
      <HomeFooter onLaunchConsole={onLaunchConsole} />

      {/* 10. Interactive Video Overview Modal */}
      <VideoOverviewModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        onLaunchConsole={onLaunchConsole}
      />
    </div>
  )
}

export default HomePage
