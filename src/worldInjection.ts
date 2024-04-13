import { isClient } from "@etherealengine/common/src/utils/getEnvironment"

import { VoxelComponent } from "./components/VoxelChunkComponent"
import { VoxelChunkNodeEditor } from "./components/VoxelChunkNodeEditor"

if(isClient) {
  import('../engine/RegisterVoxelPrefab')
  import('../src/systems/VoxelChunkSystem')
}
