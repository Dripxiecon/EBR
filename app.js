import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";

const $ = (id) => document.getElementById(id);
const viewport = $("viewport");
const state = {
  maps: { color: true, wetness: true, ero: true, yonic: true, oil: true, thick: true, ambiguous: true },
  sourceCanvas: null,
  mapCanvases: {},
  textures: {},
  performance: false,
  sphereVisible: true,
  lightVisible: true,
  selectedPreview: "color",
  mapStrength: 1,
  displacement: 0.08
};

const renderer = new THREE.WebGLRenderer({ antialias: !state.performance, alpha: false, powerPreference: "low-power" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(viewport.clientWidth, viewport.clientHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
viewport.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x12161d);
const camera = new THREE.PerspectiveCamera(38, viewport.clientWidth / viewport.clientHeight, 0.1, 100);
camera.position.set(0, 0.15, 4.4);

const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;
orbit.dampingFactor = 0.065;
orbit.minDistance = 2.1;
orbit.maxDistance = 8;
orbit.target.set(0, 0, 0);

scene.add(new THREE.HemisphereLight(0x9eb5d0, 0x24202a, 0.8));
const keyLight = new THREE.PointLight(0xfff0dc, 3, 20, 1.5);
keyLight.position.set(2.2, 1.8, 2.5);
scene.add(keyLight);
const lightMarker = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffc27d }));
lightMarker.position.copy(keyLight.position);
scene.add(lightMarker);
const lightGizmo = new TransformControls(camera, renderer.domElement);
lightGizmo.attach(lightMarker);
lightGizmo.setMode("translate");
lightGizmo.setSpace("world");
lightGizmo.addEventListener("dragging-changed", (event) => { orbit.enabled = !event.value; });
lightGizmo.addEventListener("objectChange", () => keyLight.position.copy(lightMarker.position));
scene.add(lightGizmo.getHelper());

