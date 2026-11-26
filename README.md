# Eyes Rendering Engine

The page opens with a full-screen eye animation. The eyes look around, spin into
a cycling color wash, show dizzy spirals and stars, then return to their starting
look. Scroll down to change pupil size, pupil length, eye color, and pupil color.
Click the eyes or use the replay button to run the sequence again.

The renderer uses the original eye animation from `anim.js` and `anim_data.bin`.
`ani.wat` preserves the supplied WebAssembly text; `ani.wasm` is its compiled
browser-ready binary. `animation-assets.js` bundles the binary and data so the
page also works when `index.html` is opened directly. Run `python build-assets.py`
after changing either binary file.

Preview locally from this folder with:

```powershell
python -m http.server 8765
```

Then open <http://localhost:8765/>. You can also open `index.html` directly.
