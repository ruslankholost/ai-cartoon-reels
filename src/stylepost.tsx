import { useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export type Look = "ink" | "clay" | "verse";
const SS = 1.5; // internal render scale, the post shader samples it down to 1080x1920

const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;

const FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tColor, tNorm, tDepth;
uniform vec2 uOut;
uniform float uNear, uFar, uJit, uLook, uFocus;
varying vec2 vUv;

float hash21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(hash21(i), hash21(i+vec2(1,0)), f.x), mix(hash21(i+vec2(0,1)), hash21(i+vec2(1,1)), f.x), f.y); }
float lin(float d){ return 2.*uNear*uFar / (uFar + uNear - (d*2.-1.)*(uFar-uNear)); }
float dep(vec2 uv){ return lin(texture2D(tDepth, uv).x); }
vec3 nor(vec2 uv){ return texture2D(tNorm, uv).xyz*2.-1.; }
float luma(vec3 c){ return dot(c, vec3(.2126,.7152,.0722)); }
// hand-drawn wobble: smooth noise displacement that re-rolls every few frames (uJit)
vec2 wob(vec2 uv, float amp, float scale){
  vec2 q = uv*uOut/scale + uJit*vec2(17.3, 9.1);
  return (vec2(vn(q), vn(q+vec2(41.7,13.3))) - .5) * 2. * amp / uOut;
}
// Sobel on linear depth (relative to distance) and on view normals
float edge(vec2 uv, float px, float dT, float nT){
  vec2 e = px / uOut;
  float d[9]; vec3 n[9]; int k = 0;
  for (int j=-1;j<=1;j++) for (int i=-1;i<=1;i++){ vec2 q = uv + vec2(float(i),float(j))*e; d[k]=dep(q); n[k]=nor(q); k++; }
  float gx = (d[2]+2.*d[5]+d[8]) - (d[0]+2.*d[3]+d[6]);
  float gy = (d[6]+2.*d[7]+d[8]) - (d[0]+2.*d[1]+d[2]);
  float de = length(vec2(gx,gy)) / d[4];
  vec3 nx = (n[2]+2.*n[5]+n[8]) - (n[0]+2.*n[3]+n[6]);
  vec3 ny = (n[6]+2.*n[7]+n[8]) - (n[0]+2.*n[1]+n[2]);
  float ne = length(nx) + length(ny);
  return max(smoothstep(dT, dT*2.2, de), smoothstep(nT, nT*1.8, ne));
}
float stripe(vec2 p, vec2 dir, float period, float thick){
  float t = dot(p, normalize(dir)) / period;
  float f = abs(fract(t) - .5) * period;
  return 1. - smoothstep(thick*.5, thick*.5 + .9, f);
}
vec2 rot(vec2 p, float a){ float c = cos(a), s = sin(a); return vec2(c*p.x - s*p.y, s*p.x + c*p.y); }

