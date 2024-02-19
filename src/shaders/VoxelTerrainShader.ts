export const vertexShader = `
  varying vec3 vNormal;
  varying vec3 vUv; 

  void main() {
    vUv = vec3(uv, 1.0);
    vNormal = normal.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const fragmentShader = `
  varying vec3 vNormal;
  varying vec3 vUv; 

  vec3 lightPosition = vec3(0.5, 1.0, 0.5); // Light position in world space
  vec3 lightColor = vec3(1.0, 1.0, 1.0); // White light

  vec3 colors[3] = vec3[3](vec3(0.2, 0.15, 0.1), vec3(0.4, 0.95, 0.1), vec3(0.25, 0.25, 0.25));

  void main() {
    vec3 lightDirection = normalize(lightPosition);
    float lambertian = max(dot(vNormal, lightDirection), 0.0);
    lambertian = 0.5 + lambertian * 0.5; // Add ambient light
    vec3 color = lambertian * lightColor; // Apply light color
    int index = int(vUv.x);
    //multiply color by colors[index] to get the final color
    color *= colors[index];

    gl_FragColor = vec4(color, 1.0);
  }
`