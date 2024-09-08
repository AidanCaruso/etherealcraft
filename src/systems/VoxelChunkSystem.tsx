import config from '@ir-engine/common/src/config'
import {
  defineQuery,
  defineSystem,
  Entity,
  EntityUUID,
  getComponent,
  SimulationSystemGroup,
  useOptionalComponent,
  useQuery,
  UUIDComponent
} from '@ir-engine/ecs'
import { uploadProjectFiles } from '@ir-engine/editor/src/functions/assetFunctions'
import {
  defineAction,
  defineState,
  getMutableState,
  getState,
  matches,
  NO_PROXY,
  PeerID,
  useHookstate
} from '@ir-engine/hyperflux'
import { NetworkTopics } from '@ir-engine/network'
import { EngineState } from '@ir-engine/spatial/src/EngineState'
import { InputComponent } from '@ir-engine/spatial/src/input/components/InputComponent'
import { SceneComponent } from '@ir-engine/spatial/src/renderer/components/SceneComponents'
import {
  getAncestorWithComponents,
  useAncestorWithComponents
} from '@ir-engine/spatial/src/transform/components/EntityTree'
import React, { useEffect } from 'react'
import { matchesVector, Vector, VoxelChunkComponent, VoxelComponent } from '../components/VoxelChunkComponent'

export const VoxelActions = {
  setVoxel: defineAction({ type: 'SetVoxel', position: matchesVector, id: matches.number, $topic: NetworkTopics.world })
}

export const VoxelState = defineState({
  name: 'VoxelState',

  initial: [] as { position: Vector; id: number, from: PeerID }[],

  receptors: {
    onSetVoxel: VoxelActions.setVoxel.receive((action) => {
      getMutableState(VoxelState).merge([{ id: action.id, position: action.position, from: action.$peer }])
    })
  },

  reactor: () => {
    const voxelState = useHookstate(getMutableState(VoxelState))
    useEffect(() => {
      if (voxelState.value.length === 0) return
      const { position, id, from } = voxelState.value[voxelState.length - 1]
      VoxelComponent.setVoxel(position.x, position.y, position.z, id)
      VoxelComponent.updateVoxelGeometry(position.x, position.y, position.z)

      /**@todo reimplement this, it runs for all clients and only succedes for those with proper scopes*/
      if (!writingChunk) {
        writeChunk(
          VoxelComponent.chunkIdToEntity[VoxelComponent.computeChunkId(position.x, position.y, position.z)],
          getComponent(getAncestorWithComponents(chunkQuery()[0], [SceneComponent]), UUIDComponent)
        )
      }
    }, [voxelState])
    return null
  }
})

let writingChunk = false
export const writeChunk = (entity: Entity, world: string) => {
  const chunkComponent = getComponent(entity, VoxelChunkComponent)
  const blob = [chunkComponent.voxels.buffer]
  const file = new File(blob, `${chunkComponent.id}.chunk`)
  writingChunk = true
  /**@todo implement proper scoping for voxel world owners/editors */
  Promise.all(
    uploadProjectFiles(
      'aidan-caruso/etherealcraft',
      [file],
      [`projects/aidan-caruso/etherealcraft/public/world/${world}`]
    ).promises
  ).then(() => {
    writingChunk = false
  })
}

export const writeWorld = (world: string) => {
  for (const entity of Object.values(VoxelComponent.chunkIdToEntity)) {
    writeChunk(entity, world)
  }
}

const storageProviderHost = config.client.fileServer