void main(){
  vec2 uv = vUv;
  vec3 col;
  if (uLook < .5) {
    // ---- INK: flat colour, wobbly Sobel outline, crosshatch by luma ----
    vec2 w = wob(uv, 2.0, 41.);
    col = texture2D(tColor, uv + w).rgb;
    float ed = edge(uv + wob(uv, 2.0, 27.), 2.5, .035, .8);
    float L = pow(luma(col), 1./2.2);
    vec2 p = uv*uOut + wob(uv, 1.0, 17.)*uOut;
    float h1 = stripe(p, vec2(1.,1.), 6.5, 1.5) * smoothstep(.42, .34, L);
    float h2 = stripe(p, vec2(1.,-1.), 6.5, 1.4) * smoothstep(.27, .2, L);
    float h3 = stripe(p, vec2(1.,0.), 5.0, 1.3) * smoothstep(.14, .08, L);
    // light term from the normal buffer: hatch also on the side turned away from the key light
    float nl = dot(nor(uv), normalize(vec3(-.45, .55, .7)));
    h1 = max(h1, stripe(p, vec2(1.,1.), 6.5, 1.5) * smoothstep(.30, .12, nl));
    h2 = max(h2, stripe(p, vec2(1.,-1.), 6.5, 1.4) * smoothstep(-.1, -.4, nl));
    float hatch = max(h1, max(h2, h3));
    vec3 ink = vec3(.05, .03, .06);
    col = mix(col, mix(col*.45, ink, .85), hatch*.95);
    col *= mix(vec3(.82,.82,1.0), vec3(1.), smoothstep(.1,.5,L));
    // Moebius-ish colour: slightly desaturated, warm paper
    float g = luma(col);
    col = mix(vec3(g), col, .9) * vec3(1.04, 1.0, .9);
    col = mix(col, ink, ed);
    col += (hash21(uv*uOut + uJit) - .5) * .04;
  } else if (uLook < 1.5) {
    // ---- CLAY: depth-of-field, contact shadow from the depth buffer, warm grade ----
    float dC = dep(uv);
    float cocF = clamp((uFocus - dC) / uFocus * 2.2, 0., 1.) * 9.;
    float cocB = clamp((dC - uFocus) / uFocus * .8, 0., 1.) * 3.2;
    float r = max(cocF, cocB);
    r = max(r, smoothstep(.7, 1.0, abs(uv.y - .46) * 2.) * 4.);
    vec3 acc = vec3(0.); float ga = 2.39996;
    for (int i=0;i<24;i++){
      float fi = float(i);
      float rr = sqrt((fi+.5)/24.) * r;
      vec2 o = vec2(cos(fi*ga), sin(fi*ga)) * rr / uOut;
      acc += texture2D(tColor, uv + o).rgb;
    }
    col = acc / 24.;
    float occ = 0.;
    for (int i=0;i<16;i++){
      float fi = float(i);
      float rr = (6. + 22.*fract(fi*.618)) ;
      vec2 o = vec2(cos(fi*2.4), sin(fi*2.4)) * rr / uOut;
      float dd = dC - dep(uv + o);
      occ += smoothstep(.01, .08, dd) * (1. - smoothstep(.35, .9, dd));
    }
    occ = clamp(occ / 16. * 2.2, 0., 1.);
    col *= mix(vec3(1.), vec3(.55,.36,.3), occ * .8);
    // warm grade, soft vignette
    col = pow(col, vec3(.95)) * vec3(1.06, 1.0, .9);
    float v = length((uv - .5) * vec2(1., .8));
    col *= 1. - smoothstep(.45, .85, v) * .35;
    col += (hash21(uv*uOut) - .5) * .02;
  } else {
    // ---- VERSE: RGB misregistration, bold outlines per channel, halftone in the shadows ----
    vec2 off = vec2(2.6, 1.0) / uOut;
    vec3 c;
    c.r = texture2D(tColor, uv + off).r;
    c.g = texture2D(tColor, uv).g;
    c.b = texture2D(tColor, uv - off*1.3).b;
    float er = edge(uv + off, 3.4, .045, .9);
    float eg = edge(uv, 3.4, .045, .9);
    float eb = edge(uv - off*1.4, 3.4, .045, .9);
    float L = pow(luma(c), 1./2.2);
    vec2 p = rot(uv*uOut, .785398) / 8.5;
    vec2 gq = fract(p) - .5;
    float d = length(gq);
    float rad = (1. - smoothstep(.18, .86, L)) * .66;
    float dots = (1. - smoothstep(rad - .06, rad + .06, d)) * step(.02, rad);
    vec3 shade = c * vec3(.42, .30, .72);
    c = mix(c, shade, dots * .95);
    // punchy, saturated
    float g = luma(c);
    c = mix(vec3(g), c, 1.5);
    c = c * vec3(1.02, .98, 1.04);
    vec3 e = vec3(er, eg, eb);
    col = c * (1. - e*.96) + e * vec3(.02, .01, .08) * 0.;
    col += (hash21(uv*uOut) - .5) * .015;
  }
  gl_FragColor = linearToOutputTexel(vec4(max(col, 0.), 1.));
}
`;

export function Post({ look, frame, focus = 3.1 }: { look: Look; frame: number; focus?: number }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const rig = useMemo(() => {
    const W = Math.round(1080 * SS), H = Math.round(1920 * SS);
    const rtC = new THREE.WebGLRenderTarget(W, H, { samples: 4, type: THREE.HalfFloatType });
    const rtN = new THREE.WebGLRenderTarget(W, H, { type: THREE.UnsignedByteType });
    rtN.depthTexture = new THREE.DepthTexture(W, H);
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tColor: { value: rtC.texture }, tNorm: { value: rtN.texture }, tDepth: { value: rtN.depthTexture },
        uOut: { value: new THREE.Vector2(1080, 1920) }, uNear: { value: 0.1 }, uFar: { value: 80 },
        uJit: { value: 0 }, uLook: { value: 0 }, uFocus: { value: 3 },
      },
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    quad.frustumCulled = false;
    const qs = new THREE.Scene();
    qs.add(quad);
    return { rtC, rtN, mat, qs, qc: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), nm: new THREE.MeshNormalMaterial() };
  }, []);

  // one render per Remotion frame (priority 1 turns off R3F's own render)
  useFrame(() => {
    const u = rig.mat.uniforms;
    u.uNear.value = camera.near; u.uFar.value = camera.far;
    u.uJit.value = Math.floor(frame / 3);
    u.uLook.value = look === "ink" ? 0 : look === "clay" ? 1 : 2;
    u.uFocus.value = focus;
    gl.setRenderTarget(rig.rtC);
    gl.clear();
    gl.render(scene, camera);
    const bg = scene.background; const cc = new THREE.Color(); gl.getClearColor(cc);
    scene.background = null;
    scene.overrideMaterial = rig.nm;
    gl.setClearColor(0x8080ff, 1);
    gl.setRenderTarget(rig.rtN);
    gl.clear();
    gl.render(scene, camera);
    scene.overrideMaterial = null; scene.background = bg; gl.setClearColor(cc, 1);
    gl.setRenderTarget(null);
    gl.clear();
    gl.render(rig.qs, rig.qc);
  }, 1);
  return null;
}
