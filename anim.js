( () => {
    var H = new Promise(o => {
        window.Module = window.Module || {};
        let m = window.Module.onRuntimeInitialized;
        window.Module.onRuntimeInitialized = function() {
            m && m(),
            o(window.Module)
        }
    }
    )
      , F = new Map;
    function I(o, m) {
        let f = F.get(m);
        if (f)
            return f;
        f = o._malloc(m.length + 1);
        for (let w = 0; w < m.length; w++)
            o.HEAPU8[f + w] = m.charCodeAt(w);
        return o.HEAPU8[f + m.length] = 0,
        F.set(m, f),
        f
    }
    var U = ["kpdhpvcju", "lbxslfnxg", "mcpfwucsm", "nqzbkezbg"]
      , q = ["ajezs", "bajhvf", "cwiocc"]
      , z = ["jjuy", "ptenbyrcn", "qmuusxmtv", "rzufjwypm"]
      , B = ["uxonq", "vidcr", "wxaqs", "xnbvl", "ssjbxfj", "tsjgjpc"];
    (function() {
        "use strict";
        let o = null
          , m = 0
          , f = 16384
          , w = 400
          , P = 400
          , j = 400
          , L = "anim_data.bin"
          , M = U[0]
          , W = q
          , X = z
          , $ = B
          , K = [3e3, 6e3]
          , V = [5e3, 1e4];
        function O([t,n]) {
            return t + Math.random() * (n - t)
        }
        function C(t) {
            return t[Math.floor(Math.random() * t.length)]
        }
        class Y {
            constructor(n, l, e, s) {
                this.container = n,
                this.s = l || P,
                this.o = e || j,
                this.canvas = null,
                this.ctx = null,
                this.e = s,
                this.t = !1,
                this.l = !1,
                this.u = M,
                this.a = null,
                this.i = null,
                this.frozen = !1,
                this.manualLook = null,
                this.effects = { spiral: 0, stars: 0, phase: 0 },
                this.appearance = {
                    eyeColor: "#f99f05",
                    pupilColor: "#6e6123",
                    pupilScale: 1,
                    pupilLength: 1
                }
            }
            h() {
                this.canvas = document.createElement("canvas"),
                this.canvas.width = this.s,
                this.canvas.height = this.o,
                this.canvas.style.display = "block",
                this.canvas.style.opacity = "0",
                this.canvas.style.transition = "opacity 600ms ease-in-out",
                this.container.appendChild(this.canvas),
                this.ctx = this.canvas.getContext("2d")
            }
            r(n) {
                return !this.t || this.e < 0 || this.frozen ? 0 : o._w4(this.e, I(o, n), 1)
            }
            d() {
                this.a = setTimeout( () => {
                    if (this.frozen) return;
                    document.hidden || this.r(C(W)),
                    this.d()
                }
                , O(K))
            }
            m() {
                this.i = setTimeout( () => {
                    if (this.frozen) return;
                    document.hidden || this.r(C($)),
                    this.m()
                }
                , O(V))
            }
            g() {
                for (let n of X)
                    this.r(n);
                this.d(),
                this.m()
            }
            v() {
                if (!this.ctx || !o)
                    return;
                let n = this.ctx
                  , l = Z(this.e);
                n.setTransform(1, 0, 0, 1, 0, 0),
                n.clearRect(0, 0, this.s, this.o),
                n.setTransform(this.s / w, 0, 0, this.o / w, 0, 0);
                let e = null;
                for (let s of l) {
                    n.fillStyle = s.blend === 2 ? this.appearance.pupilColor : this.appearance.eyeColor;
                    n.globalAlpha = s.alpha;
                    if (s.blend === 2 && e) {
                        n.save();
                        n.clip(e, "evenodd");
                        n.save();
                        n.globalAlpha = s.alpha * (1 - this.effects.spiral);
                        n.translate(s.cx, s.cy);
                        n.scale(this.appearance.pupilScale, this.appearance.pupilScale * this.appearance.pupilLength);
                        n.translate(-s.cx, -s.cy);
                        n.fill(s.path, "evenodd");
                        n.restore();
                        if (this.effects.spiral > 0)
                            drawSpiral(n, s.cx, s.cy, this.appearance.pupilColor, s.alpha * this.effects.spiral, this.effects.phase);
                        n.restore()
                    } else {
                        n.globalCompositeOperation = s.blend === 1 ? "destination-over" : "source-over";
                        n.fill(s.path, "evenodd");
                        n.globalCompositeOperation = "source-over"
                    }
                    e || (e = new Path2D);
                    e.addPath(s.path)
                }
                n.globalAlpha = 1;
                if (this.effects.stars > 0)
                    drawStars(n, this.effects.stars, this.effects.phase);
                n.setTransform(1, 0, 0, 1, 0, 0),
                this.l || (this.l = !0,
                requestAnimationFrame( () => {
                    requestAnimationFrame( () => {
                        this.canvas.style.opacity = "1"
                    }
                    )
                }
                ))
            }
            _() {
                this.a && clearTimeout(this.a),
                this.i && clearTimeout(this.i),
                this.canvas && this.canvas.parentNode && this.canvas.parentNode.removeChild(this.canvas)
            }
        }
        function drawSpiral(ctx, cx, cy, pupilColor, opacity, phase) {
            ctx.save();
            ctx.globalAlpha = opacity;
            ctx.fillStyle = pupilColor;
            ctx.beginPath();
            ctx.arc(cx, cy, 31, 0, Math.PI * 2);
            ctx.fill();
            ctx.translate(cx, cy);
            ctx.rotate(phase);
            ctx.beginPath();
            for (let step = 0; step <= 96; step++) {
                const t = step / 96;
                const angle = t * Math.PI * 5.5;
                const radius = 2 + t * 27;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                if (step === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y)
            }
            ctx.lineCap = "round";
            ctx.strokeStyle = "#111";
            ctx.lineWidth = 6;
            ctx.stroke();
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.restore()
        }
        function drawStars(ctx, opacity, phase) {
            const stars = [[115, 80, 3.4], [165, 61, 2.5], [209, 76, 4.2], [259, 57, 2.8], [299, 92, 3.5]];
            stars.forEach(([baseX, baseY, size], index) => {
                const twinkle = (Math.sin(phase * 3.2 + index * 2.4) + 1) / 2;
                const x = baseX + Math.sin(phase * 1.5 + index * 1.8) * 7;
                const y = baseY + Math.cos(phase * 1.2 + index * 2.1) * 5;
                const radius = size * (0.75 + twinkle * 0.4);
                ctx.save();
                ctx.globalAlpha = opacity * (0.25 + twinkle * 0.75);
                ctx.translate(x, y);
                ctx.rotate(phase * 0.8 + index);
                ctx.fillStyle = "#fff";
                ctx.shadowColor = "#fff";
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.moveTo(0, -radius * 1.7);
                ctx.quadraticCurveTo(radius * 0.2, -radius * 0.2, radius, 0);
                ctx.quadraticCurveTo(radius * 0.2, radius * 0.2, 0, radius * 1.7);
                ctx.quadraticCurveTo(-radius * 0.2, radius * 0.2, -radius, 0);
                ctx.quadraticCurveTo(-radius * 0.2, -radius * 0.2, 0, -radius * 1.7);
                ctx.fill();
                ctx.restore()
            })
        }
        let x = t => Math.round(Math.min(Math.max(t, 0), 1) * 255);
        function G(t, n, l) {
            let e = new Path2D
              , s = t[n]
              , a = t[n + 1];
            if (Number.isNaN(s) || Number.isNaN(a))
                return e;
            e.moveTo(s, a);
            for (let c = 1; c + 1 < l; c += 3) {
                let i = t[n + c * 2]
                  , g = t[n + c * 2 + 1]
                  , b = t[n + (c + 1) * 2]
                  , d = t[n + (c + 1) * 2 + 1]
                  , r = (c + 2) % l
                  , h = t[n + r * 2]
                  , v = t[n + r * 2 + 1];
                Number.isNaN(i) || Number.isNaN(g) || Number.isNaN(b) || Number.isNaN(d) || Number.isNaN(h) || Number.isNaN(v) || e.bezierCurveTo(i, g, b, d, h, v)
            }
            return e
        }
        function Z(t) {
            o._w11(t);
            let n = o._w12(t, m, f)
              , l = [];
            if (n) {
                let e = new Float32Array(o.HEAPF32.buffer,m,n)
                  , s = e[0]
                  , a = 1;
                for (let c = 0; c < s; c++) {
                    let i = e[a]
                      , g = e[a + 1]
                      , b = x(e[a + 2])
                      , d = x(e[a + 3])
                      , r = x(e[a + 4])
                      , h = Math.min(Math.max(e[a + 5], 0), 1);
                    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                    for (let point = 0; point < i; point++) {
                        let px = e[a + 6 + point * 2], py = e[a + 7 + point * 2];
                        minX = Math.min(minX, px);
                        minY = Math.min(minY, py);
                        maxX = Math.max(maxX, px);
                        maxY = Math.max(maxY, py)
                    }
                    l.push({
                        path: G(e, a + 6, i),
                        fillStyle: `rgba(${b},${d},${r},${h})`,
                        blend: g,
                        alpha: h,
                        cx: (minX + maxX) / 2,
                        cy: (minY + maxY) / 2
                    }),
                    a += 6 + i * 2
                }
            }
            return l
        }
        let u = {
            n: 0,
            c: 0,
            f: null,
            t: !1
        };
        function J() {
            if (o) {
                for (let t of p.values())
                    if (t.t && t.canvas && t.ctx && t.e >= 0)
                        try {
                            t.v()
                        } catch (n) {
                            console.error("e2", n),
                            t.t = !1
                        }
            }
        }
        function D(t) {
            if (u.f = requestAnimationFrame(D),
            u.c = t,
            !o)
                return;
            let n = t - u.n;
            u.n = t;
            let l = Math.min(n, 100)
              , e = Math.floor(l);
            if (e > 0) {
                for (let s of p.values())
                    if (s.t && s.canvas && s.e >= 0 && !s.frozen)
                        try {
                            o._w8(s.e, e)
                        } catch (a) {
                            console.error("e3", a),
                            s.t = !1
                        }
            }
            e > 0 && u.N && u.p && u.p(e),
            J()
        }
        async function Q(t, n, l) {
            try {
                let e = o._w0();
                if (e < 0)
                    throw new Error("e4");
                t.e = e;
                let s = new Uint8Array(n)
                  , a = o._malloc(s.length);
                if (!a)
                    throw new Error("alloc failed");
                o.HEAPU8.set(s, a);
                let c = o._w1(e, a, s.length);
                if (o._free(a),
                c === 0)
                    throw new Error("init failed");
                let i = l || M;
                o._w3(e, I(o, i), 0, 1),
                t.w != null && o._w5(e, t.w),
                o._w6(e, 1),
                t.t = !0,
                t.g(),
                t.container.dispatchEvent(new Event("legacyeyesready"))
            } catch (e) {
                window.dispatchEvent(new Event("legacyeyeserror"));
                throw console.error("e6", e),
                e
            }
        }
        async function tt(t) {
            if (!t || t === L)
                return window.AnimationAssets.decode("data").buffer;
            let n = await fetch(t || L);
            if (!n.ok)
                throw new Error(`HTTP error! status: ${n.status}`);
            return await n.arrayBuffer()
        }
        let p = new Map
          , y = !1
          , A = new Map;
        window.LegacyEyes = {
            triggerRandom(container) {
                let instance = p.get(container);
                if (instance && instance.t) instance.r(C(B))
            },
            blink(container) {
                let instance = p.get(container);
                if (instance && instance.t) instance.r(C(W))
            },
            setLook(container, look) {
                let instance = p.get(container);
                if (!instance) return;
                instance.manualLook = look ? {
                    x: Math.max(-0.7, Math.min(0.7, Number(look.x) || 0)),
                    y: Math.max(-0.7, Math.min(0.7, Number(look.y) || 0))
                } : null
            },
            setEffects(container, effects) {
                let instance = p.get(container);
                if (!instance) return;
                for (let key of ["spiral", "stars"])
                    if (Number.isFinite(effects[key]))
                        instance.effects[key] = Math.max(0, Math.min(1, effects[key]));
                if (Number.isFinite(effects.phase)) instance.effects.phase = effects.phase
            },
            restart(container) {
                let instance = p.get(container);
                if (!instance || !instance.t) return;
                clearTimeout(instance.a);
                clearTimeout(instance.i);
                instance.frozen = !1;
                instance.manualLook = { x: 0, y: 0 };
                instance.effects = { spiral: 0, stars: 0, phase: 0 };
                o._w3(instance.e, I(o, M), 0, 1);
                o._w7(instance.e, 0, 0);
                instance.g()
            },
            freeze(container) {
                let instance = p.get(container);
                if (!instance || !instance.t) return;
                clearTimeout(instance.a);
                clearTimeout(instance.i);
                instance.manualLook = { x: 0, y: 0 };
                instance.effects = { spiral: 0, stars: 0, phase: 0 };
                o._w3(instance.e, I(o, M), 0, 1);
                o._w7(instance.e, 0, 0);
                o._w8(instance.e, 16);
                instance.frozen = !0
            },
            setAppearance(container, options) {
                let instance = p.get(container);
                if (!instance) return;
                for (let key of ["eyeColor", "pupilColor"])
                    if (typeof options[key] === "string" && /^#[0-9a-f]{6}$/i.test(options[key]))
                        instance.appearance[key] = options[key];
                let scale = Number(options.pupilScale);
                if (Number.isFinite(scale))
                    instance.appearance.pupilScale = Math.min(5, Math.max(0.4, scale));
                let length = Number(options.pupilLength);
                if (Number.isFinite(length))
                    instance.appearance.pupilLength = Math.min(8, Math.max(0.5, length))
            }
        };
        function et(t, n=!1) {
            if (p.has(t))
                return p.get(t);
            let l = parseInt(t.dataset.width) || P
              , e = parseInt(t.dataset.height) || j
              , s = t.dataset.state || M
              , a = t.dataset.animData || L
              , c = t.dataset.palette != null ? parseInt(t.dataset.palette) : null
              , i = new Y(t,l,e,-1);
            return i.u = s,
            i.b = a,
            i.w = Number.isNaN(c) ? null : c,
            n || i.h(),
            p.set(t, i),
            t.dataset.link && !t.dataset.linkWired && (t.dataset.linkWired = "1",
            t.style.pointerEvents = "auto",
            t.addEventListener("click", () => {
                window.open(t.dataset.link, "_blank", "noopener")
            }
            )),
            i
        }
        async function nt() {
            if (!o || y)
                return;
            y = !0;
            let t = document.querySelectorAll(".animation-renderer");
            if (t.length === 0) {
                y = !1;
                return
            }
            for (let e of t)
                et(e, !0);
            await new Promise(e => setTimeout(e, 100));
            for (let e of t) {
                let s = p.get(e);
                s && !s.canvas && s.h()
            }
            await new Promise(e => setTimeout(e, 50));
            let n = new Set;
            for (let e of t) {
                let s = p.get(e);
                s && !s.t && n.add(s.b)
            }
            let l = [];
            for (let e of n)
                A.has(e) || l.push(tt(e).then(s => A.set(e, s)).catch(s => {
                    console.error("e7", s);
                    window.dispatchEvent(new Event("legacyeyeserror"))
                }));
            await Promise.all(l);
            for (let e of t) {
                let s = p.get(e);
                if (s && !s.t)
                    try {
                        let a = A.get(s.b);
                        if (!a)
                            continue;
                        await Q(s, a, s.u)
                    } catch (a) {
                        console.error("e8", a),
                        window.dispatchEvent(new Event("legacyeyeserror"))
                    }
            }
            if (await new Promise(e => setTimeout(e, 50)),
            !u.t) {
                let g = function() {
                    if (!i || !i.length) {
                        let d = Math.max(p.size, 2);
                        i = Array.from({
                            length: d
                        }, (r, h) => e + h / (d - 1) * (s - e));
                        for (let r = i.length - 1; r > 0; r--) {
                            let h = Math.floor(Math.random() * (r + 1));
                            [i[r],i[h]] = [i[h], i[r]]
                        }
                    }
                    return i.pop()
                };
                u.n = performance.now(),
                u.c = performance.now(),
                u.f = requestAnimationFrame(D),
                u.t = !0;
                let e = 50
                  , s = 300
                  , a = window.innerWidth / 2
                  , c = window.innerHeight / 2
                  , i = null;
                u.p = function(d) {
                    if (!(!o || !u.t)) {
                        for (let r of p.values())
                            if (r.t && r.canvas && r.e >= 0 && !r.frozen) {
                                if (r.manualLook) {
                                    o._w7(r.e, r.manualLook.x, r.manualLook.y);
                                    continue
                                }
                                r.look || (r.look = {
                                    x: a,
                                    y: c,
                                    tau: g()
                                });
                                let h = r.look
                                  , v = 1 - Math.exp(-d / h.tau);
                                h.x += (a - h.x) * v,
                                h.y += (c - h.y) * v;
                                let N = r.canvas.getBoundingClientRect(), st = N.left + N.width / 2, ot = N.top + N.height / 2, T = h.x - st, k = h.y - ot, _ = Math.sqrt(T * T + k * k), at = Math.min(window.innerWidth, window.innerHeight), S, E;
                                if (_ > 0) {
                                    let R = Math.min(_ / at, .7);
                                    S = T / _ * R,
                                    E = k / _ * R
                                } else
                                    S = 0,
                                    E = 0;
                                o._w7(r.e, S, -E)
                            }
                    }
                }
                ;
                let b = window.matchMedia("(pointer: coarse)").matches;
                u.N = !0,
                b || window.addEventListener("mousemove", d => {
                    a = d.clientX,
                    c = d.clientY
                }
                ),
                document.addEventListener("visibilitychange", () => {
                    if (document.visibilityState === "visible") {
                        let d = performance.now();
                        u.n = d,
                        u.c = d
                    }
                }
                )
            }
            y = !1
        }
        H.then(async t => {
            o = t,
            m = o._malloc(f * 4),
            document.readyState === "loading" && await new Promise(n => document.addEventListener("DOMContentLoaded", n, {
                once: !0
            })),
            await new Promise(n => setTimeout(n, 50)),
            await nt()
        }
        )
    }
    )();
}
)();
