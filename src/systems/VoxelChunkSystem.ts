import { defineSystem, Entity, EntityUUID, getComponent, setComponent, SimulationSystemGroup, useQuery } from "@ir-engine/ecs"
import {useEffect} from 'react'
import { matchesVector, Vector, VoxelChunkComponent, VoxelComponent } from "../components/VoxelChunkComponent"
import { defineAction, defineState, getMutableState, getState, matches, NO_PROXY, none, useHookstate } from "@ir-engine/hyperflux"
import { NetworkTopics } from "@ir-engine/network"
import { uploadToFeathersService } from "@ir-engine/client-core/src/util/upload"
import { fileBrowserUploadPath, uploadAssetPath } from "@ir-engine/common/src/schema.type.module"
import { isClient } from "@ir-engine/common/src/utils/getEnvironment"
import config from "@ir-engine/common/src/config"
import { InputComponent } from "@ir-engine/spatial/src/input/components/InputComponent"
import { EngineState } from "@ir-engine/spatial/src/EngineState"

export const VoxelActions = {
  setVoxel: defineAction({    type: 'SetVoxel',
  position: matchesVector,
  id: matches.number,
  $topic: NetworkTopics.world}
  )
}

export const VoxelState = defineState({
  name: 'VoxelState',

  initial: [] as {position: Vector, id: number}[],

  receptors: {
    onSetVoxel: VoxelActions.setVoxel.receive((action) => {
      getMutableState(VoxelState).merge([{id: action.id, position: action.position}])
    })
  },

  reactor: () => {
    const voxelState = useHookstate(getMutableState(VoxelState))
    useEffect(() => {
      if(voxelState.value.length === 0) return
      const  {position, id} = voxelState.value[voxelState.length-1]
      VoxelComponent.setVoxel(position.x, position.y, position.z, id)
      VoxelComponent.updateVoxelGeometry(position.x, position.y, position.z)
    }, [voxelState])
    return null
  }
})

export const writeChunk = (entity: Entity) => {
  const chunkComponent = getComponent(entity, VoxelChunkComponent)
  const blob = [chunkComponent.voxels.buffer]
  const file = new File(blob, `${chunkComponent.id}.chunk`)
  uploadToFeathersService(fileBrowserUploadPath, [file], {
    args: [
      {
        fileName: file.name,
        project: 'aidan-caruso/etherealcraft',
        path: 'public/world/' + file.name,
        contentType: file.type,
        type: 'thumbnail',
      }
    ]
  })
}


export const writeWorld = () => {
  for(const entity of Object.values(VoxelComponent.chunkIdToEntity)){
    writeChunk(entity)
  }
}

const storageProviderHost = config.client.fileServer

export const useLoadChunk = (world: string, id: string) => {
  const url = `${storageProviderHost}${'/projects/aidan-caruso/etherealcraft/public/world/'}${id}.chunk`
  console.log(url)
  const chunk = useHookstate(null as Uint8Array | null | Error)
  useEffect(() => {
    fetch(url).then((response) => {
      if(response.ok){
        response.arrayBuffer().then((buffer) => {
          chunk.set(new Uint8Array(buffer))
        })
      }
      else{chunk.set(new Error(`Couldn't load chunk ${String(response.status)}`))}
    })
  }, [])
  
  return chunk.get(NO_PROXY)
}

export const useLoadWorld = (world: string) => {
  const totalChunks = 4
  const chunks = {} as Record<string, (Uint8Array | null | Error)>
  for(let x = 0; x < totalChunks; x++) {
    for(let y = 0; y < 1; y++) {
      for(let z = 0; z < totalChunks; z++) {
        const id = `${x},${y},${z}`
        chunks[id] = (useLoadChunk(world, id))
      }
    }
  }
  const loadedChunks = useHookstate(null as Record<string, (Uint8Array)> | null | Error)
  useEffect(() => {
    const chunkValues = Object.values(chunks)
    if(chunkValues.some((chunk) => chunk === null) || loadedChunks.value != null) return
    if(chunkValues.some((chunk) => chunk instanceof Error)){
      loadedChunks.set(new Error('Stopped loading world'))
      return
    }
    loadedChunks.set(chunks as Record<string, (Uint8Array)>)
  }, [chunks])

  return loadedChunks.get(NO_PROXY)
}

export default defineSystem({
  uuid: 'VoxelChunkSystem',
  insert: { after: SimulationSystemGroup },
   /**
  * @todo Replace this with actual logic for writing chunk data on the server
  */
  execute: () => {
    const buttons = InputComponent.getMergedButtons(getState(EngineState).viewerEntity)
    if(buttons.KeyP?.down) writeWorld()
  },

  reactor: () => {
    const chunkQuery = useQuery([VoxelComponent])
    const {chunkSize, setVoxel, updateChunkGeometry} = VoxelComponent
    const totalChunks = 4

    const chunks = useLoadWorld('world')

    useEffect(() => {
      if(chunkQuery.length === 0) return
      
      if(!chunks) return
      console.log(chunks)

      if(chunks instanceof Error) {
        /**@todo actual world generation code */
        for (let x = 0; x < chunkSize*totalChunks; x++) {
          for (let y = 0; y < chunkSize*totalChunks; y++) {
            for (let z = 0; z < chunkSize*totalChunks; z++) {
              const height = (Math.sin(x / chunkSize * Math.PI * 2) + Math.sin(z / chunkSize * Math.PI * 3)) * (chunkSize / 6) + (chunkSize / 2)
              if (y < height) {
                setVoxel(x, y, z, y < height - 1 ? 1 : 2)
              }
            }
          }
        }

        if(isClient){
          for(let x = 0; x < totalChunks; x++) {
            for(let y = 0; y < totalChunks; y++) {
              for(let z = 0; z < totalChunks; z++) {
                updateChunkGeometry(x*chunkSize, y*chunkSize, z*chunkSize)
              }
            }
          }
        }

        return
      }

      for (const chunk in chunks){
        const [chunkX, chunkY, chunkZ] = chunk.split(',').map((n) => parseInt(n)*chunkSize)
        console.log(chunkX, chunkY, chunkZ)
        let i = 0

        for (let x = 0; x < chunkSize; x++) {
          for (let y = 0; y < chunkSize; y++) {
            for (let z = 0; z < chunkSize; z++) {
              setVoxel(chunkX+z, chunkY+x, chunkZ+y, chunks[chunk][i])
              i++
            }
          }
        }
        updateChunkGeometry(chunkX, chunkY, chunkZ)

      }
    }, [chunks, chunkQuery])

    useEffect( () => {
      if(chunkQuery.length === 0) return

      
      
    }, [chunkQuery])

    return null
  }
})