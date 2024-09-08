import config from '@ir-engine/common/src/config'
import { isClient } from '@ir-engine/common/src/utils/getEnvironment'
import {
  defineQuery,
  defineSystem,
  Entity,
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
import { matchesVector, Vector, VoxelChunkComponent, VoxelComponent } from '../components/VoxelChunkComponent'
import React, { useEffect } from 'react'

export const VoxelActions = {
  setVoxel: defineAction({ type: 'SetVoxel', position: matchesVector, id: matches.number, $topic: NetworkTopics.world })
}

export const VoxelState = defineState({
  name: 'VoxelState',

  initial: [] as { position: Vector; id: number }[],

  receptors: {
    onSetVoxel: VoxelActions.setVoxel.receive((action) => {
      getMutableState(VoxelState).merge([{ id: action.id, position: action.position }])
    })
  },

  reactor: () => {
    const voxelState = useHookstate(getMutableState(VoxelState))
    useEffect(() => {
      if (voxelState.value.length === 0) return
      const { position, id } = voxelState.value[voxelState.length - 1]
      VoxelComponent.setVoxel(position.x, position.y, position.z, id)
      VoxelComponent.updateVoxelGeometry(position.x, position.y, position.z)
    }, [voxelState])
    return null
  }
})

export const writeChunk = (entity: Entity, world: string) => {
  const chunkComponent = getComponent(entity, VoxelChunkComponent)
  const blob = [chunkComponent.voxels.buffer]
  const file = new File(blob, `${chunkComponent.id}.chunk`)
  uploadProjectFiles(
    'aidan-caruso/etherealcraft',
    [file],
    [`projects/aidan-caruso/etherealcraft/public/world/${world}`]
  )

  // uploadToFeathersService(fileBrowserUploadPath, [file], {
  //   args: [
  //     {
  //       fileName: file.name,
  //       project: 'aidan-caruso/etherealcraft',
  //       path: `public/world/${world}/${file.name}`,
  //       contentType: file.type,
  //       type: 'thumbnail',
  //     }
  //   ]
  // })
}

export const writeWorld = (world: string) => {
  for (const entity of Object.values(VoxelComponent.chunkIdToEntity)) {
    writeChunk(entity, world)
  }
}

const storageProviderHost = config.client.fileServer

export const useLoadChunk = (world: string, id: string) => {
  const url = `${storageProviderHost}/projects/aidan-caruso/etherealcraft/public/world/${world}/${id}.chunk`
  console.log(url)
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
  const totalChunks = 4
  const chunks = {} as Record<string, Uint8Array | null | Error>
  for (let x = 0; x < totalChunks; x++) {
    for (let y = 0; y < 1; y++) {
      for (let z = 0; z < totalChunks; z++) {
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

    return <>
      {sceneUuid?.value && <WorldGenerationReactor worldUuid={sceneUuid.value} />}
    </>
  }
})

const WorldGenerationReactor = (props: { worldUuid: string }) => {
  const worldUuid = props.worldUuid
  const chunks = useLoadWorld(worldUuid)

  /**@todo STOP DOING THIS */
  const totalChunks = 4
  
  const { chunkSize, setVoxel, updateChunkGeometry } = VoxelComponent

  useEffect(() => {
    if (!chunks) return

    if (chunks instanceof Error) {
      console.log('generating a new world')
      /**@todo actual world generation code */
      for (let x = 0; x < chunkSize * totalChunks; x++) {
        for (let y = 0; y < chunkSize * totalChunks; y++) {
          for (let z = 0; z < chunkSize * totalChunks; z++) {
            const height =
              (Math.sin((x / chunkSize) * Math.PI * 2) + Math.sin((z / chunkSize) * Math.PI * 3)) * (chunkSize / 6) +
              chunkSize / 2
            if (y < height) {
              setVoxel(x, y, z, y < height - 1 ? 1 : 2)
            }
          }
        }
      }

      if (isClient) {
        for (let x = 0; x < totalChunks; x++) {
          for (let y = 0; y < totalChunks; y++) {
            for (let z = 0; z < totalChunks; z++) {
              updateChunkGeometry(x * chunkSize, y * chunkSize, z * chunkSize)
            }
          }
        }
      }
      return
    }

    for (const chunk in chunks) {
      const [chunkX, chunkY, chunkZ] = chunk.split(',').map((n) => parseInt(n) * chunkSize)
      console.log(chunkX, chunkY, chunkZ)
      let i = 0

      for (let x = 0; x < chunkSize; x++) {
        for (let y = 0; y < chunkSize; y++) {
          for (let z = 0; z < chunkSize; z++) {
            setVoxel(chunkX + z, chunkY + x, chunkZ + y, chunks[chunk][i])
            i++
          }
        }
      }
      updateChunkGeometry(chunkX, chunkY, chunkZ)
    }
  }, [chunks])
  return null
}
