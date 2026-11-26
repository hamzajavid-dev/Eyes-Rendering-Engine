// The supplied ani.wat was compiled to ani.wasm. This small bridge exposes the
// exports expected by the original anim.js player.
(function () {
  'use strict';

  const module = window.Module = window.Module || {};
  let memory;

  const imports = {
    a: {
      a() { throw new Error('Animation aborted'); },
      b() { throw new Error('Animation exception'); },
      c() {},
      d() { return 0; },
      e() { throw new Error('Animation exception'); },
      f(bytes) {
        try {
          const pages = Math.ceil(bytes / 65536) - memory.buffer.byteLength / 65536;
          if (pages > 0) memory.grow(pages);
          return 1;
        } catch (_) {
          return 0;
        }
      },
    },
  };

  Promise.resolve()
    .then(() => WebAssembly.instantiate(window.AnimationAssets.decode('wasm'), imports))
    .then(({ instance }) => {
      const wasm = instance.exports;
      memory = wasm.g;
      Object.defineProperties(module, {
        HEAPU8: { get: () => new Uint8Array(memory.buffer) },
        HEAPF32: { get: () => new Float32Array(memory.buffer) },
      });
      Object.assign(module, {
        _malloc: wasm.w,
        _free: wasm.v,
        _w0: wasm.i,
        _w1: wasm.j,
        _w3: wasm.k,
        _w4: wasm.l,
        _w5: wasm.m,
        _w6: wasm.n,
        _w7: wasm.o,
        _w8: wasm.p,
        _w11: wasm.q,
        _w12: wasm.r,
      });
      wasm.h();
      module.onRuntimeInitialized?.();
    })
    .catch((error) => {
      console.error('Original eyes could not start:', error);
      window.dispatchEvent(new Event('legacyeyeserror'));
    });
})();
