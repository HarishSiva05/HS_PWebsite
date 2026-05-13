"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"

const VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uScroll;
  uniform float uReduceMotion;

  varying vec2 vUv;
  varying float vDisplacement;

  void main() {
    vUv = uv;
    vec3 pos = position;

    float motion = 1.0 - uReduceMotion;

    float wave =
      sin(pos.x * 1.6 + uTime * 0.45) *
      cos(pos.y * 1.4 + uTime * 0.35);
    float waveDisp = wave * 0.11 * motion;

    vec2 mouseUv = uMouse * 0.5 + 0.5;
    float distToMouse = distance(uv, mouseUv);
    float bulge = smoothstep(0.45, 0.0, distToMouse) * 0.22 * motion;

    pos.z += waveDisp + bulge;
    pos.z -= uScroll * 0.55 * motion;

    vDisplacement = waveDisp + bulge;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

const FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  uniform sampler2D uVideo;
  uniform float uPlaneAspect;
  uniform float uVideoAspect;
  uniform float uReduceMotion;

  varying vec2 vUv;
  varying float vDisplacement;

  void main() {
    vec2 uv = vUv;

    // Object-fit: cover behavior in shader
    float ratio = uPlaneAspect / uVideoAspect;
    if (ratio > 1.0) {
      uv.y = (uv.y - 0.5) / ratio + 0.5;
    } else {
      uv.x = (uv.x - 0.5) * ratio + 0.5;
    }

    float motion = 1.0 - uReduceMotion;

    // Subtle parallax shift driven by displacement (sells 3D depth)
    uv += vec2(vDisplacement * 0.04) * motion;

    // Chromatic aberration that strengthens toward edges
    float distFromCenter = distance(vUv, vec2(0.5));
    float aberration = distFromCenter * 0.006 * motion;
    float r = texture2D(uVideo, uv + vec2(aberration, 0.0)).r;
    float g = texture2D(uVideo, uv).g;
    float b = texture2D(uVideo, uv - vec2(aberration, 0.0)).b;
    vec3 color = vec3(r, g, b);

    // Stylize to match the rest of the page (subtle desaturation + contrast)
    float gray = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(vec3(gray), color, 0.88);
    color = (color - 0.5) * 1.06 + 0.5;

    // Vignette
    float vignette = smoothstep(1.05, 0.25, distFromCenter);
    color *= mix(0.6, 1.0, vignette);

    gl_FragColor = vec4(color, 1.0);
  }
`

export function HeroVideo3D() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let width = container.clientWidth
    let height = container.clientHeight
    if (width === 0 || height === 0) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
    camera.position.z = 2.6

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height)
    renderer.setClearColor(0x000000, 1)
    container.appendChild(renderer.domElement)

    const video = document.createElement("video")
    video.src = "/hero-bg.mp4"
    video.loop = true
    video.muted = true
    video.playsInline = true
    video.autoplay = true
    video.crossOrigin = "anonymous"
    video.preload = "auto"
    video.play().catch(() => {
      // Autoplay may be blocked; user gesture will resume it
    })

    const videoTexture = new THREE.VideoTexture(video)
    videoTexture.minFilter = THREE.LinearFilter
    videoTexture.magFilter = THREE.LinearFilter
    videoTexture.generateMipmaps = false
    videoTexture.colorSpace = THREE.SRGBColorSpace

    // Oversized plane so 3D rotation never reveals edges
    const planeWidth = 4
    const planeHeight = 4 * (height / width)
    const planeGeo = new THREE.PlaneGeometry(planeWidth, planeHeight, 80, 80)

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const uniforms = {
      uVideo: { value: videoTexture },
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uScroll: { value: 0 },
      uPlaneAspect: { value: planeWidth / planeHeight },
      uVideoAspect: { value: 16 / 9 },
      uReduceMotion: { value: reduceMotion ? 1 : 0 },
    }

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
    })

    const plane = new THREE.Mesh(planeGeo, material)
    scene.add(plane)

    const targetMouse = new THREE.Vector2(0, 0)
    const smoothedMouse = new THREE.Vector2(0, 0)
    let targetScroll = 0
    let smoothedScroll = 0

    const isTouch =
      typeof window !== "undefined" &&
      ("ontouchstart" in window || navigator.maxTouchPoints > 0)

    const handleMouseMove = (event: MouseEvent) => {
      if (reduceMotion) return
      const rect = container.getBoundingClientRect()
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const y = -(((event.clientY - rect.top) / rect.height) * 2 - 1)
      targetMouse.set(x, y)
    }

    const handleScroll = () => {
      targetScroll = Math.min(Math.max(window.scrollY / 700, 0), 1.2)
    }

    const handleResize = () => {
      width = container.clientWidth
      height = container.clientHeight
      if (width === 0 || height === 0) return
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
      // Keep the plane covering the viewport at all sizes
      const newPlaneHeight = 4 * (height / width)
      plane.scale.set(1, newPlaneHeight / planeHeight, 1)
      uniforms.uPlaneAspect.value = planeWidth / newPlaneHeight
    }

    const handleVideoMetadata = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        uniforms.uVideoAspect.value = video.videoWidth / video.videoHeight
      }
    }

    const handleVisibility = () => {
      if (document.hidden) {
        video.pause()
      } else {
        video.play().catch(() => {})
      }
    }

    if (!isTouch) {
      window.addEventListener("mousemove", handleMouseMove, { passive: true })
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    window.addEventListener("resize", handleResize)
    document.addEventListener("visibilitychange", handleVisibility)
    video.addEventListener("loadedmetadata", handleVideoMetadata)

    let rafId = 0
    const clock = new THREE.Clock()

    const animate = () => {
      const elapsed = clock.getElapsedTime()
      uniforms.uTime.value = elapsed

      smoothedMouse.lerp(targetMouse, 0.08)
      uniforms.uMouse.value.copy(smoothedMouse)

      smoothedScroll += (targetScroll - smoothedScroll) * 0.08
      uniforms.uScroll.value = smoothedScroll

      if (!reduceMotion) {
        plane.rotation.y = smoothedMouse.x * 0.14
        plane.rotation.x = smoothedMouse.y * 0.09
      }

      renderer.render(scene, camera)
      rafId = requestAnimationFrame(animate)
    }
    rafId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(rafId)
      if (!isTouch) {
        window.removeEventListener("mousemove", handleMouseMove)
      }
      window.removeEventListener("scroll", handleScroll)
      window.removeEventListener("resize", handleResize)
      document.removeEventListener("visibilitychange", handleVisibility)
      video.removeEventListener("loadedmetadata", handleVideoMetadata)
      video.pause()
      video.removeAttribute("src")
      video.load()
      videoTexture.dispose()
      planeGeo.dispose()
      material.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement)
      }
    }
  }, [])

  return <div ref={containerRef} className="hero-bg-3d" aria-hidden="true" />
}
