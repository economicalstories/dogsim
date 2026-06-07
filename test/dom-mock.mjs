// =========================================================================
//  Minimal DOM/window globals so game.js can build its HUD and attach
//  listeners while running under Node. Nothing here renders — calls are
//  recorded just enough to be inspected by tests.
// =========================================================================

class FakeClassList {
  constructor() { this._s = new Set(); }
  add(c) { this._s.add(c); }
  remove(c) { this._s.delete(c); }
  contains(c) { return this._s.has(c); }
  toggle(c) { this._s.has(c) ? this._s.delete(c) : this._s.add(c); }
}

class FakeElement {
  constructor(id = '') {
    this.id = id;
    this.style = {};
    this.classList = new FakeClassList();
    this.dataset = {};
    this.children = [];
    this._textContent = '';
    this._innerHTML = '';
    this.title = '';
  }
  set textContent(v) { this._textContent = v; }
  get textContent() { return this._textContent; }
  set innerHTML(v) { this._innerHTML = v; }
  get innerHTML() { return this._innerHTML; }
  addEventListener() {}
  removeEventListener() {}
  appendChild(c) { this.children.push(c); return c; }
  querySelectorAll() { return []; }
}

export function installDom() {
  const elements = new Map();
  const getEl = (id) => {
    if (!elements.has(id)) elements.set(id, new FakeElement(id));
    return elements.get(id);
  };

  const documentMock = {
    getElementById: getEl,
    createElement: () => new FakeElement(),
    querySelectorAll: () => [],
    addEventListener() {},
    body: new FakeElement('body'),
  };

  const windowMock = {
    innerWidth: 800,
    innerHeight: 600,
    devicePixelRatio: 1,
    addEventListener() {},
    removeEventListener() {},
    // AudioContext intentionally omitted -> game disables sound gracefully
  };

  globalThis.document = documentMock;
  globalThis.window = windowMock;
  // Don't actually loop the render: animate() calls rAF first, so a no-op
  // stops it after a single frame.
  globalThis.requestAnimationFrame = () => 0;

  return { documentMock, windowMock, getEl, elements };
}
