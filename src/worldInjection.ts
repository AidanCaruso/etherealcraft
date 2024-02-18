import { isClient } from "@etherealengine/common/src/utils/getEnvironment"
import { ComponentShelfCategories } from "@etherealengine/editor/src/components/element/ElementList"
import { EntityNodeEditor } from "@etherealengine/editor/src/functions/ComponentEditors"
import { getState } from "@etherealengine/hyperflux"
import { EngineState } from "@etherealengine/spatial/src/EngineState"
import { VoxelComponent } from "./components/VoxelChunkComponent"
import { VoxelChunkNodeEditor } from "./components/VoxelChunkNodeEditor"

export default async function worldInjection() {
  if (isClient) {
    EntityNodeEditor.set(VoxelComponent, VoxelChunkNodeEditor)
    ComponentShelfCategories.Misc.push(VoxelComponent)
  }
}