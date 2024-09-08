import { ComponentEditorsState } from '@ir-engine/editor/src/services/ComponentEditors'
import { ComponentShelfCategoriesState } from '@ir-engine/editor/src/services/ComponentShelfCategoriesState'
import { getMutableState } from '@ir-engine/hyperflux'
import { VoxelComponent } from '../src/components/VoxelChunkComponent'
import { VoxelChunkNodeEditor } from '../src/components/VoxelChunkNodeEditor'

getMutableState(ComponentEditorsState).merge({
  [VoxelComponent.name]: VoxelChunkNodeEditor
})

getMutableState(ComponentShelfCategoriesState).Misc.merge([VoxelComponent])
