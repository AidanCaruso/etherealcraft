import { isClient } from "@ir-engine/common/src/utils/getEnvironment"

import { VoxelComponent } from "./components/VoxelChunkComponent"
import { VoxelChunkNodeEditor } from "./components/VoxelChunkNodeEditor"

import VoxelChunkSystem from "./systems/VoxelChunkSystem"
if(isClient) {
  import('../engine/RegisterVoxelPrefab')
  import('./components/VoxelChunkComponent')
  import('./systems/VoxelInputSystem')
}
