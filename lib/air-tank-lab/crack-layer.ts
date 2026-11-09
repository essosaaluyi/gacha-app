import * as THREE from "three";
import { createCrackSegments, glassPoint, type CrackState } from "./cracks";

export function createCrackLayer(root: THREE.Group) {
  const positions: number[] = [], born: number[] = [], sides: number[] = [];
  for (const segment of createCrackSegments()) {
    const du = segment.u2 - segment.u1, dy = segment.y2 - segment.y1;
    const length = Math.hypot(du, dy) || 1;
    const uOffset = -dy / length * segment.width, yOffset = du / length * segment.width;
    const corners = [glassPoint(segment.u1 - uOffset, segment.y1 - yOffset), glassPoint(segment.u1 + uOffset, segment.y1 + yOffset),
      glassPoint(segment.u2 - uOffset, segment.y2 - yOffset), glassPoint(segment.u2 + uOffset, segment.y2 + yOffset)];
    for (const index of [0, 2, 1, 1, 2, 3]) {
      positions.push(...corners[index]); born.push(index < 2 ? segment.born : segment.end); sides.push(index % 2 ? 1 : -1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("aBorn", new THREE.Float32BufferAttribute(born, 1));
  geometry.setAttribute("aSide", new THREE.Float32BufferAttribute(sides, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: { uAge: { value: 0 } }, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: `attribute float aBorn; attribute float aSide; varying float vBorn; varying float vSide;
      void main(){vBorn=aBorn;vSide=aSide;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `uniform float uAge; varying float vBorn; varying float vSide;
      void main(){float age=uAge-vBorn;if(age<0.0)discard;
        float core=1.0-smoothstep(0.12,0.65,abs(vSide));float flash=exp(-age*8.0);
        vec3 color=mix(vec3(0.025,0.065,0.085),vec3(0.48,0.7,0.8)+flash*0.5,core);
        float alpha=(0.62+flash*0.2)*(1.0-smoothstep(0.82,1.0,abs(vSide)));
        gl_FragColor=vec4(color,alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geometry, material); mesh.renderOrder = 12; mesh.visible = false; root.add(mesh);
  return {
    update(state: CrackState) { mesh.visible = state.phase !== "clean"; material.uniforms.uAge.value = state.age; },
    dispose() { root.remove(mesh); geometry.dispose(); material.dispose(); },
  };
}
