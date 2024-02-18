import { defineQuery, defineSystem, getComponent, PresentationSystemGroup, SimulationSystemGroup } from "@etherealengine/ecs"
import {useEffect} from 'react'
import { VoxelComponent } from "../components/VoxelChunkComponent"
import { BufferGeometry, BufferAttribute, Mesh, MeshStandardMaterial } from "three"
import { addObjectToGroup } from "@etherealengine/spatial/src/renderer/components/GroupComponent"

const ChunkQuery = defineQuery([VoxelComponent])
export default defineSystem({
  uuid: 'VoxelChunkSystem',
  insert: { after: SimulationSystemGroup },
  execute: () => {

  },

  reactor: () => {
    useEffect( () => {
      const entity = ChunkQuery()[0]

      const {chunkSize, cells, tileSize, tileTextureSize, setVoxel, updateChunkGeometry} = VoxelComponent

      const totalChunks = 4

      for (let x = 0; x < chunkSize*totalChunks; x++) {
        for (let y = 0; y < chunkSize*totalChunks; y++) {
          for (let z = 0; z < chunkSize*totalChunks; z++) {
            const height = (Math.sin(x / chunkSize * Math.PI * 2) + Math.sin(z / chunkSize * Math.PI * 3)) * (chunkSize / 6) + (chunkSize / 2);
            if (y < height) {
              setVoxel(x, y, z, true);
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
    }, [])
    return null
  }
})