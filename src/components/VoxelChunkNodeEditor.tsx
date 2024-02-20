import React, { useState } from 'react'
import ExtensionIcon from '@mui/icons-material/Extension'
import NodeEditor from '@etherealengine/editor/src/components/properties/NodeEditor'
import { EditorComponentType, commitProperty, updateProperty } from '@etherealengine/editor/src/components/properties/Util'
import ColorInput from '@etherealengine/editor/src/components/inputs/ColorInput'
import InputGroup from '@etherealengine/editor/src/components/inputs/InputGroup'
import NumericInput from '@etherealengine/editor/src/components/inputs/NumericInput'
import Vector3Input from '@etherealengine/editor/src/components/inputs/Vector3Input'
import { Color, Vector3 } from 'three'

export const VoxelChunkNodeEditor: EditorComponentType = (props) => {
  return <NodeEditor description={'Description'} {...props}>
  <InputGroup name="Color" label="Bubble Color">
    <ColorInput
      value= {new Color()}
    />
  </InputGroup>
</NodeEditor>
}

VoxelChunkNodeEditor.iconComponent = ExtensionIcon
