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
    vec3 colors[3] = vec3[3](vec3(0.2, 0.15, 0.1), vec3(0.4, 0.95, 0.1), vec3(0.25, 0.25, 0.25));
    void main() {
      int index = int(vUv.x);
      gl_FragColor = vec4(colors[index], 1.0); 
    }
  ` 