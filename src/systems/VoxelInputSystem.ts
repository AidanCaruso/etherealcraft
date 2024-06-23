import { Engine, getComponent, Entity, hasComponent, InputSystemGroup, defineSystem } from "@etherealengine/ecs"
import { AvatarComponent } from "@etherealengine/engine/src/avatar/components/AvatarComponent"
import { getState, getMutableState, dispatchAction } from "@etherealengine/hyperflux"
import { NetworkObjectComponent } from "@etherealengine/network"
import { CameraComponent } from "@etherealengine/spatial/src/camera/components/CameraComponent"
import { NameComponent } from "@etherealengine/spatial/src/common/NameComponent"
import { InputPointerComponent } from "@etherealengine/spatial/src/input/components/InputPointerComponent"
import { InputSourceComponent } from "@etherealengine/spatial/src/input/components/InputSourceComponent"
import { RaycastArgs, Physics } from "@etherealengine/spatial/src/physics/classes/Physics"
import { CollisionGroups } from "@etherealengine/spatial/src/physics/enums/CollisionGroups"
import { getInteractionGroups } from "@etherealengine/spatial/src/physics/functions/getInteractionGroups"
import { PhysicsState } from "@etherealengine/spatial/src/physics/state/PhysicsState"
import { SceneQueryType } from "@etherealengine/spatial/src/physics/types/PhysicsTypes"
import { Vector3 } from "three"
import { VoxelComponent, axes } from "../components/VoxelChunkComponent"
import { VoxelActions } from "./VoxelChunkSystem"
import { InputComponent } from "@etherealengine/spatial/src/input/components/InputComponent"

const interactionGroups = getInteractionGroups(CollisionGroups.Default, CollisionGroups.Ground)
const raycastComponentData = {
  type: SceneQueryType.Closest,
  origin: new Vector3(),
  direction: new Vector3(),
  maxDistance: 20,
  groups: interactionGroups
} as RaycastArgs

const clickVoxel = (newVoxelId: number) => {
  const { physicsWorld } = getState(PhysicsState)
  const inputPointerEntity = InputPointerComponent.getPointerForCanvas(Engine.instance.viewerEntity)
  if (!inputPointerEntity) return
  const pointerPosition = getComponent(inputPointerEntity, InputPointerComponent).position
  const hits = Physics.castRayFromCamera(
    getComponent(Engine.instance.viewerEntity, CameraComponent),
    pointerPosition,
    physicsWorld,
    raycastComponentData
  )
  if (hits.length) {
    const hit = hits[0]
    const hitEntity = (hit.body?.userData as any)?.entity as Entity
    if (hitEntity){
      /**@todo need less brittle chunk detection */
      if(getComponent(hitEntity, NameComponent) != 'Voxel Chunk') return
      const point = hit.position
      for(const i of axes){
        point[i] += hit.normal[i]*(newVoxelId > 0 ? 0.5 : -0.5)
      }
      dispatchAction(VoxelActions.setVoxel({position: point, id: newVoxelId}))
    }
  }
}

const execute = () => {
  const buttons = InputComponent.getMergedButtons(Engine.instance.viewerEntity)
  if (buttons.PrimaryClick?.down) clickVoxel(0)
  if (buttons.SecondaryClick?.down) clickVoxel(1)
}

export const VoxelInputSystem = defineSystem({
  uuid: 'VoxelInputSystem',
  insert: { with: InputSystemGroup },
  execute
})