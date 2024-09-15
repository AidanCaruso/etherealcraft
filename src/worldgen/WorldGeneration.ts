import { createEntity, defineQuery, getComponent, setComponent } from '@ir-engine/ecs'
import { TransformComponent } from '@ir-engine/spatial'
import { NameComponent } from '@ir-engine/spatial/src/common/NameComponent'
import { addObjectToGroup } from '@ir-engine/spatial/src/renderer/components/GroupComponent'
import { VisibleComponent } from '@ir-engine/spatial/src/renderer/components/VisibleComponent'
import { EntityTreeComponent } from '@ir-engine/spatial/src/transform/components/EntityTree'
import {
  BoxGeometry,
  FloatType,
  LinearFilter,
  LinearMipMapLinearFilter,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  Vector3,
  WebGLRenderTarget,
  WebGLRenderer
} from 'three'
import { VoxelChunkComponent } from '../components/VoxelChunkComponent'
import { getState } from '@ir-engine/hyperflux'
import { EngineState } from '@ir-engine/spatial/src/EngineState'
import { RendererComponent } from '@ir-engine/spatial/src/renderer/WebGLRendererSystem'

const rendererQuery = defineQuery([RendererComponent])

export const generateWorldTerrain = (resolution: number) => {
  const shaderMaterial = new ShaderMaterial({
    vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
    fragmentShader: `
    float PI = 3.14159265358979323846;
    float screenWidth = 1024.0;
    varying vec2 vUv;

#define M_PI 3.14159265358979323846

float rand(vec2 co){return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);}
float rand (vec2 co, float l) {return rand(vec2(rand(co), l));}
float rand (vec2 co, float l, float t) {return rand(vec2(rand(co, l), t));}

float perlin(vec2 p, float dim, float time) {
	vec2 pos = floor(p * dim);
	vec2 posx = pos + vec2(1.0, 0.0);
	vec2 posy = pos + vec2(0.0, 1.0);
	vec2 posxy = pos + vec2(1.0);
	
	float c = rand(pos, dim, time);
	float cx = rand(posx, dim, time);
	float cy = rand(posy, dim, time);
	float cxy = rand(posxy, dim, time);
	
	vec2 d = fract(p * dim);
	d = -0.5 * cos(d * M_PI) + 0.5;
	
	float ccx = mix(c, cx, d.x);
	float cycxy = mix(cy, cxy, d.x);
	float center = mix(ccx, cycxy, d.y);
	
	return center * 2.0 - 1.0;
}

// p must be normalized!
float perlin(vec2 p, float dim) {
	
	/*vec2 pos = floor(p * dim);
	vec2 posx = pos + vec2(1.0, 0.0);
	vec2 posy = pos + vec2(0.0, 1.0);
	vec2 posxy = pos + vec2(1.0);
	
	// For exclusively black/white noise
	/*float c = step(rand(pos, dim), 0.5);
	float cx = step(rand(posx, dim), 0.5);
	float cy = step(rand(posy, dim), 0.5);
	float cxy = step(rand(posxy, dim), 0.5);*/
	
	/*float c = rand(pos, dim);
	float cx = rand(posx, dim);
	float cy = rand(posy, dim);
	float cxy = rand(posxy, dim);
	
	vec2 d = fract(p * dim);
	d = -0.5 * cos(d * M_PI) + 0.5;
	
	float ccx = mix(c, cx, d.x);
	float cycxy = mix(cy, cxy, d.x);
	float center = mix(ccx, cycxy, d.y);
	
	return center * 2.0 - 1.0;*/
	return perlin(p, dim, 0.0);
}

    void main() {
      float noise = perlin(vUv*2.0, 5.0);
      gl_FragColor = vec4(noise, 0.0, 0.0, 1.0);
    }
  `
  })

  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 1;
  
  const geometry = new PlaneGeometry(2, 2);

  const quad = new Mesh(geometry, shaderMaterial);
  
  const renderer = getComponent(rendererQuery()[0], RendererComponent).renderer!
  
  const renderTarget = new WebGLRenderTarget(resolution, resolution, {
		type: FloatType,
		minFilter: LinearMipMapLinearFilter,
		magFilter: LinearFilter,
		generateMipmaps: false,
  })

  renderer.setRenderTarget(renderTarget)
  renderer.clear()

  renderer.render(quad, camera)

  const pixels = new Float32Array(resolution*resolution*4)
  renderer.readRenderTargetPixels(renderTarget, 0, 0, resolution, resolution, pixels)
  renderer.setRenderTarget(null)
  
  //Debug visualization
  // const chunkQuery = defineQuery([VoxelChunkComponent])
  // const entity = createEntity()
  // setComponent(entity, NameComponent, 'Shader Render')
  // setComponent(entity, TransformComponent, { position: new Vector3(0, 5, 0) })
  // setComponent(entity, VisibleComponent)
  // setComponent(entity, EntityTreeComponent, { parentEntity: chunkQuery()[0] })
  // addObjectToGroup(entity, new Mesh(new PlaneGeometry(10, 10), new MeshBasicMaterial({ map: renderTarget.texture })))
  quad.remove()
  camera.remove()
  shaderMaterial.dispose()
  renderTarget.dispose()
  console.log('generating terrain')
  return pixels
}
