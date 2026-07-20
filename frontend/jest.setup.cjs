// Jest setup — runs before each test file.
require("@testing-library/jest-dom");

// jsdom doesn't implement matchMedia; provide a default (no reduced motion)
// stub so hooks that probe it don't throw. Tests can override window.__reduceMotion.
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches:
      query.includes("prefers-reduced-motion") && window.__reduceMotion === true,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
