import * as THREE from "three";
import { windVelocity, vortexVelocity, type MotionDrive, type Preset } from "@/lib/air-tank-lab/motion";

const COUNT = 180, TAIL = 8, WAVES = 3, SAMPLES = 112;
export function createWindLayer(root: THREE.Group) {
  const group = new THREE.Group(); root.add(group);
  const positions = new Float32Array(COUNT * 3), histories = new Float32Array(COUNT * TAIL * 3);
  const linePositions = new Float32Array(COUNT * (TAIL - 1) * 6);
  const alpha = new Float32Array(COUNT * (TAIL - 1) * 2);
  for (let i = 0; i < COUNT; i++) for (let k = 0; k < TAIL - 1; k++) {
    const offset = (i * (TAIL - 1) + k) * 2;
    alpha[offset] = (1 - k / TAIL) ** 2 * 0.38; alpha[offset + 1] = (1 - (k + 1) / TAIL) ** 2 * 0.38;
  }
  const vertex = `attribute float aAlpha; varying float vAlpha; void main(){vAlpha=aAlpha;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute("position", new THREE.BufferAttribute(linePositions, 3).setUsage(THREE.DynamicDrawUsage));
  lineGeometry.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1));
  const lineMaterial = new THREE.ShaderMaterial({ uniforms: { uColor: { value: new THREE.Color("#a6d9ea") } }, vertexShader: vertex,
    fragmentShader: `uniform vec3 uColor; varying float vAlpha; void main(){gl_FragColor=vec4(uColor,vAlpha);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const lines = new THREE.LineSegments(lineGeometry, lineMaterial); lines.frustumCulled = false; lines.renderOrder = 4; group.add(lines);
  const pointGeometry = new THREE.BufferGeometry(); pointGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  const pointMaterial = new THREE.ShaderMaterial({ uniforms: { uColor: { value: new THREE.Color("#c5e8f0") }, uRatio: { value: 1 } },
    vertexShader: `uniform float uRatio;void main(){vec4 p=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*p;gl_PointSize=clamp(22.0*uRatio/-p.z,1.0,4.0);}`,
    fragmentShader: `uniform vec3 uColor;void main(){float r=length(gl_PointCoord-0.5);if(r>0.5)discard;gl_FragColor=vec4(uColor,(1.0-smoothstep(0.08,0.5,r))*0.65);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const points = new THREE.Points(pointGeometry, pointMaterial); points.frustumCulled = false; points.renderOrder = 4; group.add(points);
  const wavePositions = new Float32Array(WAVES * SAMPLES * 6 * 3), waveUvs = new Float32Array(WAVES * SAMPLES * 6 * 2);
  for (let w = 0; w < WAVES; w++) for (let s = 0; s < SAMPLES; s++) for (let v = 0; v < 6; v++) {
    const index = (w * SAMPLES + s) * 6 + v;
    const end = [0, 1, 0, 0, 1, 1][v], side = [-1, -1, 1, 1, -1, 1][v];
    waveUvs[index * 2] = (s + end) / SAMPLES; waveUvs[index * 2 + 1] = side;
  }
  const waveGeometry = new THREE.BufferGeometry(); waveGeometry.setAttribute("position", new THREE.BufferAttribute(wavePositions, 3).setUsage(THREE.DynamicDrawUsage)); waveGeometry.setAttribute("uv", new THREE.BufferAttribute(waveUvs, 2));
  const waveMaterial = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color("#c9e3ef") } },
    vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `uniform float uTime;uniform vec3 uColor;varying vec2 vUv;
      void main(){float cycle=fract(vUv.x*2.8-uTime*0.55);float pulse=exp(-cycle*6.5);
        float halo=exp(-vUv.y*vUv.y*5.0);float core=1.0-smoothstep(0.04,0.23,abs(vUv.y));
        float ends=smoothstep(0.0,0.06,vUv.x)*(1.0-smoothstep(0.94,1.0,vUv.x));
        gl_FragColor=vec4(uColor,ends*(halo*(0.07+0.27*pulse)+core*(0.08+0.5*pulse)));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const waves = new THREE.Mesh(waveGeometry, waveMaterial); waves.frustumCulled = false; waves.renderOrder = 3; group.add(waves);
  const velocity = [0, 0, 0];
  let clock = 0, priorTime = 0, remainder = 0, swirlPhase = 0, pulsePhase = 0;
  const spawn = (i: number, epoch = 0) => {
    const phase = i * 2.39996 + epoch * 0.7, radius = 0.3 + ((i * 0.618034 + epoch * 0.23) % 1) * 1.45;
    const x = Math.cos(phase) * radius, y = -2.38 + ((i * 0.381966 + epoch * 0.17) % 1) * 4.76, z = Math.sin(phase) * radius;
    positions.set([x, y, z], i * 3);
    for (let k = 0; k < TAIL; k++) histories.set([x, y, z], (i * TAIL + k) * 3);
  };
  const reset = () => { clock = 0; priorTime = 0; remainder = 0; swirlPhase = 0; pulsePhase = 0; for (let i = 0; i < COUNT; i++) spawn(i); };
  reset();
  return {
    reset,
    update(time: number, preset: Preset, light: boolean, ratio: number, drive?: MotionDrive) {
      remainder += Math.max(0, Math.min(0.2, time - priorTime)); priorTime = time;
      const strength = preset === "normal" ? 1 : preset === "fast" ? 1.6 : 1.95;
      const count = light ? 90 : COUNT;
      const dt = 1 / 60;
      while (remainder + 1e-10 >= dt) {
        remainder -= dt; clock += dt;
        swirlPhase += dt * (drive ? 2.8 : 0.32); pulsePhase += dt * (drive ? 2.5 : 1);
        for (let i = 0; i < COUNT; i++) {
          const j = i * 3;
          if (drive) vortexVelocity(positions[j], positions[j + 1], positions[j + 2], clock, i * 0.71, { radius: 1.89, height: 2.4 }, drive, velocity);
          else windVelocity(positions[j], positions[j + 1], positions[j + 2], clock, i * 0.71, strength, velocity);
          const scale = Math.min(1, (drive?.maxSpeed ?? 3.6) / Math.max(0.001, Math.hypot(...velocity)));
          positions[j] += velocity[0] * dt * scale; positions[j + 1] += velocity[1] * dt * scale; positions[j + 2] += velocity[2] * dt * scale;
          if (Math.hypot(positions[j], positions[j + 2]) > 1.89 || Math.abs(positions[j + 1]) > 2.4) spawn(i, Math.floor(clock * 3));
          for (let k = TAIL - 1; k > 0; k--) for (let axis = 0; axis < 3; axis++) histories[(i * TAIL + k) * 3 + axis] = histories[(i * TAIL + k - 1) * 3 + axis];
          histories.set(positions.subarray(j, j + 3), i * TAIL * 3);
        }
      }
      for (let i = 0; i < count; i++) {
        for (let k = 0; k < TAIL - 1; k++) for (let axis = 0; axis < 3; axis++) {
          const offset = (i * (TAIL - 1) + k) * 6;
          linePositions[offset + axis] = histories[(i * TAIL + k) * 3 + axis]; linePositions[offset + 3 + axis] = histories[(i * TAIL + k + 1) * 3 + axis];
        }
      }
      pointGeometry.setDrawRange(0, count); lineGeometry.setDrawRange(0, count * (TAIL - 1) * 2);
      pointGeometry.attributes.position.needsUpdate = true; lineGeometry.attributes.position.needsUpdate = true;
      pointMaterial.uniforms.uRatio.value = ratio;
      for (let w = 0; w < WAVES; w++) for (let s = 0; s < SAMPLES; s++) for (let v = 0; v < 6; v++) {
        const index = (w * SAMPLES + s) * 6 + v, u = waveUvs[index * 2], side = waveUvs[index * 2 + 1];
        const angle = u * Math.PI * 5.1 + w * Math.PI * 2 / 3 + swirlPhase;
        const radius = 1.53 + Math.sin(u * Math.PI * 3 + clock * 0.75 + w) * 0.18;
        wavePositions[index * 3] = Math.cos(angle) * radius;
        wavePositions[index * 3 + 1] = -2.34 + u * 4.68 + side * 0.09;
        wavePositions[index * 3 + 2] = Math.sin(angle) * radius;
      }
      waveGeometry.attributes.position.needsUpdate = true; waveMaterial.uniforms.uTime.value = pulsePhase;
      const hot = preset === "hot";
      lineMaterial.uniforms.uColor.value.set(hot ? "#f8c27d" : "#a6d9ea"); pointMaterial.uniforms.uColor.value.set(hot ? "#ffe0a1" : "#c5e8f0"); waveMaterial.uniforms.uColor.value.set(hot ? "#ffcf98" : "#c9e3ef");
    },
    dispose() { root.remove(group); [lineGeometry, pointGeometry, waveGeometry].forEach(g => g.dispose()); [lineMaterial, pointMaterial, waveMaterial].forEach(m => m.dispose()); },
  };
}
