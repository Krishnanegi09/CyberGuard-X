import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

interface Earth3DProps {
  onLoaded?: () => void
  onError?: () => void
  parallaxTarget?: { x: number; y: number }
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

export const Earth3D: React.FC<Earth3DProps> = ({
  onLoaded,
  onError,
  parallaxTarget = { x: 0, y: 0 },
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isReady, setIsReady] = useState(false)
  const isReadyRef = useRef(false)

  // Keep latest parallax targets in ref to avoid re-triggering effect
  const parallaxRef = useRef(parallaxTarget)
  useEffect(() => {
    parallaxRef.current = parallaxTarget
  }, [parallaxTarget])

  useEffect(() => {
    if (!containerRef.current) return

    // 1. Accessibility: Check for reduced-motion preference
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion || !isWebGLAvailable()) {
      onError?.()
      return
    }

    const container = containerRef.current
    const width = container.clientWidth || 600
    const height = container.clientHeight || 400

    // 2. Scene, Camera, Renderer
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100)
    camera.position.set(0, 0, 4.2)

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
    renderer.toneMappingExposure = 1.05
    renderer.outputColorSpace = THREE.SRGBColorSpace

    const canvas = renderer.domElement
    canvas.style.position = 'absolute'
    canvas.style.inset = '0'
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.pointerEvents = 'none'
    container.appendChild(canvas)

    // 3. Earth Group with 23.4° axial tilt
    const earthGroup = new THREE.Group()
    earthGroup.rotation.z = (23.4 * Math.PI) / 180
    // Position slightly down and to the right for cinematic hero cropping
    earthGroup.position.set(0.65, -0.22, 0)
    scene.add(earthGroup)

    // 4. Lighting
    // Directional sunlight coming from the upper right
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.2)
    sunLight.position.set(5, 3, 4)
    scene.add(sunLight)

    // Deep space subtle ambient light so night side is not completely pitch black
    const ambientLight = new THREE.AmbientLight(0x070c18, 0.4)
    scene.add(ambientLight)

    // Blue atmospheric backlight
    const rimLight = new THREE.DirectionalLight(0x00f0ff, 0.8)
    rimLight.position.set(-6, -2, -3)
    scene.add(rimLight)

    // 5. Textures Loading
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

    // 6. Shader Material for Earth (Day/Night blend + Specular + Normal)
    const earthGeometry = new THREE.SphereGeometry(1.6, 64, 64)

    // Custom shader combining day albedo, night city lights, specular ocean reflection, and atmospheric rim
    const earthMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uDayTexture: { value: earthDayMap },
        uNightTexture: { value: earthLightsMap },
        uNormalMap: { value: earthNormalMap },
        uSpecularMap: { value: earthSpecularMap },
        uSunDirection: { value: new THREE.Vector3(5, 3, 4).normalize() },
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

          // Compute sunlight dot product
          vec3 normal = normalize(vNormal);
          float sunDot = dot(normal, uSunDirection);

          // Smooth twilight terminator transition
          float dayFactor = smoothstep(-0.15, 0.25, sunDot);

          // Subtle night city lights (warm electric gold)
          vec3 nightLights = nightColor * vec3(1.3, 1.1, 0.8) * 1.8 * (1.0 - dayFactor);

          // Sun specular reflection on oceans
          vec3 viewDir = normalize(-vPosition);
          vec3 halfVec = normalize(uSunDirection + viewDir);
          float specFactor = pow(max(dot(normal, halfVec), 0.0), 32.0) * specularMask * dayFactor * 0.9;
          vec3 sunReflection = vec3(1.0, 0.95, 0.85) * specFactor;

          // Day side lighting
          vec3 illuminatedDay = dayColor * (max(sunDot, 0.0) * 0.9 + 0.12);

