import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { Shield, AlertTriangle, Layers } from 'lucide-react'

interface EarthHero3DProps {
  onLoaded?: () => void
  onError?: () => void
  parallaxTarget?: { x: number; y: number }
  eventsCount?: string
  activeThreatsCount?: string
  assetsMonitoredCount?: string
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

export const EarthHero3D: React.FC<EarthHero3DProps> = ({
  onLoaded,
  onError,
  parallaxTarget = { x: 0, y: 0 },
  eventsCount = '5.2M',
  activeThreatsCount = '12',
  assetsMonitoredCount = '1,284',
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

    if (prefersReducedMotion || !isWebGLAvailable()) {
      onError?.()
      return
    }

    const container = containerRef.current
    const width = container.clientWidth || 640
    const height = container.clientHeight || 560

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100)
    camera.position.set(0, 0, 4.4)

    let renderer: THREE.WebGLRenderer | null = null
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      })
    } catch (e) {
      console.warn('Unable to create WebGLRenderer for 3D Earth', e)
      onError?.()
      return
    }

    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.08
    renderer.outputColorSpace = THREE.SRGBColorSpace

    const canvas = renderer.domElement
    canvas.style.position = 'absolute'
    canvas.style.inset = '0'
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.pointerEvents = 'none'
    container.appendChild(canvas)

    // 2. Earth Group with axial tilt
    const earthGroup = new THREE.Group()
    earthGroup.rotation.z = (23.4 * Math.PI) / 180
    // Centered nicely in hero container with slight offset for atmospheric glow
    earthGroup.position.set(0.15, -0.05, 0)
    scene.add(earthGroup)

    // 3. Lighting setup
    // Sunlight coming from upper-right
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.3)
    sunLight.position.set(5.2, 3.2, 3.8)
    scene.add(sunLight)

    // Deep space subtle ambient fill
    const ambientLight = new THREE.AmbientLight(0x060b14, 0.45)
    scene.add(ambientLight)

    // Atmospheric cyan rim light from behind
    const rimLight = new THREE.DirectionalLight(0x00ddf5, 0.9)
    rimLight.position.set(-6, -2, -3)
    scene.add(rimLight)

    // 4. Textures Loading
    const loadingManager = new THREE.LoadingManager()
    const textureLoader = new THREE.TextureLoader(loadingManager)

    const earthDayMap = textureLoader.load('/textures/earth/earth_atmos_2048.jpg')
    const earthLightsMap = textureLoader.load('/textures/earth/earth_lights_2048.png')
    const earthCloudsMap = textureLoader.load('/textures/earth/earth_clouds_1024.png')
    const earthNormalMap = textureLoader.load('/textures/earth/earth_normal_2048.jpg')
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
        uNormalMap: { value: earthNormalMap },
        uSpecularMap: { value: earthSpecularMap },
        uSunDirection: { value: new THREE.Vector3(5.2, 3.2, 3.8).normalize() },
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

          // Smooth twilight terminator
          float dayFactor = smoothstep(-0.16, 0.22, sunDot);

          // Vibrant night city lights
          vec3 nightLights = nightColor * vec3(1.35, 1.15, 0.8) * 2.1 * (1.0 - dayFactor);

          // Ocean specular sun glint
          vec3 viewDir = normalize(-vPosition);
          vec3 halfVec = normalize(uSunDirection + viewDir);
          float specFactor = pow(max(dot(normal, halfVec), 0.0), 32.0) * specularMask * dayFactor * 0.95;
          vec3 sunReflection = vec3(1.0, 0.96, 0.88) * specFactor;

          // Day side illumination
          vec3 illuminatedDay = dayColor * (max(sunDot, 0.0) * 0.92 + 0.12);

          // Atmospheric Fresnel edge glow (Restrained cyan-blue)
          float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.2);
          vec3 atmosphereGlow = vec3(0.0, 0.86, 0.96) * fresnel * (max(sunDot, -0.25) + 0.5) * 0.9;

          vec3 finalColor = mix(nightLights, illuminatedDay, dayFactor) + sunReflection + atmosphereGlow;
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
    })

    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial)
    earthGroup.add(earthMesh)

    // 6. Cloud Sphere
    const cloudsGeometry = new THREE.SphereGeometry(earthRadius + 0.015, 64, 64)
    const cloudsMaterial = new THREE.MeshStandardMaterial({
      map: earthCloudsMap,
      transparent: true,
      opacity: 0.36,
      blending: THREE.NormalBlending,
      depthWrite: false,
      roughness: 0.9,
    })
    const cloudsMesh = new THREE.Mesh(cloudsGeometry, cloudsMaterial)
    earthGroup.add(cloudsMesh)

    // 7. Outer Atmospheric Blue Haze Shell
    const atmosphereGeometry = new THREE.SphereGeometry(earthRadius + 0.045, 48, 48)
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
          float intensity = pow(0.68 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.8);
          gl_FragColor = vec4(0.0, 0.85, 0.96, 1.0) * intensity * 0.8;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    })
    const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial)
    earthGroup.add(atmosphereMesh)

    // 8. Orbital Paths (Curved Cyan Trajectories with moving telemetry beacons)
    const orbitGroup = new THREE.Group()
    scene.add(orbitGroup)

    interface OrbitTrack {
      curve: THREE.EllipseCurve
      points: THREE.Vector3[]
      line: THREE.Line
      beacon: THREE.Mesh
      speed: number
      progress: number
    }

    const orbits: OrbitTrack[] = []

    const orbitConfigs = [
      { radiusX: 1.85, radiusY: 1.75, rotX: 1.1, rotY: 0.4, rotZ: 0.3, speed: 0.18, initialProgress: 0.1 },
      { radiusX: 2.05, radiusY: 1.90, rotX: -0.7, rotY: 1.2, rotZ: -0.5, speed: 0.14, initialProgress: 0.55 },
      { radiusX: 2.25, radiusY: 2.10, rotX: 0.3, rotY: -0.8, rotZ: 0.9, speed: 0.11, initialProgress: 0.82 },
    ]

    orbitConfigs.forEach((cfg) => {
      const curve = new THREE.EllipseCurve(
        0, 0,
        cfg.radiusX, cfg.radiusY,
        0, 2 * Math.PI,
        false,
        0
      )
      const points2D = curve.getPoints(120)
      const points3D = points2D.map(p => new THREE.Vector3(p.x, p.y, 0))
      const orbitGeometry = new THREE.BufferGeometry().setFromPoints(points3D)

      // Cyan luminous trajectory
      const orbitMaterial = new THREE.LineBasicMaterial({
        color: 0x00ddf5,
        transparent: true,
        opacity: 0.32,
        blending: THREE.AdditiveBlending,
      })

      const line = new THREE.Line(orbitGeometry, orbitMaterial)
      line.rotation.x = cfg.rotX
      line.rotation.y = cfg.rotY
      line.rotation.z = cfg.rotZ
      line.position.copy(earthGroup.position)
      orbitGroup.add(line)

      // Moving Telemetry Beacon (Satellite Node)
      const beaconGeo = new THREE.SphereGeometry(0.026, 16, 16)
      const beaconMat = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        blending: THREE.AdditiveBlending,
      })
      const beacon = new THREE.Mesh(beaconGeo, beaconMat)
      orbitGroup.add(beacon)

      orbits.push({
        curve,
        points: points3D,
        line,
        beacon,
        speed: cfg.speed,
        progress: cfg.initialProgress,
      })
    })

    // 9. When textures finish loading
    loadingManager.onLoad = () => {
      isReadyRef.current = true
      setIsReady(true)
      onLoaded?.()
    }

    loadingManager.onError = (url) => {
      console.warn('Failed to load 3D Earth texture:', url)
    }

    // 10. Animation Loop
    let animationFrameId: number
    const clock = new THREE.Clock()
    const ROTATION_SPEED = (2 * Math.PI) / 140
    const CLOUD_SPEED = ROTATION_SPEED * 1.18

    let currentParallaxX = 0
    let currentParallaxY = 0

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)
      if (document.hidden) return

      const delta = clock.getDelta()
      if (delta > 0.2) return

      // Rotate Earth & Clouds
      earthMesh.rotation.y += ROTATION_SPEED * delta
      cloudsMesh.rotation.y += CLOUD_SPEED * delta

      // Update Satellites along orbits
      orbits.forEach((orbit) => {
        orbit.progress = (orbit.progress + orbit.speed * delta * 0.5) % 1.0
        const pt2D = orbit.curve.getPoint(orbit.progress)
        const localPt = new THREE.Vector3(pt2D.x, pt2D.y, 0)
        localPt.applyEuler(orbit.line.rotation)
        localPt.add(earthGroup.position)
        orbit.beacon.position.copy(localPt)
      })

      // Parallax damping
      const target = parallaxRef.current
      currentParallaxX += (target.x * 0.12 - currentParallaxX) * 0.04
      currentParallaxY += (-target.y * 0.08 - currentParallaxY) * 0.04

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
      earthDayMap.dispose()
      earthLightsMap.dispose()
      earthCloudsMap.dispose()
      earthNormalMap.dispose()
      earthSpecularMap.dispose()

      orbits.forEach(o => {
        o.line.geometry.dispose()
        ;(o.line.material as THREE.Material).dispose()
        o.beacon.geometry.dispose()
        ;(o.beacon.material as THREE.Material).dispose()
      })

      renderer?.dispose()
      renderer?.forceContextLoss()
    }
  }, [onError, onLoaded])

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
      {/* Fallback & Initial static backing image while textures load */}
      <div
        className="earth-hero-fallback"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(circle at 60% 50%, rgba(0, 221, 245, 0.12) 0%, transparent 65%)',
          pointerEvents: 'none',
        }}
      />

      {/* Floating Telemetry Callout Card 1: Top Left (Events / 24h) */}
      <div
        className={`floating-telemetry-badge badge-top-left ${isReady ? 'visible' : ''}`}
        style={{
          position: 'absolute',
          top: '8%',
          left: '4%',
          zIndex: 10,
        }}
      >
        <div className="telemetry-badge-content">
          <div className="telemetry-icon-box cyan">
            <Shield size={16} />
          </div>
          <div className="telemetry-text-block">
            <span className="telemetry-value">{eventsCount}</span>
            <span className="telemetry-label">Events / 24h</span>
          </div>
        </div>
      </div>

      {/* Floating Telemetry Callout Card 2: Right (Active Threats) */}
      <div
        className={`floating-telemetry-badge badge-right ${isReady ? 'visible' : ''}`}
        style={{
          position: 'absolute',
          top: '38%',
          right: '2%',
          zIndex: 10,
        }}
      >
        <div className="telemetry-badge-content threat">
          <div className="telemetry-icon-box red">
            <AlertTriangle size={16} />
          </div>
          <div className="telemetry-text-block">
            <span className="telemetry-value red">{activeThreatsCount}</span>
            <span className="telemetry-label">Active Threats</span>
          </div>
        </div>
      </div>

      {/* Floating Telemetry Callout Card 3: Bottom Left (Assets Monitored) */}
      <div
        className={`floating-telemetry-badge badge-bottom-left ${isReady ? 'visible' : ''}`}
        style={{
          position: 'absolute',
          bottom: '12%',
          left: '12%',
          zIndex: 10,
        }}
      >
        <div className="telemetry-badge-content">
          <div className="telemetry-icon-box teal">
            <Layers size={16} />
          </div>
          <div className="telemetry-text-block">
            <span className="telemetry-value">{assetsMonitoredCount}</span>
            <span className="telemetry-label">Assets Monitored</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EarthHero3D
