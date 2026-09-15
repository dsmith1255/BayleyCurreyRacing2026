import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

test('mobile navigation opens, closes, traps focus, and resets on desktop', () => {
  let document;
  const element = () => ({
    dataset: {}, attributes: {}, listeners: {}, inert: false,
    setAttribute(key, value) { this.attributes[key] = value; },
    getAttribute(key) { return this.attributes[key]; },
    removeAttribute(key) { delete this.attributes[key]; },
    addEventListener(key, fn) { this.listeners[key] = fn; },
    focus() { document.activeElement = this; },
    getClientRects() { return [1]; },
    closest() { return null; }
  });
  const header = element(), toggle = element(), nav = element(), scrim = element();
  const main = element(), footer = element(), first = element(), last = element();
  const label = {};
  const classes = new Set();
  const mobile = { matches: true, addEventListener(key, fn) { this.onChange = fn; } };
  const window = { matchMedia: () => mobile, addEventListener() {} };
  document = {
    body: { classList: { add: name => classes.add(name), toggle: (name, on) => on ? classes.add(name) : classes.delete(name) } },
    activeElement: null, listeners: {},
    querySelector: selector => selector === '.home-header' ? header : scrim,
    querySelectorAll: () => [main, footer],
    addEventListener(key, fn) { this.listeners[key] = fn; }
  };
  header.querySelector = selector => selector === '.home-menu-toggle' ? toggle : nav;
  header.querySelectorAll = () => [first, toggle, last];
  toggle.querySelector = () => label;
  runInNewContext(readFileSync(new URL('../home.js', import.meta.url), 'utf8'), { window, document });
  assert.equal(nav.inert, true);
  assert.equal(toggle.attributes['aria-expanded'], 'false');
  toggle.listeners.click();
  assert.equal(header.dataset.menuOpen, 'true');
  assert.equal(label.textContent, 'Close');
  assert.equal(nav.inert, false);
  assert.equal(main.inert, true);
  assert.equal(footer.inert, true);
  assert.equal(scrim.hidden, false);
  assert.ok(classes.has('home-menu-open'));
  last.focus();
  let prevented = false;
  document.listeners.keydown({ key: 'Tab', preventDefault() { prevented = true; } });
  assert.equal(document.activeElement, first);
  assert.equal(prevented, true);
  document.listeners.keydown({ key: 'Escape', preventDefault() {} });
  assert.equal(document.activeElement, toggle);
  assert.equal(nav.inert, true);
  assert.equal(main.inert, false);
  assert.equal(scrim.hidden, true);
  assert.ok(!classes.has('home-menu-open'));
  toggle.listeners.click();
  scrim.listeners.click();
  assert.equal(header.dataset.menuOpen, 'false');
  toggle.listeners.click();
  mobile.matches = false;
  mobile.onChange();
  assert.equal(nav.inert, false);
  assert.equal(nav.attributes['aria-hidden'], undefined);
  assert.equal(header.dataset.menuOpen, 'false');
  assert.equal(main.inert, false);
});
