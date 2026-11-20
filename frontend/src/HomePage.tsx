import React, { useState, useEffect, useRef } from 'react'
import * as THREE from 'three'
import {
  Shield,
  Zap,
  ArrowRight,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  Activity,
  ChevronDown,
  Terminal,
  Menu,
  X,
  Box,
  GitBranch,
  Cpu,
  Lock,
  Network,
  Radio,
  Eye,
  FileSearch,
  BarChart3,
  ExternalLink,
  FileCheck2,
  BookOpen,
  FileCode,
  Users,
  AlertOctagon,
  Server,
  Database,
} from 'lucide-react'
import './HomePage.css'

interface HomePageProps {
  onLaunchConsole: () => void
  isAuthenticated?: boolean
}

function isWebGLAvailable(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl2') ||
          canvas.getContext('webgl') ||
          canvas.getContext('experimental-webgl')),
    )
  } catch {
    return false
  }
}

/* ==========================================================================
   LOCAL 3D EARTH HERO COMPONENT (Calibrated, Natural Sunlight, No Overexposure)
   ========================================================================== */
interface LocalEarth3DProps {
  parallaxTarget?: { x: number; y: number }
  onLoaded?: () => void
}

const LocalEarth3D: React.FC<LocalEarth3DProps> = ({
  parallaxTarget = { x: 0, y: 0 },
  onLoaded,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isReady, setIsReady] = useState(false)
  const isReadyRef = useRef(false)
  const parallaxRef = useRef(parallaxTarget)

  useEffect(() => {
    parallaxRef.current = parallaxTarget
  }, [parallaxTarget])

  useEffect(() => {
    if (!containerRef.current) return

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion || !isWebGLAvailable()) return

    const container = containerRef.current
    const width = container.clientWidth || 640
    const height = container.clientHeight || 540

    // 1. Scene, Camera, WebGLRenderer
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100)
    camera.position.set(0, 0, 4.5)

    let renderer: THREE.WebGLRenderer | null = null
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      })
    } catch {
      return
    }

    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.02
    renderer.outputColorSpace = THREE.SRGBColorSpace

    const canvas = renderer.domElement
    canvas.style.position = 'absolute'
    canvas.style.inset = '0'
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.pointerEvents = 'none'
    container.appendChild(canvas)

    // 2. Earth Group (23.4° axial tilt)
    const earthGroup = new THREE.Group()
    earthGroup.rotation.z = (23.4 * Math.PI) / 180
    earthGroup.position.set(0.18, -0.04, 0)
    scene.add(earthGroup)

    // 3. Balanced Sunlight (No blowout hotspot, natural sunlight vector)
    const sunDirection = new THREE.Vector3(3.8, 2.0, 3.4).normalize()
    const sunLight = new THREE.DirectionalLight(0xfff8ee, 1.35)
    sunLight.position.copy(sunDirection.clone().multiplyScalar(5))
    scene.add(sunLight)

    // Gentle ambient light so dark hemisphere retains subtle planetary presence
    const ambientLight = new THREE.AmbientLight(0x0a101d, 0.55)
    scene.add(ambientLight)

    // Soft cyan Rayleigh atmospheric backlight
    const rimLight = new THREE.DirectionalLight(0x00c8e0, 0.45)
    rimLight.position.set(-5, -2, -3)
    scene.add(rimLight)

    // 4. Load Public Domain NASA Blue Marble Textures
    const loadingManager = new THREE.LoadingManager()
    const textureLoader = new THREE.TextureLoader(loadingManager)

    const earthDayMap = textureLoader.load('/textures/earth/earth_atmos_2048.jpg')
    const earthLightsMap = textureLoader.load('/textures/earth/earth_lights_2048.png')
    const earthCloudsMap = textureLoader.load('/textures/earth/earth_clouds_1024.png')
    const earthSpecularMap = textureLoader.load('/textures/earth/earth_specular_2048.jpg')

    earthDayMap.colorSpace = THREE.SRGBColorSpace
    earthLightsMap.colorSpace = THREE.SRGBColorSpace
    earthCloudsMap.colorSpace = THREE.SRGBColorSpace

    // 5. Earth Shader Material
    const earthRadius = 1.48
    const earthGeometry = new THREE.SphereGeometry(earthRadius, 64, 64)

    const earthMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uDayTexture: { value: earthDayMap },
        uNightTexture: { value: earthLightsMap },
        uSpecularMap: { value: earthSpecularMap },
        uSunDirection: { value: sunDirection },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uDayTexture;
        uniform sampler2D uNightTexture;
        uniform sampler2D uSpecularMap;
        uniform vec3 uSunDirection;

        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          vec3 dayColor = texture2D(uDayTexture, vUv).rgb;
          vec3 nightColor = texture2D(uNightTexture, vUv).rgb;
          float specularMask = texture2D(uSpecularMap, vUv).r;

          vec3 normal = normalize(vNormal);
          float sunDot = dot(normal, uSunDirection);

          // Natural smooth twilight terminator transition
          float dayFactor = smoothstep(-0.22, 0.20, sunDot);

          // Clear, warm electric gold city lights on the night hemisphere
          vec3 nightLights = nightColor * vec3(1.35, 1.15, 0.78) * 1.7 * (1.0 - dayFactor);

          // Natural ocean specular highlight without blowing out into harsh white
          vec3 viewDir = normalize(-vPosition);
          vec3 halfVec = normalize(uSunDirection + viewDir);
          float specFactor = pow(max(dot(normal, halfVec), 0.0), 45.0) * specularMask * dayFactor * 0.45;
          vec3 sunReflection = vec3(0.65, 0.85, 1.0) * specFactor;

          // Natural daytime illumination preserving continental geology
          vec3 illuminatedDay = dayColor * (max(sunDot * 0.85 + 0.15, 0.0) * 0.86 + 0.08);

          // Thin, restrained blue atmospheric Fresnel rim
          float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.2);
          vec3 atmosphereGlow = vec3(0.01, 0.48, 0.88) * fresnel * (max(sunDot, -0.2) + 0.5) * 0.65;

          vec3 finalColor = mix(nightLights, illuminatedDay, dayFactor) + sunReflection + atmosphereGlow;
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
    })

    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial)
    earthGroup.add(earthMesh)

    // 6. Subtle Cloud Sphere (Rotating slightly faster with transparency)
    const cloudsGeometry = new THREE.SphereGeometry(earthRadius + 0.014, 64, 64)
    const cloudsMaterial = new THREE.MeshStandardMaterial({
      map: earthCloudsMap,
      transparent: true,
      opacity: 0.28,
      blending: THREE.NormalBlending,
      depthWrite: false,
      roughness: 0.95,
    })
    const cloudsMesh = new THREE.Mesh(cloudsGeometry, cloudsMaterial)
    earthGroup.add(cloudsMesh)

    // 7. Outer Atmospheric Blue Rim Shell
    const atmosphereGeometry = new THREE.SphereGeometry(earthRadius + 0.038, 48, 48)
    const atmosphereMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.6);
          gl_FragColor = vec4(0.0, 0.78, 0.95, 1.0) * intensity * 0.65;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    })
    const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial)
    earthGroup.add(atmosphereMesh)

    // 8. Restrained, Minimal Orbital Trajectory (1 delicate orbit arc, no visual clutter)
    const orbitGroup = new THREE.Group()
    scene.add(orbitGroup)

    const orbitCurve = new THREE.EllipseCurve(0, 0, 1.95, 1.80, 0, 2 * Math.PI, false, 0)
    const orbitPoints = orbitCurve.getPoints(100).map((p) => new THREE.Vector3(p.x, p.y, 0))
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints)
    const orbitMat = new THREE.LineBasicMaterial({
      color: 0x00ddf5,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
    })
    const orbitLine = new THREE.Line(orbitGeo, orbitMat)
    orbitLine.rotation.set(1.15, 0.45, 0.25)
    orbitLine.position.copy(earthGroup.position)
    orbitGroup.add(orbitLine)

    // 9. When textures finish loading
    loadingManager.onLoad = () => {
      isReadyRef.current = true
      setIsReady(true)
      onLoaded?.()
    }

    // 10. Animation Loop (Delta time based, smooth continuous rotation)
    let animationFrameId: number
    const clock = new THREE.Clock()
    const ROTATION_SPEED = (2 * Math.PI) / 140
    const CLOUD_SPEED = ROTATION_SPEED * 1.15

    let currentParallaxX = 0
    let currentParallaxY = 0

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)
      if (document.hidden) return

      const delta = clock.getDelta()
      if (delta > 0.2) return

      earthMesh.rotation.y += ROTATION_SPEED * delta
      cloudsMesh.rotation.y += CLOUD_SPEED * delta

      const target = parallaxRef.current
      currentParallaxX += (target.x * 0.08 - currentParallaxX) * 0.035
      currentParallaxY += (-target.y * 0.05 - currentParallaxY) * 0.035

      camera.position.x = currentParallaxX
      camera.position.y = currentParallaxY
      camera.lookAt(earthGroup.position.x, earthGroup.position.y, earthGroup.position.z)

      renderer?.render(scene, camera)
    }

    animate()

    // 11. Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = entry.contentRect.width
        const newHeight = entry.contentRect.height
        if (newWidth > 0 && newHeight > 0 && renderer) {
          camera.aspect = newWidth / newHeight
          camera.updateProjectionMatrix()
          renderer.setSize(newWidth, newHeight)
        }
      }
    })
    resizeObserver.observe(container)

    // 12. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId)
      resizeObserver.disconnect()
      if (renderer && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
      earthGeometry.dispose()
      earthMaterial.dispose()
      cloudsGeometry.dispose()
      cloudsMaterial.dispose()
      atmosphereGeometry.dispose()
      atmosphereMaterial.dispose()
      orbitGeo.dispose()
      orbitMat.dispose()
      earthDayMap.dispose()
      earthLightsMap.dispose()
      earthCloudsMap.dispose()
      earthSpecularMap.dispose()
      renderer?.dispose()
      renderer?.forceContextLoss()
    }
  }, [onLoaded])

  return (
    <div
      ref={containerRef}
      className="earth-hero-3d-wrapper"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '480px',
        overflow: 'visible',
      }}
    >
      {/* Restrained Telemetry Badge 1: Events / 24h (Explicitly Marked DEMO) */}
      <div
        className={`floating-telemetry-badge badge-top-left ${isReady ? 'visible' : ''}`}
        style={{ position: 'absolute', top: '10%', left: '5%', zIndex: 10 }}
      >
        <div className="telemetry-badge-content">
          <div className="telemetry-icon-box cyan">
            <Shield size={15} />
          </div>
          <div className="telemetry-text-block">
            <div className="telemetry-top-line">
              <span className="telemetry-value">5.2M</span>
              <span className="telemetry-demo-tag">DEMO</span>
            </div>
            <span className="telemetry-label">Events / 24h</span>
          </div>
        </div>
      </div>

      {/* Restrained Telemetry Badge 2: Active Threats (Explicitly Marked DEMO) */}
      <div
        className={`floating-telemetry-badge badge-right ${isReady ? 'visible' : ''}`}
        style={{ position: 'absolute', top: '38%', right: '4%', zIndex: 10 }}
      >
        <div className="telemetry-badge-content threat">
          <div className="telemetry-icon-box red">
            <AlertTriangle size={15} />
          </div>
          <div className="telemetry-text-block">
            <div className="telemetry-top-line">
              <span className="telemetry-value red">12</span>
              <span className="telemetry-demo-tag red">DEMO</span>
            </div>
            <span className="telemetry-label">Active Threats</span>
          </div>
        </div>
      </div>

      {/* Restrained Telemetry Badge 3: Assets Monitored (Explicitly Marked DEMO) */}
      <div
        className={`floating-telemetry-badge badge-bottom-left ${isReady ? 'visible' : ''}`}
        style={{ position: 'absolute', bottom: '12%', left: '10%', zIndex: 10 }}
      >
        <div className="telemetry-badge-content">
          <div className="telemetry-icon-box teal">
            <Layers size={15} />
          </div>
          <div className="telemetry-text-block">
            <div className="telemetry-top-line">
              <span className="telemetry-value">1,284</span>
              <span className="telemetry-demo-tag">DEMO</span>
            </div>
            <span className="telemetry-label">Assets Monitored</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   MAIN HOMEPAGE ROUTE COMPONENT
   ========================================================================== */
