import { ComponentShelfCategoriesState } from '@etherealengine/editor/src/components/element/ElementList'
import { ComponentEditorsState } from '@etherealengine/editor/src/functions/ComponentEditors'

import { getMutableState } from '@etherealengine/hyperflux'
import { VoxelComponent } from '../src/components/VoxelChunkComponent'
import { VoxelChunkNodeEditor } from '../src/components/VoxelChunkNodeEditor'

getMutableState(ComponentEditorsState).merge({ [VoxelComponent.name]: VoxelChunkNodeEditor })
getMutableState(ComponentShelfCategoriesState).Misc.merge([VoxelComponent])