          // Atmospheric Fresnel edge rim glow (electric cyan-blue)
          float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.2);
          vec3 atmosphereGlow = vec3(0.05, 0.45, 0.95) * fresnel * (max(sunDot, -0.3) + 0.45) * 0.9;

          vec3 finalColor = mix(nightLights, illuminatedDay, dayFactor) + sunReflection + atmosphereGlow;

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
    })

    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial)
    earthGroup.add(earthMesh)

    // 7. Cloud Sphere (Rotating slightly faster with transparency)
    const cloudsGeometry = new THREE.SphereGeometry(1.615, 64, 64)
    const cloudsMaterial = new THREE.MeshStandardMaterial({
      map: earthCloudsMap,
      transparent: true,
      opacity: 0.38,
      blending: THREE.NormalBlending,
      depthWrite: false,
      roughness: 0.9,
    })
    const cloudsMesh = new THREE.Mesh(cloudsGeometry, cloudsMaterial)
    earthGroup.add(cloudsMesh)

    // 8. Outer Atmospheric Blue Haze Shell
    const atmosphereGeometry = new THREE.SphereGeometry(1.645, 48, 48)
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
          // Camera view alignment
          float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
          gl_FragColor = vec4(0.0, 0.75, 1.0, 1.0) * intensity * 0.85;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    })
    const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial)
    earthGroup.add(atmosphereMesh)

    // 9. When textures finish loading
    loadingManager.onLoad = () => {
      isReadyRef.current = true
      setIsReady(true)
      onLoaded?.()
    }

    loadingManager.onError = (url) => {
      console.warn('Failed to load 3D Earth texture:', url)
      // If error occurs, still continue with fallback or default rendering
    }

    // 10. Animation Loop (Delta time based, ~140 seconds per rotation)
    let animationFrameId: number
    const clock = new THREE.Clock()
    const ROTATION_SPEED = (2 * Math.PI) / 140 // 1 full revolution per 140 seconds
    const CLOUD_SPEED = ROTATION_SPEED * 1.18 // Clouds drift slightly faster

    let currentParallaxX = 0
    let currentParallaxY = 0

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)

      // Only render if tab is visible to preserve battery & CPU
      if (document.hidden) return

      const delta = clock.getDelta()
      if (delta > 0.2) return // Prevent jump if tab was frozen

      // Continuous Earth rotation
      earthMesh.rotation.y += ROTATION_SPEED * delta
      cloudsMesh.rotation.y += CLOUD_SPEED * delta

      // Smooth pointer parallax damping
      const target = parallaxRef.current
      currentParallaxX += (target.x * 0.12 - currentParallaxX) * 0.04
      currentParallaxY += (-target.y * 0.08 - currentParallaxY) * 0.04

      camera.position.x = currentParallaxX
      camera.position.y = currentParallaxY
      camera.lookAt(0.65, -0.22, 0)

      renderer?.render(scene, camera)
    }

    animate()

    // 11. Responsive Resize Observer
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

    // 12. Cleanup on unmount (prevent memory leaks)
    return () => {
      cancelAnimationFrame(animationFrameId)
      resizeObserver.disconnect()

      // Dispose Geometries
      earthGeometry.dispose()
      cloudsGeometry.dispose()
      atmosphereGeometry.dispose()

      // Dispose Materials
      earthMaterial.dispose()
      cloudsMaterial.dispose()
      atmosphereMaterial.dispose()

      // Dispose Textures
      earthDayMap.dispose()
      earthLightsMap.dispose()
      earthCloudsMap.dispose()
      earthNormalMap.dispose()
      earthSpecularMap.dispose()

      // Dispose Renderer
      if (renderer) {
        renderer.dispose()
        renderer.forceContextLoss()
        if (canvas.parentElement) {
          canvas.parentElement.removeChild(canvas)
        }
      }
    }
  }, [onLoaded, onError])

  return (
    <div
      ref={containerRef}
      className="earth-3d-canvas-wrap"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        opacity: isReady ? 1 : 0,
        transition: 'opacity 0.8s ease-in-out',
        zIndex: 1,
      }}
      aria-hidden="true"
    />
  )
}

export default Earth3D
