import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { cn } from "@/lib/cn";
import { prefersReducedMotion } from "@/lib/gsap";

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main(){
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uMouse;
  uniform vec2 uRes;

  vec3 mod289(vec3 x){return x - floor(x*(1.0/289.0))*289.0;}
  vec2 mod289(vec2 x){return x - floor(x*(1.0/289.0))*289.0;}
  vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}
  float snoise(vec2 v){
    const vec4 C = vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);
    vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m; m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }
  float fbm(vec2 p){
    float v=0.0; float a=0.5;
    for(int i=0;i<5;i++){ v += a*snoise(p); p*=2.02; a*=0.5; }
    return v;
  }

  void main(){
    vec2 uv = vUv;
    vec2 p = uv;
    p.x *= uRes.x / uRes.y;
    float t = uTime * 0.045;

    // domain warp
    vec2 q = vec2(fbm(p*1.4 + vec2(0.0,t)), fbm(p*1.4 + vec2(5.2,-t)));
    float n = fbm(p*1.8 + q*1.1 + uMouse*0.25);
    float n2 = fbm(p*3.2 - q*0.6 + t*0.5);

    vec3 white = vec3(0.980,0.980,0.980);
    vec3 mist  = vec3(0.905,0.935,1.0);
    vec3 sky   = vec3(0.357,0.608,1.0);
    vec3 blue  = vec3(0.0,0.278,1.0);

    vec3 col = white;
    col = mix(col, mist, smoothstep(0.05,0.75,n));
    col = mix(col, sky,  smoothstep(0.45,1.05,n2) * 0.55);

    // blue bloom drifting toward the top
    float top = smoothstep(0.95,0.15,uv.y);
    float bloom = smoothstep(0.45,1.0,n) * top;
    col = mix(col, blue, bloom * 0.16);

    // gentle vignette to keep edges calm and bright center
    float vig = smoothstep(1.25,0.2,distance(uv, vec2(0.5,0.42)));
    col = mix(white, col, 0.35 + 0.65*vig);

    gl_FragColor = vec4(col, 1.0);
  }
`;

function GradientPlane({ interactive }: { interactive: boolean }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const { viewport, size } = useThree();
  const mouse = useRef(new THREE.Vector2(0, 0));
  const target = useRef(new THREE.Vector2(0, 0));

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uRes: { value: new THREE.Vector2(1, 1) },
    }),
    []
  );

  useFrame((state, delta) => {
    if (!mat.current) return;
    mat.current.uniforms.uTime.value += delta;
    mat.current.uniforms.uRes.value.set(size.width, size.height);
    if (interactive) {
      target.current.set(state.pointer.x, state.pointer.y);
      mouse.current.lerp(target.current, 0.04);
      mat.current.uniforms.uMouse.value.copy(mouse.current);
    }
  });

  return (
    <mesh scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={mat}
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
      />
    </mesh>
  );
}

export function GradientCanvas({ className }: { className?: string }) {
  const reduced = prefersReducedMotion();
  return (
    <div className={cn("pointer-events-none absolute inset-0 -z-10", className)} aria-hidden>
      <Canvas
        gl={{ antialias: false, alpha: false }}
        dpr={[1, 1.5]}
        frameloop={reduced ? "demand" : "always"}
        camera={{ position: [0, 0, 1], fov: 50 }}
      >
        <GradientPlane interactive={!reduced} />
      </Canvas>
    </div>
  );
}
