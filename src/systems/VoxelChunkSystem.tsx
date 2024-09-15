import config from '@ir-engine/common/src/config'
import {
  defineQuery,
  defineSystem,
  Entity,
  EntityUUID,
  getComponent,
  getOptionalComponent,
  SimulationSystemGroup,
  useComponent,
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
import { generateWorldTerrain } from '../worldgen/WorldGeneration'
import { WebGLRenderer } from 'three'

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
  const chunkComponent = getOptionalComponent(entity, VoxelChunkComponent)
  if(!chunkComponent) return
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
    for (let y = 0; y < halfSize; y++) {
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
    loadedChunks.set(chunks as Record<string, Uint8Array>)
  }, [chunks])

  return loadedChunks.get(NO_PROXY)
}

const chunkQuery = defineQuery([VoxelComponent])
export default defineSystem({
  uuid: 'VoxelChunkSystem',
  insert: { after: SimulationSystemGroup },
  /**
   * @todo Replace this with actual logic for writing chunk data
   */
  execute: () => {
    const buttons = InputComponent.getMergedButtons(getState(EngineState).viewerEntity)
    if (buttons.KeyP?.down)
     writeWorld(getComponent(getAncestorWithComponents(chunkQuery()[0], [SceneComponent]), UUIDComponent))
  },

  reactor: () => {
    const chunkQuery = useQuery([VoxelComponent])

    console.log(chunkQuery[0])

    return <>{chunkQuery[0] && <SceneReactor worldEntity={chunkQuery[0]} />}</>
  }
})

/**@todo STOP DOING THIS */
const totalChunks = 8
const halfSize = totalChunks * 0.5

const SceneReactor = (props: {worldEntity: Entity}) => {
  const scene = useAncestorWithComponents(props.worldEntity, [SceneComponent])
  const worldUuid = useOptionalComponent(scene, UUIDComponent)
  return <>{worldUuid?.value && <WorldGenerationReactor worldUuid={worldUuid.value} />}</>
}

const WorldGenerationReactor = (props: { worldUuid: string }) => {
  const { worldUuid } = props
  const chunks = useLoadWorld(worldUuid)
  console.log(worldUuid)
  const { chunkSize, setVoxel, updateChunkGeometry } = VoxelComponent

  useEffect(() => {
    if(!chunks) return

    const terrainData = generateWorldTerrain(VoxelComponent.chunkSize*totalChunks)

    /**@todo ugly ugly ugly loops */
    for(const chunk in chunks)
      GenerateChunk(chunk, chunks[chunk], terrainData, worldUuid)

    for(const chunk in chunks){
      const [chunkX, chunkY, chunkZ] = chunk.split(',').map((n) => parseInt(n) * chunkSize)
      updateChunkGeometry(chunkX, chunkY, chunkZ)
    } 
    
  }, [chunks])
  return null
}

const GenerateChunk = (chunkId: string, chunk: Uint8Array | Error, terrainData: Float32Array, worldUuid: string) => {
  const { chunkSize, setVoxel, updateChunkGeometry } = VoxelComponent
  const [chunkX, chunkY, chunkZ] = chunkId.split(',').map((n) => parseInt(n) * chunkSize)
  if (chunk instanceof Error){
    for (let x = 0; x < chunkSize; x++) {
      for (let y = 0; y < chunkSize; y++) {
        for (let z = 0; z < chunkSize; z++) {
          const index = (((halfSize*chunkSize)+(chunkX+x))*(chunkSize*totalChunks)+((halfSize*chunkSize)+(chunkZ+z)))*4
          const height = 10+terrainData[index]*5
          if (chunkY+y < height) {
            setVoxel(chunkX+x, chunkY+y, chunkZ+z, chunkY+y < height - 1 ? 1 : 2)
          }
        }
      }
    }
    writeChunk(VoxelComponent.chunkIdToEntity[VoxelComponent.computeChunkId(chunkX, chunkY, chunkZ)], worldUuid)  
  }
  else{
    console.log(chunk)
    let i = 0
    for (let x = 0; x < chunkSize; x++) {
      for (let y = 0; y < chunkSize; y++) {
        for (let z = 0; z < chunkSize; z++) {
          setVoxel(chunkX + z, chunkY + x, chunkZ + y, chunk[i])
          i++
        }
      }
    }
  }
}