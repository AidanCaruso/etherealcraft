import { defineSystem, EntityUUID, SimulationSystemGroup, useQuery } from "@etherealengine/ecs"
import {useEffect} from 'react'
import { matchesVector, Vector, VoxelComponent } from "../components/VoxelChunkComponent"
import { defineAction, defineState, getMutableState, matches, none, useHookstate } from "@etherealengine/hyperflux"
import { NetworkTopics } from "@etherealengine/network"

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

export default defineSystem({
  uuid: 'VoxelChunkSystem',
  insert: { after: SimulationSystemGroup },

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
            const height = (Math.sin(x / chunkSize * Math.PI * 2) + Math.sin(z / chunkSize * Math.PI * 3)) * (chunkSize / 6) + (chunkSize / 2);
            if (y < height) {
              setVoxel(x, y, z, y < height - 1 ? 1 : 2)
            }
          }
        }
      }

      for(let x = 0; x < totalChunks; x++) {
        for(let y = 0; y < totalChunks; y++) {
          for(let z = 0; z < totalChunks; z++) {
            updateChunkGeometry(x*chunkSize, y*chunkSize, z*chunkSize)
          }
        }
      }
    }, [chunkQuery])

    return null
  }
})