export const HomePage: React.FC<HomePageProps> = ({
  onLaunchConsole,
  isAuthenticated = false,
}) => {
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false)
  const [parallaxOffset, setParallaxOffset] = useState({ x: 0, y: 0 })
  const [activeNavDropdown, setActiveNavDropdown] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Interactive Digital Twin Demo Showcase State
  const [selectedDemoNode, setSelectedDemoNode] = useState<string>('node-comp')
  const [demoSimStep, setDemoSimStep] = useState<number>(2)
  const [isDemoSimulating, setIsDemoSimulating] = useState<boolean>(false)

  // 6-Stage Defense Loop Active Stage State
  const [activeLoopStage, setActiveLoopStage] = useState<number>(0)

  // Interactive Architecture Diagram Active Component State
  const [activeArchComponent, setActiveArchComponent] = useState<string>('sensor')

  // Video Overview Modal Chapter State
  const [activeModalChapter, setActiveModalChapter] = useState<number>(0)
  const [isModalPlaying, setIsModalPlaying] = useState<boolean>(true)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1
    setParallaxOffset({ x, y })
  }

  const handleMouseLeave = () => {
    setParallaxOffset({ x: 0, y: 0 })
  }

  // Capability Strip Data (Meaningful Product Capabilities, Zero Fabricated Metrics)
  const capabilityItems = [
    {
      icon: <Radio size={18} className="strip-icon" />,
      title: 'Live Network Observation',
      desc: 'eBPF passive wire capture inside authorized scopes',
    },
    {
      icon: <Layers size={18} className="strip-icon" />,
      title: 'Six-Stage Defense Intelligence',
      desc: 'Observe, Understand, Simulate, Predict, Defend, Learn',
    },
    {
      icon: <FileSearch size={18} className="strip-icon" />,
      title: 'Evidence-Driven Threat Detection',
      desc: 'Deterministic Snort signatures and CVE correlation',
    },
    {
      icon: <Shield size={18} className="strip-icon" />,
      title: 'Guardrailed Defensive Response',
      desc: 'Human-approved actions with auto-expiring TTLs',
    },
  ]

  // Platform Capabilities 4-Card Data
  const platformCards = [
    {
      id: 'twin',
      title: 'Cyber Digital Twin',
      icon: <Box size={22} />,
      desc: 'A live, high-fidelity model of enterprise infrastructure for safe and realistic attack simulation.',
      points: [
        'Real network topology and trust-zone boundaries',
        'Asset connectivity and credential exposure relationships',
        'Air-gapped safe modeling of enterprise attack surfaces',
      ],
    },
    {
      id: 'simulation',
      title: 'Attack-Path Simulation',
      icon: <GitBranch size={22} />,
      desc: 'Simulate multi-stage lateral movement and identify critical bottleneck exposure paths.',
      points: [
        'Multi-stage lateral attack traversal analysis',
        'k-shortest attack paths and critical bottleneck identification',
        'What-if defensive scenarios and blast-radius estimation',
      ],
    },
    {
      id: 'ml',
      title: 'AI Threat Intelligence',
      icon: <Cpu size={22} />,
      desc: 'Detect, prioritize, and predict threats using trained ML models and behavioral analytics.',
      points: [
        'Supervised network-flow classification models',
        'Unsupervised statistical flow anomaly detection',
        'Explainable asset-risk scoring and CVE correlation',
      ],
    },
    {
      id: 'defense',
      title: 'Automated Response',
      icon: <Zap size={22} />,
      desc: 'Execute calibrated, policy-aware defensive actions in real time under human governance.',
      points: [
        'Four-Eyes human authorization and full audit logging',
        'Precision firewall shuns and lab container isolation',
        'Mandatory TTL expiry, automatic rollback, and Emergency Stop',
      ],
    },
  ]

  // Digital Twin Demonstration Nodes
  const demoNodes = [
    { id: 'node-dmz', name: 'DMZ-Web-01', ip: '192.168.1.10', zone: 'DMZ_EXTERNAL', status: 'normal', x: 18, y: 65 },
    { id: 'node-comp', name: 'Internal-Worker-02', ip: '10.0.2.14', zone: 'CORP_INTERNAL', status: 'compromised', x: 38, y: 75 },
    { id: 'node-core', name: 'Core-App-Cluster', ip: '10.0.3.5', zone: 'SECURE_APPLICATION', status: 'target', x: 58, y: 40 },
    { id: 'node-db', name: 'Prod-Database-01', ip: '10.0.4.88', zone: 'RESTRICTED_DATA', status: 'crown', x: 78, y: 30 },
    { id: 'node-dc', name: 'Identity-DC-01', ip: '10.0.1.2', zone: 'IDENTITY_SERVICES', status: 'normal', x: 44, y: 20 },
  ]

  const demoStages = [
    { name: 'Reconnaissance', duration: '1.2s' },
    { name: 'Initial Access', duration: '2.8s' },
    { name: 'Lateral Movement', duration: '0.9s' },
    { name: 'Privilege Escalation', duration: '3.4s' },
    { name: 'Impact Simulation', duration: '1.8s' },
    { name: 'Response Execution', duration: '0.4s' },
  ]

  const handleNextDemoStep = () => {
    setIsDemoSimulating(true)
    setTimeout(() => {
      setDemoSimStep((prev) => (prev < 5 ? prev + 1 : 0))
      setIsDemoSimulating(false)
    }, 500)
  }

  // 6-Stage Defense Intelligence Loop (All 6 Stages Fully Represented)
  const loopStages = [
    {
      id: '01',
      title: 'Observe',
      icon: <Eye size={20} />,
      tagline: 'Live Network Telemetry',
      desc: 'Passive packet inspection and authorized discovery capturing real network flows inside allowed CIDRs without modifying host state.',
      provenance: 'OBSERVED',
      evidence: 'Captured packet headers, open ports, IP flow byte counters, and timestamps.',
    },
    {
      id: '02',
      title: 'Understand',
      icon: <FileSearch size={20} />,
      tagline: 'Threat Correlation & Signatures',
      desc: 'Correlates raw packet traffic against verified Snort signature rules and CVE vulnerabilities without fabricated alerts.',
      provenance: 'DERIVED',
      evidence: 'Deterministic signature matches, CVSS base metrics, and asset exposure mappings.',
    },
    {
      id: '03',
      title: 'Simulate',
      icon: <Layers size={20} />,
      tagline: 'Attack-Path & Blast Radius Modeling',
      desc: 'In-memory graph modeling host connectivity and trust zones to simulate lateral breach paths and isolate critical choke-points.',
      provenance: 'SIMULATED',
      evidence: 'Graph traversal algorithms, k-shortest breach paths, and blast radius calculations.',
    },
    {
      id: '04',
      title: 'Predict & Decide',
      icon: <BarChart3 size={20} />,
      tagline: 'ML Risk Estimation & Prioritization',
      desc: 'Supervised flow classification and unsupervised anomaly detection prioritize findings based on asset criticality.',
      provenance: 'PREDICTED',
      evidence: 'Trained model feature vectors, anomaly scores, and explainable risk factor weights.',
    },
    {
      id: '05',
      title: 'Defend & Automate',
      icon: <Shield size={20} />,
      tagline: 'Human-Approved Defensive Actions',
      desc: 'Executes firewall shuns and container isolation under Four-Eyes approval with mandatory TTL expiration and Emergency Stop.',
      provenance: 'DERIVED',
      evidence: 'Audit-logged action records, TTL expiration timers, and reversible rule commands.',
    },
    {
      id: '06',
      title: 'Learn',
      icon: <RotateCcw size={20} />,
      tagline: 'Continuous Analyst Feedback',
      desc: 'Captures analyst triage feedback, refines detection thresholds, and records verification outcomes for post-incident review.',
      provenance: 'DERIVED',
      evidence: 'Triage audit logs, resolution notes, and parameter tuning history.',
    },
  ]

  // Provenance Classification Data
  const provenanceItems = [
    {
      badge: 'OBSERVED',
      title: 'Direct Telemetry',
      desc: 'Captured straight from genuine raw network traffic, verified Nmap port scans, or system telemetry.',
      examples: 'Raw packet headers, open ports, IP flow byte counters, TCP handshake flags.',
    },
    {
      badge: 'DERIVED',
      title: 'Deterministic Logic',
      desc: 'Calculated from genuine observations through deterministic logic, CVE matching, or signature rules.',
      examples: 'Snort signature alerts, CVSS vulnerability mappings, MITRE ATT&CK technique tagging.',
    },
    {
      badge: 'PREDICTED',
      title: 'ML Estimations',
      desc: 'Estimated by statistical algorithms or trained machine learning models with known held-out test evaluation.',
      examples: 'RandomForest compromise probability, IsolationForest flow anomaly scores.',
    },
    {
      badge: 'SIMULATED',
      title: 'Twin Graph Traversal',
      desc: 'Generated inside the in-memory digital twin to evaluate hypothetical breach paths without touching real assets.',
      examples: 'Shortest attack path hops, simulated lateral traversal, blast-radius projections.',
    },
  ]

  // Safety Pillars
  const safetyPillars = [
    {
      icon: <Lock size={20} />,
      title: 'PostgreSQL Row-Level Security (RLS)',
      desc: 'Multi-tenant isolation enforced at the database kernel level with session variables. No query can leak cross-organization records.',
    },
    {
      icon: <Network size={20} />,
      title: 'Authorized CIDR Scope Enforcement',
      desc: 'Scans and packet inspection execute strictly within administrator-authorized CIDRs. Out-of-scope targets are rejected at the API gate.',
    },
    {
      icon: <Users size={20} />,
      title: 'Four-Eyes Approval Workflow',
      desc: 'No active defensive countermeasure (such as firewall shuns) executes automatically in production without explicit human analyst confirmation.',
    },
    {
      icon: <Clock size={20} />,
      title: 'Auto-Expiring Time-To-Live (TTL)',
      desc: 'All defensive network shun rules carry mandatory TTL expiration timestamps (default 15–60 min) with deterministic automatic rollback.',
    },
    {
      icon: <CheckCircle2 size={20} />,
      title: 'Role-Based Access Control (RBAC)',
      desc: 'Separation of privileges between Security Analysts, Administrators, and Read-Only Auditors with Firebase cryptographic tokens.',
    },
    {
      icon: <AlertOctagon size={20} />,
      title: 'One-Click Global Emergency Stop',
      desc: 'Hardware/software kill switch that instantly revokes all active firewall shuns and restores normal network routing in under 500 milliseconds.',
    },
  ]

  // Architecture Pipeline Components
  const architectureNodes = [
    { id: 'sensor', name: 'Passive Sensor', tech: 'AF_PACKET / eBPF', role: 'Captures raw packet headers from network interfaces inside authorized CIDRs.', guarantee: 'Non-root capability bounding, zero payload storage, strict scope filtering.' },
    { id: 'api', name: 'FastAPI Engine', tech: 'Python 3.12+ / FastAPI', role: 'High-throughput async REST API & WebSocket server streaming live wire events.', guarantee: 'Firebase Auth token verification, OrgContext RLS dependency injection.' },
    { id: 'db', name: 'PostgreSQL 17 Core', tech: 'Postgres 17 / Alembic', role: 'ACID storage for assets, findings, attack paths, and asynchronous job queue.', guarantee: 'Row-Level Security (RLS) on all tables, audit logging, restore-tested schema.' },
    { id: 'nids', name: 'NIDS Detection', tech: 'Snort Rules + CVE DB', role: 'Evaluates packet flows against community signatures and CVE database indicators.', guarantee: 'Zero synthetic alerts, provenance DERIVED, deterministic rule evaluation.' },
    { id: 'twin', name: 'Digital Twin Graph', tech: 'NetworkX Graph Engine', role: 'In-memory graph modeling hosts, services, credential reuse, and trust zones.', guarantee: 'Air-gapped attack simulation, Dijkstra lateral pathing, blast radius projection.' },
    { id: 'ml', name: 'ML Risk Estimators', tech: 'Scikit-learn RF / IF', role: 'Predicts flow compromise probability and calculates asset risk scores with explainability.', guarantee: 'Held-out test validation, versioned model artifacts, provenance PREDICTED.' },
    { id: 'executor', name: 'Defense Executor', tech: 'iptables / pf / Docker', role: 'Enforces firewall shuns and container isolation with mandatory auto-expiring TTLs.', guarantee: 'Four-Eyes human confirmation, audit logged transitions, 1-click Emergency Stop.' },
  ]

  const activeArch = architectureNodes.find((n) => n.id === activeArchComponent) || architectureNodes[0]

  // Video Tour Chapters
  const tourChapters = [
    { title: '01. Wire-Speed Ingestion', time: '0:00 - 0:28', icon: <Terminal size={14} />, log: '[SENSOR] Interface en0 in promisc mode. Captured packet flow inside authorized CIDR 10.0.0.0/16.' },
    { title: '02. Digital Twin Mapping', time: '0:29 - 0:54', icon: <Layers size={14} />, log: '[TWIN] Graph synchronized: 1,284 assets, 3,412 edges. Identified 3 lateral hops to restricted Database.' },
    { title: '03. Attack Simulation', time: '0:55 - 1:25', icon: <Cpu size={14} />, log: '[SIM] Dijkstra path traversal: Host 10.0.2.14 -> 10.0.3.5 -> 10.0.4.88. Blast radius calculated: 32%.' },
    { title: '04. Calibrated Response', time: '1:26 - 2:00', icon: <Shield size={14} />, log: '[DEFENSE] Four-Eyes approval confirmed by Operator. Deployed iptables DROP rule with 900s TTL.' },
  ]

  return (
    <div className="cyberguard-home-root">
      {/* Background Ambient Glow & Grid Layer */}
      <div className="home-ambient-glow" aria-hidden="true" />
      <div className="home-grid-pattern" aria-hidden="true" />

      {/* 1. Header Navigation Bar */}
      <header className="home-nav-bar">
        <div className="home-nav-container">
          <div className="home-nav-brand">
            <a href="#" className="brand-link">
              <div className="brand-logo-icon">
                <Shield size={20} />
              </div>
              <span className="brand-title">CYBERGUARD-X</span>
            </a>
            <div className="brand-status-indicator">
              <span className="status-ping" />
              <span className="status-label">CORE ENGINE · OPERATIONAL</span>
            </div>
          </div>

          <nav className="home-nav-menu" aria-label="Main Navigation">
            {/* Platform Dropdown */}
            <div
              className={`nav-dropdown ${activeNavDropdown === 'platform' ? 'open' : ''}`}
              onMouseEnter={() => setActiveNavDropdown('platform')}
              onMouseLeave={() => setActiveNavDropdown(null)}
            >
              <button
                type="button"
                className="nav-link-btn"
                onClick={() => setActiveNavDropdown((prev) => (prev === 'platform' ? null : 'platform'))}
                aria-expanded={activeNavDropdown === 'platform'}
              >
                <span>Platform</span>
                <ChevronDown size={14} className="chevron-icon" />
              </button>

              <div className="dropdown-panel">
                <a href="#twin" className="dropdown-item" onClick={() => setActiveNavDropdown(null)}>
                  <div className="dropdown-item-icon"><Layers size={16} /></div>
                  <div className="dropdown-item-text">
                    <span className="item-title">Cyber Digital Twin</span>
                    <span className="item-desc">High-fidelity topology &amp; trust zones</span>
                  </div>
                </a>
                <a href="#capabilities" className="dropdown-item" onClick={() => setActiveNavDropdown(null)}>
                  <div className="dropdown-item-icon"><GitBranch size={16} /></div>
                  <div className="dropdown-item-text">
                    <span className="item-title">Attack-Path Simulation</span>
                    <span className="item-desc">Lateral movement &amp; blast radius estimation</span>
                  </div>
                </a>
                <a href="#loop" className="dropdown-item" onClick={() => setActiveNavDropdown(null)}>
                  <div className="dropdown-item-icon"><Activity size={16} /></div>
                  <div className="dropdown-item-text">
                    <span className="item-title">Six-Stage Defense Loop</span>
                    <span className="item-desc">Observe, Understand, Simulate, Predict, Defend, Learn</span>
                  </div>
                </a>
                <a href="#architecture" className="dropdown-item" onClick={() => setActiveNavDropdown(null)}>
                  <div className="dropdown-item-icon"><Cpu size={16} /></div>
                  <div className="dropdown-item-text">
                    <span className="item-title">System Architecture</span>
                    <span className="item-desc">FastAPI, BPF sensor &amp; Postgres RLS</span>
                  </div>
                </a>
              </div>
            </div>

            {/* Solutions Dropdown */}
            <div
              className={`nav-dropdown ${activeNavDropdown === 'solutions' ? 'open' : ''}`}
              onMouseEnter={() => setActiveNavDropdown('solutions')}
              onMouseLeave={() => setActiveNavDropdown(null)}
            >
              <button
                type="button"
                className="nav-link-btn"
                onClick={() => setActiveNavDropdown((prev) => (prev === 'solutions' ? null : 'solutions'))}
                aria-expanded={activeNavDropdown === 'solutions'}
              >
                <span>Solutions</span>
                <ChevronDown size={14} className="chevron-icon" />
              </button>

              <div className="dropdown-panel">
                <a href="#provenance" className="dropdown-item" onClick={() => setActiveNavDropdown(null)}>
                  <div className="dropdown-item-icon"><Lock size={16} /></div>
                  <div className="dropdown-item-text">
                    <span className="item-title">Zero Fake Telemetry</span>
                    <span className="item-desc">Verifiable OBSERVED &amp; DERIVED provenance</span>
                  </div>
                </a>
                <a href="#safety" className="dropdown-item" onClick={() => setActiveNavDropdown(null)}>
                  <div className="dropdown-item-icon"><Shield size={16} /></div>
                  <div className="dropdown-item-text">
                    <span className="item-title">Defense with Four-Eyes</span>
                    <span className="item-desc">Human-approved actions &amp; TTL shuns</span>
                  </div>
                </a>
              </div>
            </div>

            {/* Resources Dropdown */}
            <div
              className={`nav-dropdown ${activeNavDropdown === 'resources' ? 'open' : ''}`}
              onMouseEnter={() => setActiveNavDropdown('resources')}
              onMouseLeave={() => setActiveNavDropdown(null)}
            >
              <button
                type="button"
                className="nav-link-btn"
                onClick={() => setActiveNavDropdown((prev) => (prev === 'resources' ? null : 'resources'))}
                aria-expanded={activeNavDropdown === 'resources'}
              >
                <span>Resources</span>
                <ChevronDown size={14} className="chevron-icon" />
              </button>

              <div className="dropdown-panel">
                <a href="#architecture" className="dropdown-item" onClick={() => setActiveNavDropdown(null)}>
                  <div className="dropdown-item-icon"><BookOpen size={16} /></div>
                  <div className="dropdown-item-text">
                    <span className="item-title">Technical Specifications</span>
                    <span className="item-desc">REST API, WebSocket contracts &amp; schemas</span>
                  </div>
                </a>
                <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer" className="dropdown-item" onClick={() => setActiveNavDropdown(null)}>
                  <div className="dropdown-item-icon"><FileCode size={16} /></div>
                  <div className="dropdown-item-text">
                    <span className="item-title">OpenAPI / Swagger Docs</span>
                    <span className="item-desc">Interactive API reference</span>
                  </div>
                </a>
              </div>
            </div>

            {/* Company Dropdown */}
            <div
              className={`nav-dropdown ${activeNavDropdown === 'company' ? 'open' : ''}`}
              onMouseEnter={() => setActiveNavDropdown('company')}
              onMouseLeave={() => setActiveNavDropdown(null)}
            >
              <button
                type="button"
                className="nav-link-btn"
                onClick={() => setActiveNavDropdown((prev) => (prev === 'company' ? null : 'company'))}
                aria-expanded={activeNavDropdown === 'company'}
              >
                <span>Company</span>
                <ChevronDown size={14} className="chevron-icon" />
              </button>

              <div className="dropdown-panel">
                <a href="https://github.com/Krishnanegi09/CyberGuard-X" target="_blank" rel="noreferrer" className="dropdown-item" onClick={() => setActiveNavDropdown(null)}>
                  <div className="dropdown-item-icon"><Users size={16} /></div>
                  <div className="dropdown-item-text">
                    <span className="item-title">Engineering Team</span>
                    <span className="item-desc">BTech CSE Major Project Architecture</span>
                  </div>
                </a>
              </div>
            </div>
          </nav>

          <div className="home-nav-actions">
            <a
              href="https://github.com/Krishnanegi09/CyberGuard-X"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-github-ghost"
              title="View Source on GitHub"
            >
              <Terminal size={14} />
              <span>GitHub</span>
            </a>

            <button
              type="button"
              className="btn-launch-console"
              onClick={onLaunchConsole}
            >
              <span>{isAuthenticated ? 'Open SOC Console' : 'Launch Console'}</span>
              <ArrowRight size={14} />
            </button>

            <button
              type="button"
              className="btn-mobile-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="mobile-nav-drawer">
            <a href="#twin" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>Cyber Digital Twin</a>
            <a href="#capabilities" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>Platform Capabilities</a>
            <a href="#loop" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>6-Stage Defense Loop</a>
            <a href="#provenance" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>Evidence Provenance</a>
            <a href="#architecture" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>Architecture Specs</a>
            <div className="mobile-actions">
              <button
                type="button"
                className="btn-launch-console w-full"
                onClick={() => {
                  setMobileMenuOpen(false)
                  onLaunchConsole()
                }}
              >
                <span>{isAuthenticated ? 'Open SOC Console' : 'Launch Console'}</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}
      </header>

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

          {/* Right Column: Calibrated 3D Earth */}
          <div className="hero-right-visual">
            <div className="hero-earth-viewport">
              <LocalEarth3D
                parallaxTarget={parallaxOffset}
              />
            </div>
          </div>
        </div>

        {/* Horizontal Capability Indicators Strip (Directly Below Hero Content) */}
        <div className="capability-strip-container" style={{ marginTop: '28px' }}>
          <div className="capability-strip-grid">
            {capabilityItems.map((cap, idx) => (
              <div key={idx} className="capability-strip-item">
                <div className="strip-item-icon-box">
                  {cap.icon}
                </div>
                <div className="strip-item-content">
                  <span className="strip-item-value" style={{ fontSize: '14px', letterSpacing: '0' }}>{cap.title}</span>
                  <span className="strip-item-label" style={{ fontSize: '11.5px' }}>{cap.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Platform Capabilities Section (Deliberate Spacing, 4 Cards) */}
      <section id="capabilities" className="capabilities-section" style={{ marginTop: '48px' }}>
        <div className="section-header-row">
          <div className="section-title-group">
            <span className="eyebrow-badge">PLATFORM CAPABILITIES</span>
            <h2 className="section-main-heading">A Unified Cyber Defense Platform</h2>
            <p className="section-sub-heading">
              One connected intelligence layer for observing, understanding, predicting, and defending enterprise infrastructure.
            </p>
          </div>

          <button
            type="button"
            className="section-explore-link"
            onClick={onLaunchConsole}
          >
            <span>Explore In Console</span>
            <ArrowRight size={15} />
          </button>
        </div>

        <div className="capabilities-cards-grid">
          {platformCards.map((card) => (
            <div key={card.id} className="capability-card" tabIndex={0}>
              <div className="card-top-row">
                <div className="card-icon-wrapper">
                  {card.icon}
                </div>
                <button
                  type="button"
                  className="card-arrow-btn"
                  onClick={onLaunchConsole}
                  aria-label={`Open ${card.title} console`}
                >
                  <ArrowRight size={14} />
                </button>
              </div>

              <h3 className="card-title">{card.title}</h3>
              <p className="card-description">{card.desc}</p>

              <div className="card-highlights-list">
                {card.points.map((p, i) => (
                  <div key={i} className="highlight-item">
                    <CheckCircle2 size={13} className="check-icon" />
                    <span>{p}</span>
                  </div>
                ))}
              </div>

              <div className="card-bottom-accent" />
            </div>
          ))}
        </div>
      </section>

      {/* 4. Product Preview — Digital Twin & Attack Simulation (Labeled Illustrative Demo) */}
      <section id="twin" className="twin-showcase-section" style={{ marginTop: '64px' }}>
        <div className="showcase-container">
          {/* Top Header Bar with Explicit Demonstration Label */}
          <div className="showcase-header-bar">
            <div className="showcase-header-left">
              <div className="window-dots">
                <span className="dot red" />
                <span className="dot yellow" />
                <span className="dot green" />
              </div>
              <div className="showcase-title-badge">
                <Layers size={14} />
                <span>CYBER DIGITAL TWIN // SIMULATION WORKFLOW DEMO</span>
              </div>
            </div>

            <div className="showcase-header-right">
              <span className="live-simulation-tag" style={{ background: 'rgba(0, 221, 245, 0.1)', borderColor: 'rgba(0, 221, 245, 0.3)', color: '#00ddf5' }}>
                <span className="tag-ping" style={{ background: '#00ddf5' }} />
                ILLUSTRATIVE DEMO PREVIEW
              </span>
            </div>
          </div>

          <div className="showcase-split-grid">
            {/* Left Panel: Topology Demo */}
            <div className="showcase-left-panel">
              <div className="panel-badge-row">
                <span className="panel-badge">
                  <Radio size={13} className="text-cyan" />
                  <span>Network Topology Model</span>
                </span>
                <span className="status-indicator-green" style={{ color: '#00ddf5' }}>
                  <span className="dot-pulse" style={{ background: '#00ddf5' }} />
                  Demonstration Preview
                </span>
              </div>

              <div className="isometric-topology-canvas">
                <svg className="topology-svg-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="cyanTraceDemo" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00ddf5" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#00c89a" stopOpacity="0.4" />
                    </linearGradient>
                    <linearGradient id="alertTraceDemo" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ff4d5d" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#00ddf5" stopOpacity="0.3" />
                    </linearGradient>
                  </defs>

                  <line x1="10" y1="20" x2="90" y2="20" stroke="rgba(36,51,65,0.4)" strokeWidth="0.4" strokeDasharray="1 2" />
                  <line x1="10" y1="50" x2="90" y2="50" stroke="rgba(36,51,65,0.4)" strokeWidth="0.4" strokeDasharray="1 2" />
                  <line x1="10" y1="80" x2="90" y2="80" stroke="rgba(36,51,65,0.4)" strokeWidth="0.4" strokeDasharray="1 2" />

                  {/* Solid Observed vs Dashed Simulated Traces */}
                  <path d="M 18 65 L 38 75" stroke="url(#cyanTraceDemo)" strokeWidth="1" />
                  <path d="M 38 75 L 58 40" stroke="url(#alertTraceDemo)" strokeWidth="1.4" strokeDasharray="2 1" />
                  <path d="M 58 40 L 78 30" stroke="url(#cyanTraceDemo)" strokeWidth="1.2" />
                  <path d="M 58 40 L 44 20" stroke="url(#cyanTraceDemo)" strokeWidth="0.8" />
                </svg>

                {demoNodes.map((node) => {
                  const isSelected = selectedDemoNode === node.id
                  const isCompromised = node.status === 'compromised'
                  const isCrown = node.status === 'crown'

                  return (
                    <div
                      key={node.id}
                      className={`topology-node-card ${node.status} ${isSelected ? 'selected' : ''}`}
                      style={{ left: `${node.x}%`, top: `${node.y}%` }}
                      onClick={() => setSelectedDemoNode(node.id)}
                    >
                      <div className="node-icon-box">
                        {isCrown ? <Database size={17} /> : isCompromised ? <AlertTriangle size={17} /> : <Server size={17} />}
                        {isCompromised && <span className="compromised-pulse-ring" />}
                      </div>

                      <div className="node-info-tooltip">
                        <span className="tooltip-name">{node.name}</span>
                        <span className="tooltip-ip">{node.ip}</span>
                      </div>
                    </div>
                  )
                })}

                <div className="topology-node-detail-bar">
                  {(() => {
                    const current = demoNodes.find((n) => n.id === selectedDemoNode) || demoNodes[1]
                    return (
                      <>
                        <div className="detail-meta">
                          <span className="meta-zone">{current.zone}</span>
                          <span className="meta-name">{current.name}</span>
                          <span className="meta-ip">{current.ip}</span>
                        </div>
                        <div className="detail-status">
                          <span className={`status-pill ${current.status}`}>
                            {current.status.toUpperCase()}
                          </span>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </div>

              {/* Safe Action Buttons (No accidental execution of real defensive actions from public page) */}
              <div className="topology-action-bar">
                <button
                  type="button"
                  className="btn-action-simulate"
                  onClick={handleNextDemoStep}
                  disabled={isDemoSimulating}
                >
                  <Play size={13} />
                  <span>{isDemoSimulating ? 'Stepping...' : 'Advance Stage (Demo)'}</span>
                </button>

                <button
                  type="button"
                  className="btn-action-shun"
                  style={{ background: 'rgba(0, 200, 154, 0.12)', borderColor: '#00c89a', color: '#00c89a' }}
                  onClick={onLaunchConsole}
                >
                  <Shield size={13} />
                  <span>Explore Response Workflow</span>
                </button>

                <button
                  type="button"
                  className="btn-action-reset"
                  onClick={() => setDemoSimStep(2)}
                >
                  <RotateCcw size={13} />
                  <span>Reset Demo</span>
                </button>
              </div>
            </div>

            {/* Right Panel: Attack Simulation Workflow */}
            <div className="showcase-right-panel">
              <div className="panel-badge-row">
                <span className="panel-badge">
                  <GitBranch size={14} className="text-cyan" />
                  <span>Attack Simulation Lifecycle</span>
                </span>
                <span className="telemetry-demo-tag" style={{ marginLeft: 'auto' }}>DEMO WORKFLOW</span>
              </div>

              <div className="simulation-lifecycle-list">
                {demoStages.map((stage, idx) => {
                  const isCompleted = idx < demoSimStep
                  const isInProgress = idx === demoSimStep
                  const isPending = idx > demoSimStep

                  return (
                    <div
                      key={stage.name}
                      className={`lifecycle-stage-row ${
                        isCompleted ? 'completed' : isInProgress ? 'in-progress' : 'pending'
                      }`}
                    >
                      <div className="stage-marker">
                        {isCompleted ? (
                          <CheckCircle2 size={15} className="marker-icon completed" />
                        ) : isInProgress ? (
                          <span className="marker-dot active-pulse" />
                        ) : (
                          <span className="marker-dot pending" />
                        )}
                      </div>

                      <div className="stage-name-col">
                        <span className="stage-name">{stage.name}</span>
                      </div>

                      <div className="stage-status-col">
                        {isCompleted && <span className="stage-tag completed">Completed · {stage.duration}</span>}
                        {isInProgress && <span className="stage-tag in-progress">In Progress · {stage.duration}</span>}
                        {isPending && <span className="stage-tag pending">Pending</span>}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="simulation-insights-card">
                <div className="insights-card-title">
                  <Clock size={13} />
                  <span>Simulation Insights (Demonstration Model)</span>
                </div>

                <div className="insights-metrics-grid">
                  <div className="insight-metric-item full-width">
                    <div className="metric-header-row">
                      <span className="metric-label">Estimated Blast Radius</span>
                      <span className="metric-value-num" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {demoSimStep >= 4 ? 85 : demoSimStep >= 2 ? 32 : 12}%
                      </span>
                    </div>
                    <div className="blast-progress-track">
                      <div
                        className="blast-progress-fill"
                        style={{ width: `${demoSimStep >= 4 ? 85 : demoSimStep >= 2 ? 32 : 12}%` }}
                      />
                    </div>
                  </div>

                  <div className="insight-metric-item">
                    <span className="metric-label">Affected Assets</span>
                    <span className="metric-value-num large" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {demoSimStep >= 4 ? 38 : demoSimStep >= 2 ? 14 : 4}
                    </span>
                  </div>

                  <div className="insight-metric-item">
                    <span className="metric-label">Risk Category</span>
                    <span className={`risk-badge-pill ${demoSimStep >= 4 ? 'critical' : 'high'}`}>
                      {demoSimStep >= 4 ? 'Critical' : 'High'}
                    </span>
                  </div>

                  <div className="insight-metric-item">
                    <span className="metric-label">Estimated Traversal</span>
                    <span className="metric-value-num mono">~ 18 min</span>
                  </div>
                </div>
              </div>

              <div className="showcase-footer-link">
                <button
                  type="button"
                  className="btn-deep-dive"
                  onClick={onLaunchConsole}
                >
                  <span>Launch Operator Console for Full Twin</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Six-Stage Defense Intelligence Loop (All 6 Stages Connected & Interactive) */}
      <section id="loop" className="defense-loop-section" style={{ marginTop: '72px' }}>
        <div className="loop-header-group">
          <span className="eyebrow-badge">BUILT FOR MODERN SECURITY TEAMS</span>
          <h2 className="loop-main-heading">From Visibility to Autonomous Defense</h2>
          <p className="loop-sub-heading">
            A continuous six-stage intelligence loop connecting raw wire packet observations to calibrated defense.
          </p>
        </div>

        {/* Connected Process Flow Bar — All 6 Stages Represented */}
        <div className="horizontal-process-strip">
          <div className="process-strip-inner" style={{ minWidth: '940px' }}>
            {loopStages.map((stage, idx) => (
              <React.Fragment key={stage.id}>
                <div
                  className={`process-step-node ${activeLoopStage === idx ? 'active' : ''}`}
                  onClick={() => setActiveLoopStage(idx)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="step-icon-circle">
                    {stage.icon}
                  </div>
                  <div className="step-text-group">
                    <span className="step-title">{stage.id} · {stage.title}</span>
                    <span className="step-tagline">{stage.tagline}</span>
                  </div>
                </div>

                {idx < loopStages.length - 1 && (
                  <div className="process-arrow-divider">
                    <ArrowRight size={16} />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* 6 Stage Detailed Cards Grid */}
        <div className="stages-detail-grid">
          {loopStages.map((stage, idx) => {
            const isActive = activeLoopStage === idx

            return (
              <div
                key={stage.id}
                className={`stage-detail-card ${isActive ? 'active-stage' : ''}`}
                onClick={() => setActiveLoopStage(idx)}
              >
                <div className="stage-top-header">
                  <span className="stage-number">{stage.id}</span>
                  <span className={`stage-provenance-tag ${stage.provenance.toLowerCase()}`}>
                    {stage.provenance}
                  </span>
                </div>

                <div className="stage-title-row">
                  <div className="stage-card-icon">{stage.icon}</div>
                  <h3 className="stage-card-title">{stage.title}</h3>
                </div>

                <p className="stage-card-desc">{stage.desc}</p>

                <div className="stage-telemetry-box">
                  <span className="telemetry-box-label">AUDITED EVIDENCE:</span>
                  <p className="telemetry-box-text">{stage.evidence}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* 6. Strict Data Provenance Architecture */}
      <section id="provenance" className="provenance-section" style={{ marginTop: '72px' }}>
        <div className="section-header-centered">
          <span className="eyebrow-badge">STRICT DATA PROVENANCE</span>
          <h2 className="section-main-heading">Zero Fake Data. Every Record Verifiable.</h2>
          <p className="section-sub-heading max-w-2xl">
            CYBERGUARD-X enforces a strict four-category provenance model across all API responses, database records, and UI views.
            We never fabricate synthetic operational metrics to make dashboards look populated.
          </p>
        </div>

        <div className="provenance-cards-grid">
          {provenanceItems.map((item) => (
            <div key={item.badge} className="provenance-card">
              <div className="provenance-card-header">
                <span className={`provenance-badge-pill ${item.badge.toLowerCase()}`}>
                  {item.badge}
                </span>
                <div className="provenance-icon-box">
                  <FileCheck2 size={18} />
                </div>
              </div>

              <h3 className="provenance-title">{item.title}</h3>
              <p className="provenance-desc">{item.desc}</p>

              <div className="provenance-example-box">
                <span className="example-label">AUDITED ATTRIBUTES:</span>
                <p className="example-text">{item.examples}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="provenance-guarantee-banner">
          <div className="guarantee-icon">
            <CheckCircle2 size={22} className="text-cyan" />
          </div>
          <div className="guarantee-content">
            <span className="guarantee-heading">Strict Forensic Integrity Guarantee</span>
            <p className="guarantee-text">
              If an environment has zero observed packets or open ports, CYBERGUARD-X renders a clean empty state rather than inventing hypothetical assets.
              Every security finding is linked to raw network evidence or deterministic correlation.
            </p>
          </div>
        </div>
      </section>

      {/* 7. Enterprise Safety Guardrails */}
      <section id="safety" className="safety-section" style={{ marginTop: '72px' }}>
        <div className="section-header-centered">
          <span className="eyebrow-badge">ENTERPRISE SAFETY GUARDRAILS</span>
          <h2 className="section-main-heading">Engineered for Safe, Responsible Defense</h2>
          <p className="section-sub-heading max-w-2xl">
            Autonomous defense requires multi-layered safety guarantees. CYBERGUARD-X enforces controls to prevent accidental outages,
            unauthorized network scans, or unapproved containment execution.
          </p>
        </div>

        <div className="safety-cards-grid">
          {safetyPillars.map((feat, idx) => (
            <div key={idx} className="safety-feature-card">
              <div className="safety-icon-wrapper">{feat.icon}</div>
              <div className="safety-content">
                <h3 className="safety-title">{feat.title}</h3>
                <p className="safety-desc">{feat.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 8. System Architecture Diagram */}
      <section id="architecture" className="architecture-section" style={{ marginTop: '72px' }}>
        <div className="section-header-centered">
          <span className="eyebrow-badge">ENGINEERING SPECIFICATIONS</span>
          <h2 className="section-main-heading">Evidence-Driven Architecture</h2>
          <p className="section-sub-heading max-w-2xl">
            An end-to-end pipeline connecting wire-speed passive packet capture to in-memory attack graph simulation
            and human-approved automated defense.
          </p>
        </div>

        <div className="architecture-pipeline-wrapper">
          <div className="pipeline-nodes-row">
            {architectureNodes.map((comp, idx) => (
              <React.Fragment key={comp.id}>
                <div
                  className={`pipeline-component-node ${activeArchComponent === comp.id ? 'active' : ''}`}
                  onClick={() => setActiveArchComponent(comp.id)}
                  role="button"
                  tabIndex={0}
                >
                  <span className="node-title">{comp.name}</span>
                  <span className="node-tech-tag">{comp.tech.split('/')[0]}</span>
                </div>

                {idx < architectureNodes.length - 1 && (
                  <div className="pipeline-connector-line">
                    <ArrowRight size={14} />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="architecture-detail-panel">
          <div className="panel-header-row">
            <div className="panel-title-group">
              <span className="panel-badge-category">COMPONENT SPECIFICATION</span>
              <h3 className="panel-component-name">{activeArch.name}</h3>
              <span className="panel-tech-stack mono">{activeArch.tech}</span>
            </div>

            <div className="panel-status-pill">
              <span className="status-dot-active" />
              OPERATIONAL
            </div>
          </div>

          <div className="panel-body-grid">
            <div className="body-col">
              <span className="col-label">PRIMARY RESPONSIBILITY</span>
              <p className="col-desc">{activeArch.role}</p>
            </div>
            <div className="body-col">
              <span className="col-label">SECURITY &amp; PERFORMANCE GUARANTEES</span>
              <p className="col-desc highlight">{activeArch.guarantee}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Comprehensive Footer with Final CTA */}
      <footer className="home-footer-section">
        <div className="footer-cta-banner">
          <div className="cta-banner-content">
            <span className="cta-eyebrow">AUTONOMOUS CYBER DEFENSE</span>
            <h2 className="cta-heading">
              See Your Network. Understand the Threat. Control the Response.
            </h2>
            <p className="cta-description">
              Deploy CYBERGUARD-X in your enterprise environment or test lab to gain real-time wire visibility,
              simulate lateral attack exposure, and execute calibrated countermeasures.
            </p>

            <div className="cta-actions-row">
              <button
                type="button"
                className="btn-cta-launch"
                onClick={onLaunchConsole}
              >
                <span>Launch CYBERGUARD-X</span>
                <ArrowRight size={16} />
              </button>

              <a
                href="https://github.com/Krishnanegi09/CyberGuard-X"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-cta-docs"
              >
                <Terminal size={15} />
                <span>View Source on GitHub</span>
                <ExternalLink size={13} />
              </a>
            </div>
          </div>
        </div>

        <div className="footer-links-container">
          <div className="footer-brand-col">
            <div className="footer-brand-logo">
              <div className="brand-logo-icon">
                <Shield size={20} />
              </div>
              <span className="brand-title">CYBERGUARD-X</span>
            </div>
            <p className="footer-brand-tagline">
              Autonomous AI-Powered Cyber Defense and Digital Twin Security Platform.
              Engineered with strict zero-fake-data provenance and Four-Eyes human governance.
            </p>
            <div className="footer-status-pill">
              <span className="status-dot-green" />
              <span>CORE ENGINE · OPERATIONAL</span>
            </div>
          </div>

          <div className="footer-nav-col">
            <h4 className="footer-col-title">Platform</h4>
            <ul className="footer-links-list">
              <li><a href="#twin">Cyber Digital Twin</a></li>
              <li><a href="#capabilities">Attack-Path Simulation</a></li>
              <li><a href="#capabilities">AI Threat Intelligence</a></li>
              <li><a href="#capabilities">Automated Response</a></li>
              <li><a href="#loop">6-Stage Defense Loop</a></li>
            </ul>
          </div>

          <div className="footer-nav-col">
            <h4 className="footer-col-title">Solutions</h4>
            <ul className="footer-links-list">
              <li><a href="#provenance">Zero Fake Telemetry</a></li>
              <li><a href="#safety">Tenant Isolation &amp; RLS</a></li>
              <li><a href="#safety">Four-Eyes Approval Workflow</a></li>
              <li><a href="#safety">Global Emergency Stop</a></li>
              <li><a href="#architecture">Architecture Specs</a></li>
            </ul>
          </div>

          <div className="footer-nav-col">
            <h4 className="footer-col-title">Resources &amp; Docs</h4>
            <ul className="footer-links-list">
              <li>
                <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer">
                  OpenAPI / Swagger Docs
                </a>
              </li>
              <li>
                <a href="https://github.com/Krishnanegi09/CyberGuard-X" target="_blank" rel="noreferrer">
                  GitHub Repository
                </a>
              </li>
              <li><a href="#architecture">System Architecture</a></li>
              <li><a href="#provenance">Data Provenance Standard</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom-bar">
          <div className="bottom-bar-inner">
            <span className="copyright-text">
              &copy; {new Date().getFullYear()} CYBERGUARD-X Platform. BTech CSE Major Project. All rights reserved.
            </span>
            <div className="legal-links">
              <span className="provenance-pill">STRICT ZERO-FAKE-DATA COMPLIANT</span>
              <span className="divider">·</span>
              <span>PROVENANCE: OBSERVED | DERIVED | PREDICTED | SIMULATED</span>
            </div>
          </div>
        </div>
      </footer>

      {/* 10. Interactive Video Overview Modal */}
      {isVideoModalOpen && (
        <div className="video-modal-backdrop" onClick={() => setIsVideoModalOpen(false)}>
          <div className="video-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="video-modal-header">
              <div className="modal-title-group">
                <span className="modal-badge">PLATFORM OVERVIEW · 2 MIN</span>
                <h3 className="modal-heading">CYBERGUARD-X Architecture Tour</h3>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setIsVideoModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="video-player-display">
              <div className="player-screen-content">
                <div className="screen-watermark">
                  <Shield size={28} className="text-cyan opacity-40" />
                  <span>CYBERGUARD-X // ARCHITECTURE WALKTHROUGH</span>
                </div>

                <div className="screen-active-log">
                  <span className="log-prefix">&gt; </span>
                  <span className="log-text">{tourChapters[activeModalChapter].log}</span>
                </div>

                <div className="player-controls-overlay">
                  <button
                    type="button"
                    className="btn-play-pause"
                    onClick={() => setIsModalPlaying(!isModalPlaying)}
                    aria-label={isModalPlaying ? 'Pause' : 'Play'}
                  >
                    {isModalPlaying ? <Pause size={20} /> : <Play size={20} />}
                  </button>
                  <button
                    type="button"
                    className="btn-restart"
                    onClick={() => setActiveModalChapter(0)}
                    title="Restart"
                  >
                    <RotateCcw size={16} />
                  </button>
                </div>
              </div>

              <div className="timeline-track">
                <div
                  className="timeline-fill"
                  style={{ width: `${((activeModalChapter + 1) / tourChapters.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="modal-chapters-grid">
              {tourChapters.map((ch, idx) => (
                <div
                  key={idx}
                  className={`chapter-tab-item ${activeModalChapter === idx ? 'active' : ''}`}
                  onClick={() => setActiveModalChapter(idx)}
                >
                  <div className="chapter-header">
                    <span className="chapter-icon">{ch.icon}</span>
                    <span className="chapter-title">{ch.title}</span>
                    <span className="chapter-time">{ch.time}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="video-modal-footer">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setIsVideoModalOpen(false)}
              >
                Close Overview
              </button>
              <button
                type="button"
                className="btn-launch-primary"
                onClick={() => {
                  setIsVideoModalOpen(false)
                  onLaunchConsole()
                }}
              >
                <span>Launch Operator Console</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HomePage
