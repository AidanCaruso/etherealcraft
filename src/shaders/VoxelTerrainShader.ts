export const vertexShader = `
    varying vec3 vUv; 

    void main() {
      vUv = vec3(uv,1);
      vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * modelViewPosition; 
    }
  `

export const fragmentShader = `
    varying vec3 vUv; 
    in vec2 uv;

    void main() {
      gl_FragColor = vec4(vUv * 0.5, 1.0); 
    }
  `