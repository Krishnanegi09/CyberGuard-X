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

    // 8. Restrained, Minimal Orbital Trajectories (Delicate orbital arcs with glowing telemetry nodes)
    const orbitGroup = new THREE.Group()
    scene.add(orbitGroup)

    const createOrbitLine = (radiusX: number, radiusY: number, rotX: number, rotY: number, rotZ: number, opacity: number) => {
      const curve = new THREE.EllipseCurve(0, 0, radiusX, radiusY, 0, 2 * Math.PI, false, 0)
      const points = curve.getPoints(120).map((p) => new THREE.Vector3(p.x, p.y, 0))
      const geo = new THREE.BufferGeometry().setFromPoints(points)
      const mat = new THREE.LineBasicMaterial({
        color: 0x00ddf5,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
      })
      const line = new THREE.Line(geo, mat)
      line.rotation.set(rotX, rotY, rotZ)
      line.position.copy(earthGroup.position)
      return line
    }

    const orbit1 = createOrbitLine(1.98, 1.82, 1.15, 0.45, 0.25, 0.22)
    const orbit2 = createOrbitLine(2.15, 1.70, 0.85, -0.65, 0.75, 0.14)
    orbitGroup.add(orbit1)
    orbitGroup.add(orbit2)

    // Orbital Satellite Nodes (Glowing cyan telemetry points along orbits)
    const nodeGeo = new THREE.SphereGeometry(0.024, 16, 16)
    const nodeMat = new THREE.MeshBasicMaterial({ color: 0x00ddf5, transparent: true, opacity: 0.9 })
    const nodeMesh1 = new THREE.Mesh(nodeGeo, nodeMat)
    const nodeMesh2 = new THREE.Mesh(nodeGeo, nodeMat)
    orbitGroup.add(nodeMesh1)
    orbitGroup.add(nodeMesh2)

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

      // Orbital nodes movement
      const time = clock.getElapsedTime()
      const t1 = time * 0.18
      nodeMesh1.position.set(
        earthGroup.position.x + Math.cos(t1) * 1.98 * 0.85,
        earthGroup.position.y + Math.sin(t1) * 1.82 * 0.65,
        Math.sin(t1) * 0.95
      )
      const t2 = time * -0.14 + 1.5
      nodeMesh2.position.set(
        earthGroup.position.x + Math.cos(t2) * 2.15 * 0.75,
        earthGroup.position.y + Math.sin(t2) * 1.70 * 0.85,
        Math.cos(t2) * 0.8
      )

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
      orbit1.geometry.dispose()
      ;(orbit1.material as THREE.Material).dispose()
      orbit2.geometry.dispose()
      ;(orbit2.material as THREE.Material).dispose()
      nodeGeo.dispose()
      nodeMat.dispose()
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
        style={{ position: 'absolute', top: '8%', left: '12%', zIndex: 10 }}
      >
        <div className="telemetry-badge-content">
          <div className="telemetry-icon-box cyan">
            <Shield size={16} />
          </div>
          <div className="telemetry-text-block">
            <div className="telemetry-top-line">
              <span className="telemetry-value">5.2M</span>
              <span className="telemetry-demo-pill">DEMO</span>
            </div>
            <span className="telemetry-label">Events / 24h</span>
          </div>
        </div>
      </div>

      {/* Restrained Telemetry Badge 2: Active Threats (Explicitly Marked DEMO) */}
      <div
        className={`floating-telemetry-badge badge-right ${isReady ? 'visible' : ''}`}
        style={{ position: 'absolute', top: '42%', right: '6%', zIndex: 10 }}
      >
        <div className="telemetry-badge-content threat">
          <div className="telemetry-icon-box red">
            <AlertTriangle size={16} />
          </div>
          <div className="telemetry-text-block">
            <div className="telemetry-top-line">
              <span className="telemetry-value red">12</span>
              <span className="telemetry-demo-pill red">DEMO</span>
            </div>
            <span className="telemetry-label">Active Threats</span>
          </div>
        </div>
      </div>

      {/* Restrained Telemetry Badge 3: Assets Monitored (Explicitly Marked DEMO) */}
      <div
        className={`floating-telemetry-badge badge-bottom-center ${isReady ? 'visible' : ''}`}
        style={{ position: 'absolute', bottom: '12%', left: '20%', zIndex: 10 }}
      >
        <div className="telemetry-badge-content">
          <div className="telemetry-icon-box teal">
            <Layers size={16} />
          </div>
          <div className="telemetry-text-block">
            <div className="telemetry-top-line">
              <span className="telemetry-value">1,284</span>
              <span className="telemetry-demo-pill">DEMO</span>
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

  // Platform Capabilities 4-Card Data (Faithful to approved visual direction)
  const platformCards = [
    {
      id: 'twin',
      title: 'Cyber Digital Twin',
      icon: <Box size={22} />,
      desc: 'A live, high-fidelity model of your network for safe, realistic attack simulation.',
    },
    {
      id: 'simulation',
      title: 'Attack-Path Simulation',
      icon: <GitBranch size={22} />,
      desc: 'Simulate multi-stage lateral movement and identify critical exposure paths.',
    },
    {
      id: 'ml',
      title: 'AI Threat Intelligence',
      icon: <Cpu size={22} />,
      desc: 'Detect, prioritize, and predict threats using trained ML models and behavioral analytics.',
    },
    {
      id: 'defense',
      title: 'Automated Response',
      icon: <Zap size={22} />,
      desc: 'Execute calibrated, policy-aware defensive actions in real time.',
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
            <span>Explore All Capabilities</span>
            <ArrowRight size={15} />
          </button>
        </div>

        <div className="capabilities-cards-grid">
          {platformCards.map((card, idx) => (
            <div
              key={card.id}
              className={`capability-card ${idx === 0 ? 'card-featured' : ''}`}
              tabIndex={0}
              onClick={onLaunchConsole}
            >
              <div className="card-top-row">
                <div className="card-icon-wrapper">
                  {card.icon}
                </div>
                <div className="card-arrow-indicator">
                  <ArrowRight size={14} />
                </div>
              </div>

              <h3 className="card-title">{card.title}</h3>
              <p className="card-description">{card.desc}</p>

              <div className="card-bottom-accent" />
            </div>
          ))}
        </div>
      </section>

      {/* 4. Product Preview — Digital Twin & Attack Simulation (Faithful to Approved Storyboard) */}
      <section id="twin" className="twin-showcase-section" style={{ marginTop: '56px' }}>
        <div className="showcase-container">
          {/* Top Window Header Bar */}
          <div className="showcase-header-bar">
            <div className="showcase-header-left">
              <div className="window-dots">
                <span className="dot red" />
                <span className="dot yellow" />
                <span className="dot green" />
              </div>
              <div className="showcase-title-badge">
                <Box size={14} />
                <span>CYBER DIGITAL TWIN // LIVE NETWORK SIMULATION</span>
              </div>
            </div>

            <div className="showcase-header-right">
              <span className="live-simulation-tag">
                <span className="tag-ping" />
                ILLUSTRATIVE DEMO PREVIEW
              </span>
            </div>
          </div>

          <div className="showcase-split-grid">
            {/* Left Panel: 3D Isometric Live Digital Twin */}
            <div className="showcase-left-panel">
              <div className="panel-badge-row">
                <span className="panel-badge">
                  <Box size={15} className="text-cyan" />
                  <span>Live Digital Twin</span>
                </span>
                <span className="status-indicator-green">
                  <span className="dot-pulse" />
                  Active Simulation
                </span>
              </div>

              {/* High-Fidelity 3D Isometric Server Architecture Canvas */}
              <div className="isometric-topology-canvas">
                <svg className="topology-svg-layer" viewBox="0 0 540 360" preserveAspectRatio="xMidYMid meet">
                  <defs>
                    <radialGradient id="cyanFloorGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#00ddf5" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#00ddf5" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="redFloorGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#ff4d5d" stopOpacity="0.45" />
                      <stop offset="100%" stopColor="#ff4d5d" stopOpacity="0" />
                    </radialGradient>
                    <linearGradient id="traceNormal" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00ddf5" stopOpacity="0.7" />
                      <stop offset="100%" stopColor="#00c89a" stopOpacity="0.5" />
                    </linearGradient>
                    <linearGradient id="traceAttack" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ff4d5d" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#00ddf5" stopOpacity="0.4" />
                    </linearGradient>
                  </defs>

                  {/* Isometric Floor Grid Lines */}
                  <g className="iso-grid-lines" stroke="rgba(36, 51, 65, 0.4)" strokeWidth="0.8">
                    <line x1="40" y1="180" x2="310" y2="335" />
                    <line x1="100" y1="145" x2="370" y2="300" />
                    <line x1="160" y1="110" x2="430" y2="265" />
                    <line x1="220" y1="75" x2="490" y2="230" />

                    <line x1="490" y1="180" x2="220" y2="335" />
                    <line x1="430" y1="145" x2="160" y2="300" />
                    <line x1="370" y1="110" x2="100" y2="265" />
                    <line x1="310" y1="75" x2="40" y2="230" />
                  </g>

                  {/* Connecting Data Highway Traces */}
                  {/* DMZ to Compromised Worker */}
                  <path d="M 105 195 L 160 225 L 160 255" fill="none" stroke="url(#traceNormal)" strokeWidth="1.6" />
                  {/* Compromised Worker to Core Cluster (Active Lateral Attack Vector) */}
                  <path d="M 160 255 L 215 285 L 270 255 L 270 215" fill="none" stroke="url(#traceAttack)" strokeWidth="2.2" strokeDasharray="4 2" />
                  {/* Core Cluster to Identity DC */}
                  <path d="M 270 215 L 220 185 L 220 120" fill="none" stroke="url(#traceNormal)" strokeWidth="1.5" />
                  {/* Core Cluster to Restricted DB */}
                  <path d="M 270 215 L 340 175 L 410 215 L 410 165" fill="none" stroke="url(#traceNormal)" strokeWidth="1.8" />
                  {/* Core Cluster to Worker 03 */}
                  <path d="M 270 215 L 340 255 L 380 235" fill="none" stroke="url(#traceNormal)" strokeWidth="1.4" />

                  {/* Floor Glows */}
                  <ellipse cx="270" cy="235" rx="65" ry="26" fill="url(#cyanFloorGlow)" />
                  <ellipse cx="160" cy="285" rx="55" ry="22" fill="url(#redFloorGlow)" />
                  <ellipse cx="410" cy="180" rx="45" ry="18" fill="url(#cyanFloorGlow)" />

                  {/* NODE 1: DMZ-Web-01 (Isometric Server Cube, Left) */}
                  <g className="iso-server dmz" onClick={() => setSelectedDemoNode('node-dmz')} style={{ cursor: 'pointer' }}>
                    {/* Left Face */}
                    <polygon points="80,185 105,198 105,232 80,219" fill="#0d1824" stroke="rgba(0, 221, 245, 0.4)" strokeWidth="0.8" />
                    {/* Right Face */}
                    <polygon points="105,198 130,185 130,219 105,232" fill="#09121c" stroke="rgba(0, 221, 245, 0.4)" strokeWidth="0.8" />
                    {/* Top Face */}
                    <polygon points="105,172 130,185 105,198 80,185" fill="#13263a" stroke="#00ddf5" strokeWidth="1" />
                    {/* Cyan Server Bay Slots */}
                    <line x1="85" y1="200" x2="100" y2="208" stroke="#00ddf5" strokeWidth="1.2" />
                    <line x1="85" y1="208" x2="100" y2="216" stroke="#00ddf5" strokeWidth="1.2" />
                    <line x1="85" y1="216" x2="100" y2="224" stroke="#00ddf5" strokeWidth="1.2" />
                  </g>

                  {/* NODE 2: Internal-Worker-02 (COMPROMISED RED ISOMETRIC SERVER, Bottom Left) */}
                  <g className="iso-server compromised" onClick={() => setSelectedDemoNode('node-comp')} style={{ cursor: 'pointer' }}>
                    {/* Left Face */}
                    <polygon points="130,240 160,256 160,296 130,280" fill="#240c12" stroke="rgba(255, 77, 93, 0.6)" strokeWidth="1" />
                    {/* Right Face */}
                    <polygon points="160,256 190,240 190,280 160,296" fill="#17070a" stroke="rgba(255, 77, 93, 0.6)" strokeWidth="1" />
                    {/* Top Face */}
                    <polygon points="160,224 190,240 160,256 130,240" fill="#3a111a" stroke="#ff4d5d" strokeWidth="1.4" />
                    {/* Glowing Red Server Bay Slots */}
                    <line x1="136" y1="256" x2="154" y2="266" stroke="#ff4d5d" strokeWidth="1.5" />
                    <line x1="136" y1="266" x2="154" y2="276" stroke="#ff4d5d" strokeWidth="1.5" />
                    <line x1="136" y1="276" x2="154" y2="286" stroke="#ff4d5d" strokeWidth="1.5" />
                    {/* Floating Red Warning Triangle Indicator */}
                    <g transform="translate(198, 252)">
                      <circle cx="10" cy="10" r="12" fill="rgba(255, 77, 93, 0.2)" stroke="#ff4d5d" strokeWidth="1.2" />
                      <polygon points="10,4 16,14 4,14" fill="#ff4d5d" />
                      <rect x="9.2" y="8" width="1.6" height="3" fill="#070b10" />
                      <circle cx="10" cy="12.5" r="0.9" fill="#070b10" />
                    </g>
                  </g>

                  {/* NODE 3: Core-App-Cluster (TALL CENTRAL ISOMETRIC TOWER) */}
                  <g className="iso-server core" onClick={() => setSelectedDemoNode('node-core')} style={{ cursor: 'pointer' }}>
                    {/* Left Face */}
                    <polygon points="230,140 270,162 270,236 230,214" fill="#0d1b2a" stroke="rgba(0, 221, 245, 0.6)" strokeWidth="1.2" />
                    {/* Right Face */}
                    <polygon points="270,162 310,140 310,214 270,236" fill="#08111c" stroke="rgba(0, 221, 245, 0.6)" strokeWidth="1.2" />
                    {/* Top Face */}
                    <polygon points="270,118 310,140 270,162 230,140" fill="#14324c" stroke="#00ddf5" strokeWidth="1.6" />
                    {/* Glowing Cyan Horizontal Slats */}
                    <line x1="238" y1="160" x2="262" y2="173" stroke="#00ddf5" strokeWidth="1.8" />
                    <line x1="238" y1="172" x2="262" y2="185" stroke="#00ddf5" strokeWidth="1.8" />
                    <line x1="238" y1="184" x2="262" y2="197" stroke="#00ddf5" strokeWidth="1.8" />
                    <line x1="238" y1="196" x2="262" y2="209" stroke="#00ddf5" strokeWidth="1.8" />
                    <line x1="238" y1="208" x2="262" y2="221" stroke="#00ddf5" strokeWidth="1.8" />

                    <line x1="278" y1="173" x2="302" y2="160" stroke="#00ddf5" strokeWidth="1.8" />
                    <line x1="278" y1="185" x2="302" y2="172" stroke="#00ddf5" strokeWidth="1.8" />
                    <line x1="278" y1="197" x2="302" y2="184" stroke="#00ddf5" strokeWidth="1.8" />
                    <line x1="278" y1="209" x2="302" y2="196" stroke="#00ddf5" strokeWidth="1.8" />
                    <line x1="278" y1="221" x2="302" y2="208" stroke="#00ddf5" strokeWidth="1.8" />
                  </g>

                  {/* NODE 4: Prod-Database-01 (ISOMETRIC CYLINDER / DB STACK, Right) */}
                  <g className="iso-server db" onClick={() => setSelectedDemoNode('node-db')} style={{ cursor: 'pointer' }}>
                    {/* Cylinder Body */}
                    <path d="M 385 135 L 385 175 A 25 12 0 0 0 435 175 L 435 135 Z" fill="#0c1a27" stroke="rgba(0, 200, 154, 0.6)" strokeWidth="1" />
                    {/* Intermediate Disk Grooves */}
                    <path d="M 385 148 A 25 12 0 0 0 435 148" fill="none" stroke="#00c89a" strokeWidth="1.4" />
                    <path d="M 385 162 A 25 12 0 0 0 435 162" fill="none" stroke="#00c89a" strokeWidth="1.4" />
                    {/* Top Disk Face */}
                    <ellipse cx="410" cy="135" rx="25" ry="12" fill="#153638" stroke="#00c89a" strokeWidth="1.5" />
                  </g>

                  {/* NODE 5: Identity-DC-01 (Background Server) */}
                  <g className="iso-server dc" onClick={() => setSelectedDemoNode('node-dc')} style={{ cursor: 'pointer' }}>
                    <polygon points="200,95 220,105 220,135 200,125" fill="#0d1824" stroke="rgba(0, 221, 245, 0.4)" strokeWidth="0.8" />
                    <polygon points="220,105 240,95 240,125 220,135" fill="#09121c" stroke="rgba(0, 221, 245, 0.4)" strokeWidth="0.8" />
                    <polygon points="220,85 240,95 220,105 200,95" fill="#13263a" stroke="#00ddf5" strokeWidth="1" />
                    <line x1="205" y1="108" x2="216" y2="114" stroke="#00ddf5" strokeWidth="1.2" />
                    <line x1="205" y1="116" x2="216" y2="122" stroke="#00ddf5" strokeWidth="1.2" />
                  </g>

                  {/* NODE 6: Worker-03 (Foreground Satellite Node) */}
                  <g className="iso-server worker" style={{ cursor: 'pointer' }}>
                    <polygon points="360,230 380,240 380,268 360,258" fill="#0d1824" stroke="rgba(0, 221, 245, 0.4)" strokeWidth="0.8" />
                    <polygon points="380,240 400,230 400,258 380,268" fill="#09121c" stroke="rgba(0, 221, 245, 0.4)" strokeWidth="0.8" />
                    <polygon points="380,220 400,230 380,240 360,230" fill="#13263a" stroke="#00ddf5" strokeWidth="1" />
                    <line x1="365" y1="242" x2="376" y2="248" stroke="#00ddf5" strokeWidth="1.2" />
                    <line x1="365" y1="250" x2="376" y2="256" stroke="#00ddf5" strokeWidth="1.2" />
                  </g>
                </svg>

                {/* Node Detail Bottom Bar */}
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

              {/* Action Controls */}
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

            {/* Right Panel: Attack Simulation (Live) with Side-by-Side Stages & Insights */}
            <div className="showcase-right-panel">
              <div className="panel-badge-row">
                <span className="panel-badge">
                  <Activity size={15} className="text-cyan" />
                  <span>Attack Simulation (Live)</span>
                </span>
                <span className="telemetry-demo-pill" style={{ marginLeft: 'auto' }}>DEMO WORKFLOW</span>
              </div>

              {/* Side-by-Side Content Grid: Stages List & Simulation Insights */}
              <div className="simulation-two-col-layout">
                {/* Column 1: Lifecycle Stages */}
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

                {/* Column 2: Simulation Insights Card */}
                <div className="simulation-insights-card">
                  <div className="insights-card-title">
                    <Clock size={13} />
                    <span>Simulation Insights</span>
                  </div>

                  <div className="insights-metrics-grid">
                    <div className="insight-metric-item full-width">
                      <div className="metric-header-row">
                        <span className="metric-label">Blast Radius</span>
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
                      <span className="metric-label">Risk Score</span>
                      <span className={`risk-badge-pill ${demoSimStep >= 4 ? 'critical' : 'high'}`}>
                        {demoSimStep >= 4 ? 'Critical' : 'High'}
                      </span>
                    </div>

                    <div className="insight-metric-item full-width">
                      <div className="metric-header-row">
                        <span className="metric-label">Est. Impact</span>
                        <span className="metric-value-num mono">~ 18 min</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="showcase-footer-link" style={{ marginTop: 'auto', paddingTop: '12px' }}>
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

      {/* 5. Six-Stage Defense Intelligence Loop (Faithful to Approved Storyboard) */}
      <section id="loop" className="defense-loop-section" style={{ marginTop: '72px' }}>
        {/* Asymmetric Hero Row from Visual Reference */}
        <div className="defense-loop-hero-row">
          <div className="defense-loop-left-heading">
            <span className="eyebrow-badge">BUILT FOR MODERN SECURITY TEAMS</span>
            <h2 className="loop-main-heading">From Visibility to Autonomous Defense</h2>
            <p className="loop-sub-heading">
              Unify telemetry, simulation, intelligence, and response in a single operational platform.
            </p>
          </div>

          <div className="defense-loop-divider" />

          <div className="defense-loop-right-steps">
            <div className="defense-flow-step" onClick={() => setActiveLoopStage(0)} role="button" tabIndex={0}>
              <div className="flow-step-icon"><Eye size={22} /></div>
              <div className="flow-step-title">Observe</div>
              <div className="flow-step-desc">Real-time network telemetry</div>
            </div>
            <div className="flow-step-arrow"><ArrowRight size={16} /></div>

            <div className="defense-flow-step" onClick={() => setActiveLoopStage(2)} role="button" tabIndex={0}>
              <div className="flow-step-icon"><Layers size={22} /></div>
              <div className="flow-step-title">Simulate</div>
              <div className="flow-step-desc">Safe, realistic attack paths</div>
            </div>
            <div className="flow-step-arrow"><ArrowRight size={16} /></div>

            <div className="defense-flow-step" onClick={() => setActiveLoopStage(3)} role="button" tabIndex={0}>
              <div className="flow-step-icon"><BarChart3 size={22} /></div>
              <div className="flow-step-title">Predict</div>
              <div className="flow-step-desc">ML-driven risk estimation</div>
            </div>
            <div className="flow-step-arrow"><ArrowRight size={16} /></div>

            <div className="defense-flow-step" onClick={() => setActiveLoopStage(4)} role="button" tabIndex={0}>
              <div className="flow-step-icon"><Shield size={22} /></div>
              <div className="flow-step-title">Respond</div>
              <div className="flow-step-desc">Automated, controlled defense actions</div>
            </div>
          </div>
        </div>

        {/* Connected Process Flow Bar — All 6 Stages Represented */}
        <div className="horizontal-process-strip" style={{ marginTop: '36px' }}>
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
