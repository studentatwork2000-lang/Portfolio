import { useEffect, useState } from 'react'
import { extend, useThree } from '@react-three/fiber'
import { Sprite, SpriteMaterial, SRGBColorSpace, Texture, TextureLoader } from 'three'
import earthSource from '../../assets/celestial/earth-source.png'
import astronautSource from '../../assets/celestial/astronaut-source.png'

extend({ Sprite, SpriteMaterial })

const DEG = Math.PI / 180

type Placement = { yaw: number; elevation: number; distance: number; angularSize: number; rotation: number }
type CelestialConfig = {
  astronaut: Placement
  earth: Placement & { centerY: number }
}

const defaultConfig: CelestialConfig = {
  astronaut: { yaw: -73, elevation: 34, distance: 76, angularSize: 9.7, rotation: 10.5 },
  earth: { yaw: 74.2, elevation: -6.9, distance: 48, angularSize: 42.6, centerY: 1.79, rotation: 0 },
}

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
    name: 'astronaut',
    source: astronautSource,
    axis: 'height',
    center: [0.5, 0.5],
    // Full-body alpha bounds span 1267 of the source's 1402 vertical pixels.
    visibleFraction: 1267 / 1402,
  },
  {
    name: 'earth',
    source: earthSource,
    axis: 'width',
    // The horizon artwork ends at rectangular source edges. Keep those beyond
    // the deepest camera view by offsetting the whole sprite in its world plane.
    // This is a geometry anchor, not a texture crop or pointer-driven reveal.
    center: [0.5, defaultConfig.earth.centerY],
    visibleFraction: 1,
  },
] as const

type DiscoveryProps = {
  source: string
  position: [number, number, number]
  distance: number
  angularSize: number
  axis: 'height' | 'width'
  center: readonly [number, number]
  visibleFraction: number
  rotation: number
}

function Discovery({ source, position, distance, angularSize, axis, center, visibleFraction, rotation }: DiscoveryProps) {
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
        rotation={rotation * DEG}
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
  return discoveries.map((discovery) => {
    const placement = defaultConfig[discovery.name]
    return <Discovery
      key={discovery.source}
      {...discovery}
      position={worldDirection(placement.yaw, placement.elevation, placement.distance)}
      distance={placement.distance}
      angularSize={placement.angularSize}
      center={discovery.center}
      rotation={placement.rotation}
    />
  })
}
