import { defineSystem, Entity, EntityUUID, getComponent, setComponent, SimulationSystemGroup, useQuery } from "@etherealengine/ecs"
import {useEffect} from 'react'
import { matchesVector, Vector, VoxelChunkComponent, VoxelComponent } from "../components/VoxelChunkComponent"
import { defineAction, defineState, getMutableState, getState, matches, NO_PROXY, none, useHookstate } from "@etherealengine/hyperflux"
import { NetworkTopics } from "@etherealengine/network"
import { uploadToFeathersService } from "@etherealengine/client-core/src/util/upload"
import { fileBrowserUploadPath, uploadAssetPath } from "@etherealengine/common/src/schema.type.module"
import { isClient } from "@etherealengine/common/src/utils/getEnvironment"
import config from "@etherealengine/common/src/config"
import {useMemo} from 'react'
import { InputComponent } from "@etherealengine/spatial/src/input/components/InputComponent"
import { EngineState } from "@etherealengine/spatial/src/EngineState"

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
        project: 'etherealcraft',
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
    return
  }
}

const storageProviderHost = config.client.fileServer

export const useLoadChunk = (world: string, id: string) => {
  const url = `${storageProviderHost}/projects/etherealcraft/public/${world}/${id}.chunk`
  const chunk = useHookstate(null as Uint8Array | null)
  useEffect(() => {
    fetch(url).then((response) => {
      if(response.ok){
        response.arrayBuffer().then((buffer) => {
          chunk.set(new Uint8Array(buffer))
        })
      }
      else{throw new Error('Failed to load chunk at ' + url)}
    })
  }, [])
  
  return chunk
}

export const useLoadWorld = (world: string) => {

}

export default defineSystem({
  uuid: 'VoxelChunkSystem',
  insert: { after: SimulationSystemGroup },
   /**@TODO READ/WRITE TESTING ONLY
  * Replace this with actual UI for writing chunk data on the server
  */
  execute: () => {
    const buttons = InputComponent.getMergedButtons(getState(EngineState).viewerEntity)
    if(buttons.F6) writeWorld()
  },
  reactor: () => {
    const chunkQuery = useQuery([VoxelComponent])
    useEffect( () => {
      if(chunkQuery.length === 0) return

      const {chunkSize, setVoxel, updateChunkGeometry} = VoxelComponent

      const totalChunks = 4

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
      
    }, [chunkQuery])

    const chunk = useLoadChunk('world', '0,0,0')

    useEffect(() => {
      const {chunkSize, setVoxel } = VoxelComponent
      console.log(chunk.value)
      if(!chunk.value) return
      let i = 0
      for (let x = 0; x < chunkSize; x++) {
        for (let y = 0; y < chunkSize; y++) {
          for (let z = 0; z < chunkSize; z++) {
            setVoxel(z, x, y, chunk.value[i])
            i++
          }
        }
      }
    }, [chunk])

    return null
  }
})