const uniforms = {
  uColor: { value: null }, uWetness: { value: null }, uEro: { value: null },
  uYonic: { value: null }, uOil: { value: null }, uThick: { value: null }, uAmbiguous: { value: null },
  uUseColor: { value: 1 }, uUseWetness: { value: 1 }, uUseEro: { value: 1 },
  uUseYonic: { value: 1 }, uUseOil: { value: 1 }, uUseThick: { value: 1 }, uUseAmbiguous: { value: 1 },
  uLightPosition: { value: keyLight.position.clone() }, uLightColor: { value: new THREE.Color(0xfff0dc) },
  uLightIntensity: { value: 3 }, uMapStrength: { value: 1 }, uDisplacement: { value: 0.08 }
};

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  uniform sampler2D uAmbiguous;
  uniform float uUseAmbiguous;
  uniform float uDisplacement;
  void main() {
    vUv = uv;
    vec3 displaced = position;
    vec3 amb = texture2D(uAmbiguous, uv).rgb;
    float purple = smoothstep(0.28, 0.62, amb.b - amb.r * 0.25);
    float orange = smoothstep(0.28, 0.7, amb.r - amb.b * 0.35);
    float yellow = smoothstep(0.42, 0.85, amb.g + amb.r * 0.25);
    float heightSignal = clamp((amb.r + amb.g + amb.b) / 3.0, 0.0, 1.0);
    float complexSignal = purple * 0.45 + orange * 0.25 + yellow * 0.1;
    displaced += normal * (heightSignal - 0.45 + complexSignal) * uDisplacement * uUseAmbiguous;
    vec4 world = modelMatrix * vec4(displaced, 1.0);
    vWorldPosition = world.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = `
  precision highp float;
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  uniform sampler2D uColor, uWetness, uEro, uYonic, uOil, uThick, uAmbiguous;
  uniform vec3 uLightPosition, uLightColor;
  uniform float uLightIntensity, uMapStrength;
  uniform float uUseColor, uUseWetness, uUseEro, uUseYonic, uUseOil, uUseThick, uUseAmbiguous;
  void main() {
    vec3 base = texture2D(uColor, vUv).rgb;
    vec3 wet = texture2D(uWetness, vUv).rgb;
    vec3 ero = texture2D(uEro, vUv).rgb;
    vec3 yon = texture2D(uYonic, vUv).rgb;
    vec3 oil = texture2D(uOil, vUv).rgb;
    vec3 thick = texture2D(uThick, vUv).rgb;
    vec3 amb = texture2D(uAmbiguous, vUv).rgb;

    float wetness = dot(wet, vec3(0.24, 0.34, 0.42)) * uUseWetness;
    float eroMask = dot(ero, vec3(0.30, 0.38, 0.32)) * uUseEro;
    float organic = dot(yon, vec3(0.30, 0.59, 0.11)) * uUseYonic;
    float oilLevel = dot(oil, vec3(0.30, 0.59, 0.11)) * uUseOil;
    float thickness = dot(thick, vec3(0.30, 0.59, 0.11)) * uUseThick;
    float displacementInfo = dot(amb, vec3(0.30, 0.59, 0.11)) * uUseAmbiguous;

    vec3 n = normalize(vWorldNormal);
    vec3 l = normalize(uLightPosition - vWorldPosition);
    vec3 v = normalize(cameraPosition - vWorldPosition);
    vec3 h = normalize(l + v);
    float distanceToLight = length(uLightPosition - vWorldPosition);
    float attenuation = 1.0 / (1.0 + 0.12 * distanceToLight * distanceToLight);
    float ndl = max(dot(n, l), 0.0);

    float roughness = clamp(0.72 - wetness * 0.48 - oilLevel * 0.28 + organic * 0.12, 0.055, 1.0);
    float exponent = mix(5.0, 110.0, 1.0 - roughness);
    float specular = pow(max(dot(n, h), 0.0), exponent) * (0.12 + wetness * 0.45 + oilLevel * 0.7);
    float wrapDiffuse = max((dot(n, l) + 0.18) / 1.18, 0.0);
    vec3 diffuse = base * (0.16 + wrapDiffuse * uLightIntensity * attenuation * uLightColor);
    vec3 wetTint = vec3(0.56, 0.76, 0.94) * wetness * 0.045;
    vec3 oilTint = vec3(0.92, 0.95, 1.0) * oilLevel * specular * 0.24;
    vec3 eroTint = vec3(0.36, 0.045, 0.12) * eroMask * 0.22;
    vec3 organicTint = base * (1.0 + organic * 0.045);
    vec3 subsurface = base * thickness * (0.08 + 0.12 * max(dot(-n, l), 0.0));
    vec3 displacementTint = vec3(0.04) * displacementInfo;
    vec3 color = diffuse * organicTint + uLightColor * specular * attenuation + wetTint + oilTint + eroTint + subsurface + displacementTint;
    color = mix(base * 0.18, color, uMapStrength);
    if (uUseColor < 0.5) color = vec3(0.72, 0.73, 0.76);
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const sphereGeometry = new THREE.SphereGeometry(1, 96, 64);
const material = new THREE.ShaderMaterial({
  uniforms,
  vertexShader,
  fragmentShader,
  lights: false
});
const sphere = new THREE.Mesh(sphereGeometry, material);
scene.add(sphere);

function makeCanvas(width = 512, height = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  return canvas;
}
function makeProceduralColor() {
  const canvas = makeCanvas();
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 512, 256);
  gradient.addColorStop(0, "#9b6549");
  gradient.addColorStop(0.38, "#d7a47b");
  gradient.addColorStop(0.7, "#785b53");
  gradient.addColorStop(1, "#c2a17d");
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 90; i++) {
    const x = (i * 79) % 512, y = (i * 47) % 256;
    ctx.fillStyle = i % 2 ? "rgba(45,28,22,.10)" : "rgba(255,230,190,.10)";
    ctx.beginPath(); ctx.ellipse(x, y, 4 + (i % 9), 2 + (i % 4), (i % 5) * .3, 0, Math.PI * 2); ctx.fill();
  }
  return canvas;
}
function luminance(r, g, b) { return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; }
function generateMaps(source) {
  const width = 512, height = 256;
  const base = makeCanvas(width, height);
  const bctx = base.getContext("2d", { willReadFrequently: true });
  bctx.drawImage(source, 0, 0, width, height);
  const input = bctx.getImageData(0, 0, width, height);
  const pixels = input.data;
  const maps = {};
  const names = ["wetness", "ero", "yonic", "oil", "thick", "ambiguous"];
  for (const name of names) maps[name] = makeCanvas(width, height);
  const contexts = Object.fromEntries(names.map(name => [name, maps[name].getContext("2d")]));
  const outputs = Object.fromEntries(names.map(name => [name, contexts[name].createImageData(width, height)]));
  const lums = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) lums[i] = luminance(pixels[i*4], pixels[i*4+1], pixels[i*4+2]);
  const sample = (x, y) => lums[Math.max(0, Math.min(height-1,y))*width + Math.max(0,Math.min(width-1,x))];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = y * width + x, p = i * 4, lum = lums[i];
    const edge = Math.min(1, Math.abs(sample(x+1,y)-sample(x-1,y))*3.4 + Math.abs(sample(x,y+1)-sample(x,y-1))*3.4);
    const broad = Math.min(1, Math.max(0, lum * 0.72 + edge * 0.28));
    const fine = Math.min(1, Math.max(0, edge * 0.75 + Math.abs(lum - 0.5) * 0.25));
    const vals = {
      wetness: [0.035 + broad*.22, 0.08 + broad*.47, 0.14 + broad*.76],
      ero: [0.10 + broad*.56, 0.015 + broad*.18, 0.055 + broad*.27],
      yonic: [0.025 + broad*.24, 0.09 + fine*.60, 0.035 + broad*.27],
      oil: [broad, broad, broad],
      thick: [0.08 + broad*.43, 0.045 + broad*.32, 0.10 + broad*.50],
      ambiguous: ambiguousColor(broad, fine)
    };
    for (const name of names) {
      const d = outputs[name].data, c = vals[name];
      d[p] = Math.round(Math.min(1,c[0])*255); d[p+1] = Math.round(Math.min(1,c[1])*255);
      d[p+2] = Math.round(Math.min(1,c[2])*255); d[p+3] = 255;
    }
  }
  for (const name of names) contexts[name].putImageData(outputs[name], 0, 0);
  state.mapCanvases = { color: base, ...maps };
  return state.mapCanvases;
}
function ambiguousColor(heightValue, detail) {
  // Prototype palette: purple marks complex detail, orange the middle range, yellow the lightest range.
  const t = Math.max(0, Math.min(1, heightValue * 0.82 + detail * 0.18));
  const stops = [
    [0.0, [67, 28, 91]],
    [0.42, [133, 73, 151]],
    [0.72, [205, 117, 58]],
    [1.0, [255, 238, 157]]
  ];
  for (let i = 0; i < stops.length - 1; i++) if (t <= stops[i+1][0]) {
    const [a, ca] = stops[i], [b, cb] = stops[i+1], f = (t-a)/(b-a);
    return ca.map((v,j) => (v + (cb[j]-v)*f)/255);
  }
  return [1, 0.93, 0.62];
}
function textureFromCanvas(canvas, isColor = false) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  return texture;
}
function applyMaps() {
  for (const [name, canvas] of Object.entries(state.mapCanvases)) {
    if (state.textures[name]) state.textures[name].dispose();
    state.textures[name] = textureFromCanvas(canvas, name === "color");
  }
  uniforms.uColor.value = state.textures.color;
  uniforms.uWetness.value = state.textures.wetness;
  uniforms.uEro.value = state.textures.ero;
  uniforms.uYonic.value = state.textures.yonic;
  uniforms.uOil.value = state.textures.oil;
  uniforms.uThick.value = state.textures.thick;
  uniforms.uAmbiguous.value = state.textures.ambiguous;
  updateMapUniforms();
  updatePreview(state.selectedPreview);
}
function updateMapUniforms() {
  for (const name of Object.keys(state.maps)) uniforms["uUse" + name[0].toUpperCase() + name.slice(1)].value = state.maps[name] ? 1 : 0;
}
function updatePreview(name) {
  state.selectedPreview = name;
  const canvas = state.mapCanvases[name];
  const preview = $("map-preview");
  preview.replaceChildren();
  if (!canvas) { preview.textContent = "No map generated"; return; }
  const copy = document.createElement("canvas");
  copy.width = 512; copy.height = 256;
  copy.getContext("2d").drawImage(canvas, 0, 0);
  preview.appendChild(copy);
  $("map-preview-name").textContent = name[0].toUpperCase() + name.slice(1) + " map · generated preview";
}
function loadSource(source, label) {
  state.sourceCanvas = source;
  generateMaps(source);
  applyMaps();
  $("source-name").textContent = label;
}
function setLightColor(value) {
  const color = new THREE.Color(value);
  uniforms.uLightColor.value.copy(color);
  keyLight.color.copy(color);
}
function resize() {
  const w = Math.max(1, viewport.clientWidth), h = Math.max(1, viewport.clientHeight);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
const resizeObserver = new ResizeObserver(resize);
resizeObserver.observe(viewport);

$("color-upload").addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    const canvas = makeCanvas();
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    loadSource(canvas, file.name);
    URL.revokeObjectURL(url);
  };
  image.onerror = () => { $("source-name").textContent = "Could not load image"; URL.revokeObjectURL(url); };
  image.src = url;
});
$("generate-maps").addEventListener("click", () => {
  if (!state.sourceCanvas) state.sourceCanvas = makeProceduralColor();
  generateMaps(state.sourceCanvas);
  applyMaps();
  $("source-name").textContent = "Maps regenerated from current color map";
});
document.querySelectorAll("[data-map]").forEach(input => {
  input.addEventListener("change", () => {
    state.maps[input.dataset.map] = input.checked;
    updateMapUniforms();
    updatePreview(input.dataset.map);
  });
});
document.querySelectorAll(".map-row").forEach(row => {
  row.addEventListener("click", (event) => {
    if (event.target instanceof HTMLInputElement) return;
    const input = row.querySelector("input");
    updatePreview(input.dataset.map);
  });
});
document.querySelectorAll("[data-target]").forEach(button => {
  button.addEventListener("click", () => {
    const target = button.dataset.target;
    if (target === "sphere") {
      state.sphereVisible = !state.sphereVisible;
      sphere.visible = state.sphereVisible;
    } else {
      state.lightVisible = !state.lightVisible;
      lightMarker.visible = state.lightVisible;
      keyLight.visible = state.lightVisible;
      lightGizmo.enabled = state.lightVisible;
    }
    button.classList.toggle("off", target === "sphere" ? !state.sphereVisible : !state.lightVisible);
  });
});
$("light-intensity").addEventListener("input", event => {
  const value = Number(event.target.value);
  uniforms.uLightIntensity.value = value;
  keyLight.intensity = value;
  $("intensity-value").value = value.toFixed(1);
});
$("light-color").addEventListener("input", event => setLightColor(event.target.value));
$("effect-strength").addEventListener("input", event => {
  state.mapStrength = Number(event.target.value) / 100;
  uniforms.uMapStrength.value = state.mapStrength;
  $("strength-value").value = event.target.value + "%";
});
$("displacement").addEventListener("input", event => {
  state.displacement = Number(event.target.value);
  uniforms.uDisplacement.value = state.displacement;
  $("displacement-value").value = state.displacement.toFixed(3);
});
$("move-tool").addEventListener("click", () => {
  lightGizmo.setMode("translate");
  $("move-tool").classList.add("active"); $("rotate-tool").classList.remove("active");
});
$("rotate-tool").addEventListener("click", () => {
  lightGizmo.setMode("rotate");
  $("rotate-tool").classList.add("active"); $("move-tool").classList.remove("active");
});
$("toggle-gizmo").addEventListener("click", event => {
  lightGizmo.enabled = !lightGizmo.enabled;
  event.currentTarget.setAttribute("aria-pressed", String(lightGizmo.enabled));
  event.currentTarget.textContent = lightGizmo.enabled ? "Gizmo on" : "Gizmo off";
});
$("reset-view").addEventListener("click", () => {
  camera.position.set(0, 0.15, 4.4);
  orbit.target.set(0, 0, 0);
  orbit.update();
  lightMarker.position.set(2.2, 1.8, 2.5);
  keyLight.position.copy(lightMarker.position);
});
$("performance-mode").addEventListener("click", event => {
  state.performance = !state.performance;
  renderer.setPixelRatio(state.performance ? Math.min(window.devicePixelRatio || 1, 1) : Math.min(window.devicePixelRatio || 1, 1.5));
  event.currentTarget.setAttribute("aria-pressed", String(state.performance));
  event.currentTarget.textContent = "Performance mode: " + (state.performance ? "on" : "off");
});

const initialColor = makeProceduralColor();
loadSource(initialColor, "Using procedural test texture");
$("loading").remove();
$("render-status").textContent = "WEBGL · READY";

let lastFrame = performance.now(), frames = 0, fps = 0;
function animate(now) {
  requestAnimationFrame(animate);
  orbit.update();
  uniforms.uLightPosition.value.copy(keyLight.position);
  lightMarker.position.copy(keyLight.position);
  renderer.render(scene, camera);
  frames++;
  if (now - lastFrame >= 1000) {
    fps = Math.round(frames * 1000 / (now - lastFrame));
    $("fps-readout").textContent = fps + " FPS";
    frames = 0; lastFrame = now;
  }
}
requestAnimationFrame(animate);

window.addEventListener("beforeunload", () => {
  resizeObserver.disconnect();
  Object.values(state.textures).forEach(texture => texture.dispose());
  sphereGeometry.dispose(); material.dispose(); renderer.dispose();
});
