// =========================================================================
//  Minimal three.js mock for headless logic testing.
//
//  Vector3 and Color implement REAL math so the game's collision,
//  following, and movement logic is genuinely exercised. Everything else
//  (geometries, materials, renderer) is a harmless stub — we are testing
//  game rules, not rendering.
// =========================================================================

export class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
  clone() { return new Vector3(this.x, this.y, this.z); }
  add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
  sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
  addScaledVector(v, s) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this; }
  multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
  setScalar(s) { this.x = s; this.y = s; this.z = s; return this; }
  setY(y) { this.y = y; return this; }
  length() { return Math.hypot(this.x, this.y, this.z); }
  lengthSq() { return this.x * this.x + this.y * this.y + this.z * this.z; }
  normalize() { const l = this.length() || 1; return this.multiplyScalar(1 / l); }
  distanceTo(v) { return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z); }
  lerp(v, a) { this.x += (v.x - this.x) * a; this.y += (v.y - this.y) * a; this.z += (v.z - this.z) * a; return this; }
  crossVectors(a, b) {
    const ax = a.x, ay = a.y, az = a.z, bx = b.x, by = b.y, bz = b.z;
    this.x = ay * bz - az * by; this.y = az * bx - ax * bz; this.z = ax * by - ay * bx;
    return this;
  }
  applyAxisAngle(axis, angle) { // Rodrigues' rotation; axis assumed normalized
    const { x, y, z } = this, ux = axis.x, uy = axis.y, uz = axis.z;
    const c = Math.cos(angle), s = Math.sin(angle), dot = x * ux + y * uy + z * uz;
    this.x = x * c + (uy * z - uz * y) * s + ux * dot * (1 - c);
    this.y = y * c + (uz * x - ux * z) * s + uy * dot * (1 - c);
    this.z = z * c + (ux * y - uy * x) * s + uz * dot * (1 - c);
    return this;
  }
}

export class Color {
  constructor(hex = 0xffffff) { this.setHex(hex); }
  setHex(hex) {
    this._hex = hex >>> 0;
    this.r = ((hex >> 16) & 255) / 255; this.g = ((hex >> 8) & 255) / 255; this.b = (hex & 255) / 255;
    return this;
  }
  _sync() {
    const cl = v => Math.max(0, Math.min(255, Math.round(v * 255)));
    this._hex = (cl(this.r) << 16) | (cl(this.g) << 8) | cl(this.b);
  }
  multiplyScalar(s) { this.r *= s; this.g *= s; this.b *= s; this._sync(); return this; }
  getHex() { return this._hex; }
  clone() { return new Color(this._hex); }
  set(hex) { return this.setHex(hex); }
}

class Object3D {
  constructor() {
    this.position = new Vector3();
    this.rotation = { x: 0, y: 0, z: 0 };
    this.scale = new Vector3(1, 1, 1);
    this.userData = {};
    this.children = [];
    this.parent = null;
    this.visible = true;
    this.castShadow = false;
    this.receiveShadow = false;
  }
  add(...os) { for (const o of os) { if (o) { this.children.push(o); o.parent = this; } } return this; }
  remove(o) { const i = this.children.indexOf(o); if (i >= 0) this.children.splice(i, 1); return this; }
  traverse(cb) { cb(this); for (const c of this.children) { if (c && c.traverse) c.traverse(cb); } }
}

class Mesh extends Object3D { constructor(geo, mat) { super(); this.isMesh = true; this.geometry = geo; this.material = mat; } }
class Group extends Object3D {}
class Scene extends Object3D { constructor() { super(); this.background = null; this.fog = null; } }

class PerspectiveCamera extends Object3D {
  constructor(fov, aspect, near, far) { super(); this.fov = fov; this.aspect = aspect; this.near = near; this.far = far; this._dir = new Vector3(0, 0, -1); }
  updateProjectionMatrix() {}
  getWorldDirection(t) { return t.copy(this._dir); }
  lookAt(t) { this._dir.copy(t).sub(this.position); if (this._dir.lengthSq() > 0) this._dir.normalize(); return this; }
}

class Light extends Object3D { constructor() { super(); this.shadow = { mapSize: { set() {} }, camera: {} }; } }
class DirectionalLight extends Light {}
class HemisphereLight extends Object3D {}

class Geometry {}
class Material { constructor(p = {}) { Object.assign(this, p); } }

class Clock { constructor() { this.elapsedTime = 0; } getDelta() { return 0.016; } }
class Fog { constructor(c, n, f) { this.color = c; this.near = n; this.far = f; } }

class WebGLRenderer {
  constructor() {
    this.domElement = { style: {}, addEventListener() {}, appendChild() {} };
    this.shadowMap = { enabled: false, type: 0 };
  }
  setPixelRatio() {} setSize() {} render() {}
}

// Generic geometry/material factory so every shape name "just works".
const geo = () => class extends Geometry {};
const mat = () => class extends Material {};

export const THREE = {
  Vector3, Color, Mesh, Group, Scene, PerspectiveCamera,
  DirectionalLight, HemisphereLight, Clock, Fog, WebGLRenderer,
  PCFSoftShadowMap: 1,
  BoxGeometry: geo(), SphereGeometry: geo(), CylinderGeometry: geo(),
  ConeGeometry: geo(), TorusGeometry: geo(), PlaneGeometry: geo(),
  CircleGeometry: geo(), CapsuleGeometry: geo(),
  MeshStandardMaterial: mat(), MeshBasicMaterial: mat(),
};