export const useLoadChunk = (world: string, id: string) => {
  const url = `${storageProviderHost}/projects/aidan-caruso/etherealcraft/public/world/${world}/${id}.chunk`
  const chunk = useHookstate(null as Uint8Array | null | Error)
  useEffect(() => {
    if (!world) {
      chunk.set(new Error(world + ' world specified'))
      console.error(chunk.value)
      return
    }
    fetch(url).then((response) => {
      if (response.ok) {
        console.log(response)
        response.arrayBuffer().then((buffer) => {
          chunk.set(new Uint8Array(buffer))
        })
      } else {
        chunk.set(new Error(`Couldn't load chunk ${String(response.status)}`))
      }
    })
  }, [])

  return chunk.get(NO_PROXY)
}
export const useLoadWorld = (world: string) => {
  const chunks = {} as Record<string, Uint8Array | null | Error>
  for (let x = -halfSize; x < halfSize; x++) {
    /**@TODO TODOTODOTODO!!!!!!!!! */
    for (let y = 0; y < 1; y++) {
      for (let z = -halfSize; z < halfSize; z++) {
        const id = `${x},${y},${z}`
        chunks[id] = useLoadChunk(world, id)
      }
    }
  }
  const loadedChunks = useHookstate(null as Record<string, Uint8Array> | null | Error)
  useEffect(() => {
    const chunkValues = Object.values(chunks)
    if (chunkValues.some((chunk) => chunk === null) || loadedChunks.value != null) return
    if (chunkValues.some((chunk) => chunk instanceof Error)) {
      loadedChunks.set(new Error('Stopped loading world'))
      console.error(loadedChunks.value)
      return
    }
    loadedChunks.set(chunks as Record<string, Uint8Array>)
  }, [chunks])

  return loadedChunks.get(NO_PROXY)
}

const chunkQuery = defineQuery([VoxelComponent])
export default defineSystem({
  uuid: 'VoxelChunkSystem',
  insert: { after: SimulationSystemGroup },
  /**
   * @todo Replace this with actual logic for writing chunk data on the server
   */
  execute: () => {
    const buttons = InputComponent.getMergedButtons(getState(EngineState).viewerEntity)
    if (buttons.KeyP?.down)
      writeWorld(getComponent(getAncestorWithComponents(chunkQuery()[0], [SceneComponent]), UUIDComponent))
  },

  reactor: () => {
    const chunkQuery = useQuery([VoxelComponent])

    const scene = useAncestorWithComponents(chunkQuery[0], [SceneComponent])
    const sceneUuid = useOptionalComponent(scene, UUIDComponent)

    return <>{sceneUuid?.value && <WorldGenerationReactor worldUuid={sceneUuid.value} />}</>
  }
})

/**@todo STOP DOING THIS */
const totalChunks = 8
const halfSize = totalChunks * 0.5

const WorldGenerationReactor = (props: { worldUuid: string }) => {
  const worldUuid = props.worldUuid
  const chunks = useLoadWorld(worldUuid)

  const { chunkSize, setVoxel, updateChunkGeometry } = VoxelComponent
  useEffect(() => {
    if (!chunks || chunks instanceof Error) {
      console.log('generating a new world')
      /**@todo actual world generation code */
      for (let x = -halfSize*chunkSize; x < halfSize * chunkSize; x++) {
        for (let y = 0; y < halfSize * chunkSize; y++) {
          for (let z = -halfSize*chunkSize; z < halfSize * chunkSize; z++) {
            const height =
              (Math.sin((x / chunkSize) * Math.PI * 2) + Math.sin((z / chunkSize) * Math.PI * 3)) * (chunkSize / 6) +
              chunkSize / 2
            if (y < height) {
              setVoxel(x, y, z, y < height - 1 ? 1 : 2)
            }
          }
        }
      }

      for (let x = -halfSize; x < halfSize; x++) {
        for (let y = -halfSize; y < halfSize; y++) {
          for (let z = -halfSize; z < halfSize; z++) {
            updateChunkGeometry(x * chunkSize, y * chunkSize, z * chunkSize)
          }
        }
      }

      writeWorld(worldUuid)
      return
    }

    for (const chunk in chunks) {
      const [chunkX, chunkY, chunkZ] = chunk.split(',').map((n) => parseInt(n) * chunkSize)
      let i = 0

      for (let x = 0; x < chunkSize; x++) {
        for (let y = 0; y < chunkSize; y++) {
          for (let z = 0; z < chunkSize; z++) {
            setVoxel(chunkX + z, chunkY + x, chunkZ + y, chunks[chunk][i])
            i++
          }
        }
      }
    }
    for(const chunk in chunks){
      const [chunkX, chunkY, chunkZ] = chunk.split(',').map((n) => parseInt(n) * chunkSize)
      updateChunkGeometry(chunkX, chunkY, chunkZ)
    } 
  
  }, [chunks])
  return null
}
