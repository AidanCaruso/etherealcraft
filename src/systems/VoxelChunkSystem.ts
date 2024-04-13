import { defineQuery, defineSystem, getComponent, PresentationSystemGroup, SimulationSystemGroup, useQuery } from "@etherealengine/ecs"
import {useEffect} from 'react'
import { VoxelComponent } from "../components/VoxelChunkComponent"
import { BufferGeometry, BufferAttribute, Mesh, MeshStandardMaterial } from "three"
import { addObjectToGroup } from "@etherealengine/spatial/src/renderer/components/GroupComponent"

export default defineSystem({
  uuid: 'VoxelChunkSystem',
  insert: { after: SimulationSystemGroup },
  execute: () => {

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