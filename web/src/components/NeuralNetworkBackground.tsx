import { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface NeuralNetworkBackgroundProps {
  className?: string
}

export default function NeuralNetworkBackground({ className = '' }: NeuralNetworkBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<{
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    nodes: THREE.Mesh[]
    connections: THREE.Line[]
    particles: THREE.Points
    animationId: number
  } | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    // 根据设备性能调整参数
    const isMobile = window.innerWidth < 768

    // 创建场景
    const scene = new THREE.Scene()
    scene.background = null

    // 创建相机
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
    camera.position.z = 50

    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({ 
      antialias: !isMobile,
      alpha: true,
      powerPreference: 'high-performance'
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2))
    container.appendChild(renderer.domElement)

    // 颜色配置 - 蓝紫渐变
    const colors = {
      blue: 0x3b82f6,
      purple: 0x8b5cf6,
      cyan: 0x06b6d4,
      pink: 0xec4899,
    }

    // 创建节点（神经网络节点）
    const nodes: THREE.Mesh[] = []
    const nodeCount = isMobile ? 20 : 40
    const nodeGeometry = new THREE.SphereGeometry(0.4, isMobile ? 8 : 16, isMobile ? 8 : 16)
    
    // 创建多种颜色的节点材质
    const nodeMaterials = [
      new THREE.MeshPhongMaterial({
        color: colors.blue,
        emissive: colors.blue,
        emissiveIntensity: 0.3,
        shininess: 100,
        transparent: true,
        opacity: 0.9,
      }),
      new THREE.MeshPhongMaterial({
        color: colors.purple,
        emissive: colors.purple,
        emissiveIntensity: 0.3,
        shininess: 100,
        transparent: true,
        opacity: 0.9,
      }),
      new THREE.MeshPhongMaterial({
        color: colors.cyan,
        emissive: colors.cyan,
        emissiveIntensity: 0.3,
        shininess: 100,
        transparent: true,
        opacity: 0.9,
      }),
    ]

    // 创建发光材质
    const glowMaterials = [
      new THREE.MeshBasicMaterial({ color: colors.blue, transparent: true, opacity: 0.15 }),
      new THREE.MeshBasicMaterial({ color: colors.purple, transparent: true, opacity: 0.15 }),
      new THREE.MeshBasicMaterial({ color: colors.cyan, transparent: true, opacity: 0.15 }),
    ]

    const glows: THREE.Mesh[] = []
    for (let i = 0; i < nodeCount; i++) {
      const materialIndex = i % 3
      const node = new THREE.Mesh(nodeGeometry, nodeMaterials[materialIndex])
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(1.2, 16, 16),
        glowMaterials[materialIndex]
      )

      // 随机位置 - 更大的分布范围
      node.position.set(
        (Math.random() - 0.5) * 80,
        (Math.random() - 0.5) * 50,
        (Math.random() - 0.5) * 50
      )
      glow.position.copy(node.position)

      scene.add(node)
      scene.add(glow)
      nodes.push(node)
      glows.push(glow)
    }

    // 创建连接线 - 渐变效果
    const connections: THREE.Line[] = []
    const connectionPairs: Array<{ start: THREE.Mesh; end: THREE.Mesh }> = []
    
    // 创建渐变连接线材质
    const connectionMaterials = [
      new THREE.LineBasicMaterial({ color: colors.blue, transparent: true, opacity: 0.2 }),
      new THREE.LineBasicMaterial({ color: colors.purple, transparent: true, opacity: 0.2 }),
      new THREE.LineBasicMaterial({ color: colors.cyan, transparent: true, opacity: 0.15 }),
    ]

    // 创建节点之间的连接 - 只连接距离较近的节点
    nodes.forEach((node, i) => {
      const connectionsPerNode = 2 + Math.floor(Math.random() * 2)
      const connectedIndices = new Set<number>()
      
      // 找到距离最近的几个节点
      const distances = nodes.map((other, j) => ({
        index: j,
        distance: node.position.distanceTo(other.position)
      })).sort((a, b) => a.distance - b.distance)
      
      for (let j = 1; j <= Math.min(connectionsPerNode, distances.length - 1); j++) {
        const targetIndex = distances[j].index
        if (targetIndex !== i && !connectedIndices.has(targetIndex) && distances[j].distance < 40) {
          connectedIndices.add(targetIndex)
          const targetNode = nodes[targetIndex]
          const geometry = new THREE.BufferGeometry().setFromPoints([
            node.position.clone(),
            targetNode.position.clone(),
          ])
          const line = new THREE.Line(geometry, connectionMaterials[i % 3])
          scene.add(line)
          connections.push(line)
          connectionPairs.push({ start: node, end: targetNode })
        }
      }
    })

    // 创建粒子系统 - 更多样的颜色
    const particleCount = isMobile ? 150 : 300
    const particleGeometry = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const particleColors = new Float32Array(particleCount * 3)
    const sizes = new Float32Array(particleCount)

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3
      positions[i3] = (Math.random() - 0.5) * 120
      positions[i3 + 1] = (Math.random() - 0.5) * 120
      positions[i3 + 2] = (Math.random() - 0.5) * 120

      // 蓝紫渐变色
      const color = new THREE.Color()
      const hue = 0.55 + Math.random() * 0.25 // 蓝色到紫色范围
      color.setHSL(hue, 0.8, 0.6)
      particleColors[i3] = color.r
      particleColors[i3 + 1] = color.g
      particleColors[i3 + 2] = color.b

      sizes[i] = Math.random() * 0.5 + 0.2
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3))

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    })

    const particles = new THREE.Points(particleGeometry, particleMaterial)
    scene.add(particles)

    // 添加光源 - 更丰富的光照
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3)
    scene.add(ambientLight)

    const pointLight1 = new THREE.PointLight(colors.blue, 1.5, 100)
    pointLight1.position.set(30, 30, 30)
    scene.add(pointLight1)

    const pointLight2 = new THREE.PointLight(colors.purple, 1.2, 100)
    pointLight2.position.set(-30, -30, 30)
    scene.add(pointLight2)

    const pointLight3 = new THREE.PointLight(colors.cyan, 1, 80)
    pointLight3.position.set(0, 40, -20)
    scene.add(pointLight3)

    // 鼠标交互
    let mouseX = 0
    let mouseY = 0
    const handleMouseMove = (event: MouseEvent) => {
      mouseX = (event.clientX / window.innerWidth) * 2 - 1
      mouseY = -(event.clientY / window.innerHeight) * 2 + 1
    }
    window.addEventListener('mousemove', handleMouseMove)

    // 动画
    let animationId: number = 0
    const clock = new THREE.Clock()

    const animate = () => {
      animationId = requestAnimationFrame(animate)

      const elapsedTime = clock.getElapsedTime()

      // 更新节点位置（轻微浮动）
      nodes.forEach((node, i) => {
        const baseY = Math.sin(elapsedTime * 0.5 + i * 0.5) * 0.015
        const baseX = Math.cos(elapsedTime * 0.3 + i * 0.3) * 0.015
        const baseZ = Math.sin(elapsedTime * 0.4 + i * 0.4) * 0.01
        node.position.y += baseY
        node.position.x += baseX
        node.position.z += baseZ
        node.rotation.x += 0.005
        node.rotation.y += 0.005

        // 更新发光效果
        const glow = glows[i]
        if (glow) {
          glow.position.copy(node.position)
          const scale = 1 + Math.sin(elapsedTime * 1.5 + i) * 0.3
          glow.scale.set(scale, scale, scale)
        }
      })

      // 更新连接线
      connections.forEach((line, i) => {
        const pair = connectionPairs[i]
        if (pair) {
          const positions = line.geometry.attributes.position
          if (positions) {
            positions.setXYZ(0, pair.start.position.x, pair.start.position.y, pair.start.position.z)
            positions.setXYZ(1, pair.end.position.x, pair.end.position.y, pair.end.position.z)
            positions.needsUpdate = true
          }
          // 脉冲效果
          const material = line.material as THREE.LineBasicMaterial
          material.opacity = 0.15 + Math.sin(elapsedTime * 2 + i) * 0.1
        }
      })

      // 更新粒子
      const particlePositions = particles.geometry.attributes.position
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3
        const y = particlePositions.array[i3 + 1]
        particlePositions.array[i3 + 1] += Math.sin(elapsedTime * 0.5 + i * 0.1) * 0.03
        
        // 边界检查
        if (y > 60) particlePositions.array[i3 + 1] = -60
        if (y < -60) particlePositions.array[i3 + 1] = 60
      }
      particlePositions.needsUpdate = true

      // 更新光源位置
      pointLight1.position.x = Math.sin(elapsedTime * 0.3) * 40
      pointLight1.position.y = Math.cos(elapsedTime * 0.2) * 30
      pointLight2.position.x = Math.cos(elapsedTime * 0.4) * 40
      pointLight2.position.z = Math.sin(elapsedTime * 0.3) * 30

      // 相机跟随鼠标
      camera.position.x += (mouseX * 15 - camera.position.x) * 0.03
      camera.position.y += (mouseY * 15 - camera.position.y) * 0.03
      camera.lookAt(scene.position)

      // 轻微旋转整个场景
      scene.rotation.y = elapsedTime * 0.03

      renderer.render(scene, camera)
    }

    animate()

    // 保存引用以便清理
    sceneRef.current = {
      scene,
      camera,
      renderer,
      nodes,
      connections,
      particles,
      animationId,
    }

    // 处理窗口大小变化（节流）
    let resizeTimeout: number | undefined
    const handleResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        if (!containerRef.current) return
        const newWidth = containerRef.current.clientWidth
        const newHeight = containerRef.current.clientHeight

        camera.aspect = newWidth / newHeight
        camera.updateProjectionMatrix()
        renderer.setSize(newWidth, newHeight)
      }, 100)
    }
    window.addEventListener('resize', handleResize)

    // 清理函数
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', handleResize)
      if (resizeTimeout) clearTimeout(resizeTimeout)
      cancelAnimationFrame(animationId)

      if (sceneRef.current) {
        // 清理几何体和材质
        nodes.forEach((node) => {
          node.geometry.dispose()
          if (Array.isArray(node.material)) {
            node.material.forEach((mat) => mat.dispose())
          } else {
            node.material.dispose()
          }
        })

        connections.forEach((line) => {
          line.geometry.dispose()
          if (Array.isArray(line.material)) {
            line.material.forEach((mat) => mat.dispose())
          } else {
            line.material.dispose()
          }
        })

        particles.geometry.dispose()
        if (Array.isArray(particles.material)) {
          particles.material.forEach((mat) => mat.dispose())
        } else {
          particles.material.dispose()
        }

        renderer.dispose()
        if (containerRef.current && renderer.domElement.parentNode) {
          containerRef.current.removeChild(renderer.domElement)
        }
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden ${className}`}
      style={{ zIndex: 0 }}
    />
  )
}
