import { EditorComponentType } from '@ir-engine/editor/src/components/properties/Util'
import NodeEditor from '@ir-engine/editor/src/panels/properties/common/NodeEditor'
import ExtensionIcon from '@mui/icons-material/Extension'
import React from 'react'

export const VoxelChunkNodeEditor: EditorComponentType = (props) => {
  return <NodeEditor description={'Voxel World'} {...props}></NodeEditor>
}

VoxelChunkNodeEditor.iconComponent = ExtensionIcon
