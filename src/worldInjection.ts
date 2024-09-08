
import { isClient } from "@ir-engine/hyperflux"
import { VoxelComponent } from "./components/VoxelChunkComponent"
import { VoxelChunkNodeEditor } from "./components/VoxelChunkNodeEditor"

import('./systems/VoxelChunkSystem')
import('./components/VoxelChunkComponent')
if(isClient) {
  import('../engine/RegisterVoxelPrefab')
  import('./systems/VoxelInputSystem')
}
