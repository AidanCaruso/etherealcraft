import {
  Engine,
  Entity,
  createEntity,
  defineComponent,
  getComponent,
  getOptionalComponent,
  hasComponent,
  removeComponent,
  setComponent
} from '@etherealengine/ecs'
import { matches } from '@etherealengine/hyperflux'
import { TransformComponent } from '@etherealengine/spatial'
import { NameComponent } from '@etherealengine/spatial/src/common/NameComponent'
import { ColliderComponent } from '@etherealengine/spatial/src/physics/components/ColliderComponent'
import { RigidBodyComponent } from '@etherealengine/spatial/src/physics/components/RigidBodyComponent'
import { CollisionGroups } from '@etherealengine/spatial/src/physics/enums/CollisionGroups'
import { BodyTypes } from '@etherealengine/spatial/src/physics/types/PhysicsTypes'
import { addObjectToGroup } from '@etherealengine/spatial/src/renderer/components/GroupComponent'
import { MeshComponent } from '@etherealengine/spatial/src/renderer/components/MeshComponent'
import { VisibleComponent } from '@etherealengine/spatial/src/renderer/components/VisibleComponent'
import { EntityTreeComponent } from '@etherealengine/spatial/src/transform/components/EntityTree'
import {
  BufferAttribute,
  BufferGeometry,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  ShaderMaterial,
  UniformsLib,
  Vector3
} from 'three'
import { fragmentShader, vertexShader } from '../shaders/VoxelTerrainShader'

export const axes = ['x', 'y', 'z'] as const
export type Vector = { x: number; y: number; z: number }
const matchesVectorShape = matches.shape({
  x: matches.number,
  y: matches.number,
  z: matches.number
})
export const matchesVector = matches.guard((v): v is Vector => matchesVectorShape.test(v))

