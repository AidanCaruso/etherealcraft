import { Engine, getComponent, Entity, hasComponent, InputSystemGroup, defineSystem } from "@ir-engine/ecs"
import { AvatarComponent } from "@ir-engine/engine/src/avatar/components/AvatarComponent"
import { getState, getMutableState, dispatchAction } from "@ir-engine/hyperflux"
import { NetworkObjectComponent } from "@ir-engine/network"
import { CameraComponent } from "@ir-engine/spatial/src/camera/components/CameraComponent"
import { NameComponent } from "@ir-engine/spatial/src/common/NameComponent"
import { InputPointerComponent } from "@ir-engine/spatial/src/input/components/InputPointerComponent"
import { InputSourceComponent } from "@ir-engine/spatial/src/input/components/InputSourceComponent"
import { RaycastArgs, Physics } from "@ir-engine/spatial/src/physics/classes/Physics"
import { CollisionGroups } from "@ir-engine/spatial/src/physics/enums/CollisionGroups"
import { getInteractionGroups } from "@ir-engine/spatial/src/physics/functions/getInteractionGroups"
import { SceneQueryType } from "@ir-engine/spatial/src/physics/types/PhysicsTypes"
import { Vector3 } from "three"
import { VoxelComponent, axes } from "../components/VoxelChunkComponent"
import { VoxelActions } from "./VoxelChunkSystem"
import { InputComponent } from "@ir-engine/spatial/src/input/components/InputComponent"
import { EngineState } from "@ir-engine/spatial/src/EngineState"

const interactionGroups = getInteractionGroups(CollisionGroups.Default, CollisionGroups.Ground)
const raycastComponentData = {
  type: SceneQueryType.Closest,
  origin: new Vector3(),
  direction: new Vector3(),
  maxDistance: 20,
  groups: interactionGroups
} as RaycastArgs

const clickVoxel = (newVoxelId: number) => {
  const physicsWorld = Physics.getWorld(AvatarComponent.getSelfAvatarEntity())
  if(!physicsWorld) return
  const inputPointerEntity = InputPointerComponent.getPointersForCamera(getState(EngineState).viewerEntity)
  if (!inputPointerEntity) return
  const pointerPosition = getComponent(inputPointerEntity[0], InputPointerComponent).position
  const hits = Physics.castRayFromCamera(
    physicsWorld,
    getComponent(getState(EngineState).viewerEntity, CameraComponent),
    pointerPosition,
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
  const buttons = InputComponent.getMergedButtons(getState(EngineState).viewerEntity)
  if (buttons.PrimaryClick?.down) clickVoxel(0)
  if (buttons.SecondaryClick?.down) clickVoxel(1)
}

export const VoxelInputSystem = defineSystem({
  uuid: 'VoxelInputSystem',
  insert: { with: InputSystemGroup },
  execute
})