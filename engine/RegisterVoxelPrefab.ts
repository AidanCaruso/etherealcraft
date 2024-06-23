import { ComponentEditorsState } from '@etherealengine/editor/src/services/ComponentEditors'
import { ComponentShelfCategoriesState } from '@etherealengine/editor/src/services/ComponentShelfCategoriesState'
import { getMutableState } from '@etherealengine/hyperflux'
import { VoxelComponent } from '../src/components/VoxelChunkComponent'
import { VoxelChunkNodeEditor } from '../src/components/VoxelChunkNodeEditor'

getMutableState(ComponentEditorsState).merge({
  [VoxelComponent.name]: VoxelChunkNodeEditor
})

getMutableState(ComponentShelfCategoriesState).Misc.merge([VoxelComponent])
