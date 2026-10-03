import { useEffect, useState } from 'react'
import { extend, useThree } from '@react-three/fiber'
import { Sprite, SpriteMaterial, SRGBColorSpace, Texture, TextureLoader } from 'three'
import earthSource from '../../assets/celestial/earth-source.png'
import astronautSource from '../../assets/celestial/astronaut-source.png'

extend({ Sprite, SpriteMaterial })

const DEG = Math.PI / 180

// Match the existing YXZ camera: right is +X, up is +Y, forward is -Z.
function worldDirection(yaw: number, elevation: number, distance: number): [number, number, number] {
  const horizontal = distance * Math.cos(elevation * DEG)
  return [
    horizontal * Math.sin(yaw * DEG),
    distance * Math.sin(elevation * DEG),
    -horizontal * Math.cos(yaw * DEG),
  ]
}

const discoveries = [
  {
    source: astronautSource,
    position: worldDirection(-22, 41, 24),
    distance: 24,
    angularSize: 4,
    axis: 'height',
    center: [0.5, 0.5],
    // Full-body alpha bounds span 1267 of the source's 1402 vertical pixels.
    visibleFraction: 1267 / 1402,
  },
  {
    source: earthSource,
    position: worldDirection(18, -50, 48),
    distance: 48,
    angularSize: 20,
    axis: 'width',
    // The horizon artwork ends at rectangular source edges. Keep those beyond
    // the deepest camera view by offsetting the whole sprite in its world plane.
    // This is a geometry anchor, not a texture crop or pointer-driven reveal.
    center: [0.5, 1.55],
    visibleFraction: 1,
  },
] as const

function Discovery({ source, position, distance, angularSize, axis, center, visibleFraction }: typeof discoveries[number]) {
  const [texture, setTexture] = useState<Texture<HTMLImageElement> | null>(null)
  const invalidate = useThree((state) => state.invalidate)

  useEffect(() => {
    let active = true
    // Independent loads keep a missing discovery from suspending/failing the sky.
    const pending = new TextureLoader().load(source, (loaded) => {
      if (!active) {
        loaded.dispose()
        return
      }
      loaded.colorSpace = SRGBColorSpace
      setTexture(loaded)
      invalidate()
    }, undefined, () => {
      if (active) setTexture(null)
    })
    return () => {
      active = false
      pending.dispose()
    }
  }, [source, invalidate])

  if (!texture) return null

  const aspect = texture.image.width / texture.image.height
  const extent = 2 * distance * Math.tan(angularSize * DEG / 2) / visibleFraction
  const height = axis === 'height' ? extent : extent / aspect
  const width = height * aspect

  return (
    <sprite position={position} scale={[width, height, 1]} center={center} renderOrder={1}>
      <spriteMaterial
        map={texture}
        transparent
        opacity={1}
        depthWrite={false}
        depthTest={false}
        toneMapped={false}
      />
    </sprite>
  )
}

export default function CelestialDiscoveries() {
  return discoveries.map((discovery) => <Discovery key={discovery.source} {...discovery} />)
}
