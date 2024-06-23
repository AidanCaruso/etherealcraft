import React, { useState } from 'react'
import ExtensionIcon from '@mui/icons-material/Extension'
import NodeEditor from '@etherealengine/editor/src/components/properties/NodeEditor'
import { EditorComponentType, commitProperty, updateProperty } from '@etherealengine/editor/src/components/properties/Util'

export const VoxelChunkNodeEditor: EditorComponentType = (props) => {
  return <NodeEditor description={'Voxel World'} {...props}>
</NodeEditor>
}

VoxelChunkNodeEditor.iconComponent = ExtensionIcon