export const VoxelComponent = defineComponent({
  name: 'Voxel Manager',
  jsonID: 'voxelManager',
  onInit: (entity) => {},

  chunkSize: 32,
  tileSize: 1,
  tileTextureSize: 64,

  cubeFaces: [
    {
      // left
      uvRow: 0,
      dir: [-1, 0, 0],
      corners: [
        { pos: [0, 1, 0], uv: [0, 1] },
        { pos: [0, 0, 0], uv: [0, 0] },
        { pos: [0, 1, 1], uv: [1, 1] },
        { pos: [0, 0, 1], uv: [1, 0] }
      ]
    },
    {
      // right
      uvRow: 0,
      dir: [1, 0, 0],
      corners: [
        { pos: [1, 1, 1], uv: [0, 1] },
        { pos: [1, 0, 1], uv: [0, 0] },
        { pos: [1, 1, 0], uv: [1, 1] },
        { pos: [1, 0, 0], uv: [1, 0] }
      ]
    },
    {
      // bottom
      uvRow: 1,
      dir: [0, -1, 0],
      corners: [
        { pos: [1, 0, 1], uv: [1, 0] },
        { pos: [0, 0, 1], uv: [0, 0] },
        { pos: [1, 0, 0], uv: [1, 1] },
        { pos: [0, 0, 0], uv: [0, 1] }
      ]
    },
    {
      // top
      uvRow: 2,
      dir: [0, 1, 0],
      corners: [
        { pos: [0, 1, 1], uv: [1, 1] },
        { pos: [1, 1, 1], uv: [0, 1] },
        { pos: [0, 1, 0], uv: [1, 0] },
        { pos: [1, 1, 0], uv: [0, 0] }
      ]
    },
    {
      // back
      uvRow: 0,
      dir: [0, 0, -1],
      corners: [
        { pos: [1, 0, 0], uv: [0, 0] },
        { pos: [0, 0, 0], uv: [1, 0] },
        { pos: [1, 1, 0], uv: [0, 1] },
        { pos: [0, 1, 0], uv: [1, 1] }
      ]
    },
    {
      // front
      uvRow: 0,
      dir: [0, 0, 1],
      corners: [
        { pos: [0, 0, 1], uv: [0, 0] },
        { pos: [1, 0, 1], uv: [1, 0] },
        { pos: [0, 1, 1], uv: [0, 1] },
        { pos: [1, 1, 1], uv: [1, 1] }
      ]
    }
  ],

  computeVoxelOffset(x, y, z) {
    const { chunkSize } = VoxelComponent
    const voxelX = MathUtils.euclideanModulo(x, chunkSize) | 0
    const voxelY = MathUtils.euclideanModulo(y, chunkSize) | 0
    const voxelZ = MathUtils.euclideanModulo(z, chunkSize) | 0
    return voxelY * (chunkSize * chunkSize) + voxelZ * chunkSize + voxelX
  },

  computeChunkId: (x, y, z) => {
    const chunkX = Math.floor(x / VoxelComponent.chunkSize)
    const chunkY = Math.floor(y / VoxelComponent.chunkSize)
    const chunkZ = Math.floor(z / VoxelComponent.chunkSize)
    return `${chunkX},${chunkY},${chunkZ}`
  },

  setChunkAtVoxel: (x, y, z) => {
    const chunkId = VoxelComponent.computeChunkId(x, y, z)
    const chunkEntity = createEntity()
    setComponent(chunkEntity, VoxelChunkComponent, {
      voxels: new Uint8Array(VoxelComponent.chunkSize * VoxelComponent.chunkSize * VoxelComponent.chunkSize)
    })
    setComponent(chunkEntity, NameComponent, 'Voxel Chunk')
    VoxelComponent.chunkIdToEntity[chunkId] = chunkEntity
  },

  getChunkAtVoxel: (x, y, z) => {
    return getOptionalComponent(
      VoxelComponent.chunkIdToEntity[VoxelComponent.computeChunkId(x, y, z)],
      VoxelChunkComponent
    )
  },

  setVoxel: (x, y, z, v) => {
    if (!VoxelComponent.chunkIdToEntity[VoxelComponent.computeChunkId(x, y, z)]) VoxelComponent.setChunkAtVoxel(x, y, z)
    const chunk = VoxelComponent.getChunkAtVoxel(x, y, z)
    if (!chunk) return
    const voxelOffset = VoxelComponent.computeVoxelOffset(x, y, z)
    chunk[voxelOffset] = v
  },

  getVoxel: (x, y, z) => {
    const chunk = VoxelComponent.getChunkAtVoxel(x, y, z)
    if (!chunk) {
      return 0
    }
    const voxelOffset = VoxelComponent.computeVoxelOffset(x, y, z)
    return chunk[voxelOffset]
  },

  generateGeometryDataForChunk: (chunkX: number, chunkY: number, chunkZ: number) => {
    const positions = [] as number[]
    const normals = [] as number[]
    const uvs = [] as number[]
    const indices = [] as number[]
    const startX = chunkX * VoxelComponent.chunkSize
    const startY = chunkY * VoxelComponent.chunkSize
    const startZ = chunkZ * VoxelComponent.chunkSize
    for (let x = 0; x < VoxelComponent.chunkSize; x++) {
      const voxelX = startX + x
      for (let y = 0; y < VoxelComponent.chunkSize; y++) {
        const voxelY = startY + y
        for (let z = 0; z < VoxelComponent.chunkSize; z++) {
          const voxelZ = startZ + z
          const voxel = VoxelComponent.getVoxel(voxelX, voxelY, voxelZ)
          if (voxel) {
            // voxel 0 is sky (empty) so for UVs we start at 0
            const uvVoxel = voxel - 1
            // There is a voxel here but do we need faces for it?
            for (const { dir, corners, uvRow } of VoxelComponent.cubeFaces) {
              const neighbor = VoxelComponent.getVoxel(voxelX + dir[0], voxelY + dir[1], voxelZ + dir[2])
              if (!neighbor) {
                // this voxel has no neighbor in this direction so we need a face
                const ndx = positions.length / 3
                for (const { pos, uv } of corners) {
                  positions.push(pos[0] + x, pos[1] + y, pos[2] + z)
                  normals.push(...dir)
                  uvs.push(uvVoxel + uv[0], 1 - (uvRow + 1 - uv[1]))
                }
                indices.push(ndx, ndx + 1, ndx + 2, ndx + 2, ndx + 1, ndx + 3)
              }
            }
          }
        }
      }
    }

    return {
      positions,
      normals,
      uvs,
      indices
    }
  },

  neighborOffsets: [
    [0, 0, 0], // self
    [-1, 0, 0], // left
    [1, 0, 0], // right
    [0, -1, 0], // down
    [0, 1, 0], // up
    [0, 0, -1], // back
    [0, 0, 1] // front
  ],

  updateVoxelGeometry(x, y, z) {
    const updatedChunkIds = {}
    for (const offset of VoxelComponent.neighborOffsets) {
      const ox = x + offset[0]
      const oy = y + offset[1]
      const oz = z + offset[2]
      const chunkId = VoxelComponent.computeChunkId(ox, oy, oz)
      if (!updatedChunkIds[chunkId]) {
        updatedChunkIds[chunkId] = true
        VoxelComponent.updateChunkGeometry(ox, oy, oz)
      }
    }
  },

  chunkIdToEntity: {} as Record<string, Entity>,

  updateChunkGeometry(x: number, y: number, z: number) {
    const chunkX = Math.floor(x / VoxelComponent.chunkSize)
    const chunkY = Math.floor(y / VoxelComponent.chunkSize)
    const chunkZ = Math.floor(z / VoxelComponent.chunkSize)
    const chunkId = VoxelComponent.computeChunkId(x, y, z)
    const entity = VoxelComponent.chunkIdToEntity[chunkId]
    if (!entity) return
    const meshComponent = getOptionalComponent(entity, MeshComponent)
    if (!meshComponent) {
      const geometry = new BufferGeometry()
      const positionNumComponents = 3
      const normalNumComponents = 3
      const uvNumComponents = 2

      geometry.setAttribute('position', new BufferAttribute(new Float32Array(1), positionNumComponents))
      geometry.setAttribute('normal', new BufferAttribute(new Float32Array(1), normalNumComponents))
      geometry.setAttribute('uv', new BufferAttribute(new Float32Array(1), uvNumComponents))

      const mesh = new Mesh(geometry, new MeshStandardMaterial())
      ;(mesh.material as any) = new ShaderMaterial({
        uniforms: UniformsLib.lights,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader
      })
      mesh.name = chunkId
      setComponent(entity, MeshComponent, mesh)
      setComponent(entity, VisibleComponent, true)
      addObjectToGroup(entity, mesh)
    }

    const { positions, normals, uvs, indices } = VoxelComponent.generateGeometryDataForChunk(chunkX, chunkY, chunkZ)
    const geometry = getComponent(entity, MeshComponent).geometry
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
    geometry.getAttribute('position').needsUpdate = true
    geometry.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3))
    geometry.getAttribute('normal').needsUpdate = true
    geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2))
    geometry.getAttribute('uv').needsUpdate = true
    geometry.setIndex(indices)
    setComponent(entity, RigidBodyComponent, { type: BodyTypes.Fixed })
    setComponent(entity, EntityTreeComponent, { parentEntity: Engine.instance.originEntity })
    setComponent(entity, TransformComponent, {
      position: new Vector3(
        chunkX * VoxelComponent.chunkSize,
        chunkY * VoxelComponent.chunkSize,
        chunkZ * VoxelComponent.chunkSize
      )
    })
    if (hasComponent(entity, ColliderComponent)) removeComponent(entity, ColliderComponent)
    setComponent(entity, ColliderComponent, {
      shape: 'mesh',
      collisionLayer: CollisionGroups.Ground,
      collisionMask: CollisionGroups.Default | CollisionGroups.Avatars
    })
  }
})

export const VoxelChunkComponent = defineComponent({
  name: 'VoxelChunk',
  onInit: () => {
    return { voxels: Uint8Array.from([]) }
  },

  onSet: (entity, component, json) => {
    if (!json) return
    if (json.voxels) component.voxels.set(json.voxels)
  }
})
