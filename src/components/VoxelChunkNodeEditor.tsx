import React, { useState } from 'react'
import ExtensionIcon from '@mui/icons-material/Extension'
import { EditorComponentType, commitProperty, updateProperty } from '@ir-engine/editor/src/components/properties/Util'
import NodeEditor from '@ir-engine/ui/src/components/editor/properties/nodeEditor'

export const VoxelChunkNodeEditor: EditorComponentType = (props) => {
  return <NodeEditor description={'Voxel World'} {...props}>
</NodeEditor>
}

VoxelChunkNodeEditor.iconComponent = ExtensionIcon
