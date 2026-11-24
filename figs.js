/* 대단원 평가하기 — 그림 모음 (형식은 공간도형·공간좌표의 figs.js 와 같다)
   입체 그림은 TikZ 좌표 그대로, 좌표 그림은 M(x, y, z) = TikZ (y, z, x) */
(function (root) {
  "use strict";
  const add = (a, b) => a.map((v, i) => v + b[i]), sub = (a, b) => a.map((v, i) => v - b[i]), mul = (a, k) => a.map(v => v * k);
  const mid = (a, b) => mul(add(a, b), 0.5), lerp = (a, b, t) => add(a, mul(sub(b, a), t)), len = a => Math.hypot(...a), nrm = a => mul(a, 1 / len(a));
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const seg = (a, b, o = {}) => ["seg", a, b, o], pt = (a, o = {}) => ["pt", a, o], lab = (a, t, o = {}) => ["lab", a, t, o];
  const plane = (ps, o = {}) => ["plane", ps, o], face = (ps, o = {}) => ["face", ps, o], ra = (c, u, v, o = {}) => ["ra", c, u, v, o];
  const arc = (c, u, v, o = {}) => ["arc", c, u, v, o], tick = (a, b, o = {}) => ["tick", a, b, o], arrow = (a, b, o = {}) => ["arrow", a, b, o];
  const circ = (c, n, r, o = {}) => ["circ", c, n, r, o], ell = (c, u, v, o = {}) => ["ell", c, u, v, o], sph = (c, r, o = {}) => ["sphere", c, r, o], cyl = (c, r, h, o = {}) => ["cyl", c, r, h, o];
  const R = s => `$\\rm ${s}$`;
  const M = (x, y, z) => [y, z, x];
  function solid(P, edges, labs, o = {}) {
    const it = [];
    if (o.faces) for (const f of o.faces) it.push(face(f.split(""), { c: o.fc || "b", op: o.fop ?? 0.1 }));
    for (const e of edges) it.push(seg(e[0], e[1], { w: 0.075 }));
    for (const [n, an] of Object.entries(labs)) it.push(lab(n, R(n), { o: an }));
    return it;
  }
  const BOX_E = ["AB", "BC", "CD", "DA", "EF", "FG", "GH", "HE", "AE", "BF", "CG", "DH"], BOX_L = { A: "l", B: "br", C: "r", D: "l", E: "l", F: "r", G: "r", H: "al" };
  const box = (w, h, d) => ({ A: [0, h, d], B: [w, h, d], C: [w, h, 0], D: [0, h, 0], E: [0, 0, d], F: [w, 0, d], G: [w, 0, 0], H: [0, 0, 0] });
  const boxF = ["ABCD", "EFGH", "ABFE", "DCGH", "ADHE", "BCGF"];
  const cuboid = (w, h, d, extra = [], P0 = {}) => { const P = Object.assign(box(w, h, d), P0); return { P, size: 18, I: [...solid(P, BOX_E, BOX_L, { faces: boxF, fop: 0.06 }), ...extra] }; };
  const octa = () => { const h = Math.sqrt(8); return { A: [0, h, 0], B: [-h, 0, 0], C: [0, 0, h], D: [h, 0, 0], E: [0, 0, -h], F: [0, -h, 0] }; };
  const OCT_E = ["AB", "AC", "AD", "AE", "FB", "FC", "FD", "FE", "BC", "CD", "DE", "EB"], OCT_L = { A: "a", B: "l", C: "bl", D: "r", E: "ar", F: "b" };
  const tetra = (a = 4, t = 60) => { const h = Math.sqrt(6) * a / 3, d = Math.sqrt(3) * a / 3, c = x => Math.cos(x * Math.PI / 180), s = x => Math.sin(x * Math.PI / 180);
    return { A: [0, h, 0], B: [d * c(t + 120), 0, d * s(t + 120)], C: [d * c(t), 0, d * s(t)], D: [d * c(t + 240), 0, d * s(t + 240)] }; };
  function axes(x1 = 4, y1 = 4, z1 = 4, x0 = 0, y0 = 0, z0 = 0) {
    return [arrow(M(x0, 0, 0), M(x1, 0, 0), { w: 0.06 }), arrow(M(0, y0, 0), M(0, y1, 0), { w: 0.06 }), arrow(M(0, 0, z0), M(0, 0, z1), { w: 0.06 }),
      lab(M(x1 + 0.5, 0, 0), "$x$", {}), lab(M(0, y1 + 0.5, 0), "$y$", {}), lab(M(0, 0, z1 + 0.5), "$z$", {}), lab(M(0, 0, 0), R("O"), { o: "al" })];
  }
  const F = {};
  F.intro = () => { const P = box(2, 2, 2); return { P, size: 18, I: [...solid(P, BOX_E, BOX_L, { faces: boxF, fop: 0.06 }), face(["A", "F", "C"], { c: "m", op: 0.3 }), sph([3.6, 2.6, -0.5], 0.7, { c: "g", op: 0.35 })] }; };
  F.lines = () => ({ P: { P: [2.5, 1.8, -1.5] }, size: 18, I: [plane([[0, 0, 0], [5, 0, 0], [6.5, 0, -3.5], [1.5, 0, -3.5]], { c: "y", op: 0.22 }), seg([0.8, 0, -1], [4.8, 0, -1], { c: "b" }), seg([2, -1.6, -2.6], [3.4, 2.4, -2.2], { c: "m" }), pt("P"), lab("P", R("P"), { o: "a" })] });
  F.octAC = (extra = []) => { const P = octa(); return { P, size: 18, I: [...solid(P, OCT_E, OCT_L, { faces: ["ABF", "ADF"], fop: 0.1 }), seg("A", "C", { c: "m", w: 0.11 }), ...extra] }; };
  F.planes3 = () => ({ P: {}, size: 18, I: [["n", 0], ["b", 1.2], ["y", 2.4]].map(([c, y]) => plane([[-2, y, 0], [2, y, 0], [2, y, 2.5], [-2, y, 2.5]], { c, op: 0.2 })).concat([seg([-1.5, 3.4, 1], [1.5, 3.4, 1.5], { c: "b" }), seg([-1, 3.6, 2], [1.5, 3.6, 0.5], { c: "m" })]) });
  F.cubeFHBG = () => cuboid(2, 2, 2, [seg("F", "H", { c: "m", w: 0.1 }), seg("B", "G", { c: "b", w: 0.1 })]);
  F.cuboidMF = () => { const P = box(4, 8, 4); P.M = mid(P.A, P.C);
    return cuboid(4, 8, 4, [seg("A", "C", { w: 0.06 }), seg("M", "F", { c: "m", w: 0.1 }), seg("C", "G", { c: "b", w: 0.1 }), pt("M"), lab("M", R("M"), { o: "al" }), tick("A", "M"), tick("M", "C"),
      lab(mid(P.C, P.G), "$8$", { o: "r", c: "g" }), lab(mid(P.G, P.F), "$4$", { o: "r", c: "g" }), lab(mid(P.F, P.E), "$4$", { o: "b", c: "g" })], { M: P.M }); };
  F.tp = () => { const u = nrm([1, 0, 1]), v = nrm([1, 0, -1]), H = [3, 0, 3], O = add(H, mul(v, 4)), Pp = add(O, [0, Math.sqrt(12), 0]), A = add(H, mul(u, -6)), B = add(H, mul(u, 2.4));
    return { P: { H, O, P: Pp, A, B }, size: 20, I: [plane([[-2.4, 0, -2.4], [-2.4, 0, 7], [8.5, 0, 7], [8.5, 0, -2.4]], { c: "y", op: 0.2 }), lab([8.8, 0, 6.6], "$\\alpha$", {}),
      seg("A", "B", { c: "g" }), seg("H", "O"), seg("O", "P"), seg("H", "P"), seg("A", "P", { c: "b" }), ...["A", "B", "H", "O", "P"].map(n => pt(n)),
      lab("A", R("A"), { o: "l" }), lab("B", R("B"), { o: "r" }), lab("H", R("H"), { o: "bl" }), lab("O", R("O"), { o: "b" }), lab("P", R("P"), { o: "a" }),
      lab(mid(H, O), "$4$", { o: "b", c: "g" }), lab(mid(A, H), "$6$", { o: "b", c: "g" }), lab(mid(A, Pp), "$8$", { o: "al", c: "g" }), ra("O", "P", "H"), ra("H", "O", "B")] }; };
  F.isoD = () => { const A = [0, 0, -4], B = [-5, 0, 8], C = [5, 0, 8], D = [0, 4, -4];
    return { P: { A, B, C, D }, size: 20, I: [plane([[-8, 0, -7], [8, 0, -7], [8, 0, 10], [-8, 0, 10]], { c: "y", op: 0.18 }), lab([8.6, 0, 9.5], "$\\alpha$", {}),
      face(["A", "B", "C"], { c: "b", op: 0.25 }), face(["D", "B", "C"], { c: "m", op: 0.25 }), ...[["A", "B"], ["B", "C"], ["C", "A"], ["D", "B"], ["D", "C"]].map(([p, q]) => seg(p, q, { w: 0.07 })),
      seg("A", "D", { c: "r", w: 0.09 }), seg("D", [0, 6.5, -4], { c: "r", w: 0.06, dash: true }), lab([0.4, 7, -4], "$\\Cr{l}$", {}), ra("A", "D", "B"),
      ...["A", "B", "C", "D"].map(n => pt(n)), lab("A", R("A"), { o: "bl" }), lab("B", R("B"), { o: "l" }), lab("C", R("C"), { o: "r" }), lab("D", R("D"), { o: "ar" }),
      lab(mid(A, B), "$13$", { o: "l", c: "g" }), lab(mid(A, C), "$13$", { o: "r", c: "g" }), lab(mid(B, C), "$10$", { o: "b", c: "g" }), lab(mid(A, D), "$4$", { o: "l", c: "g" })] }; };
  F.tetraMBC = () => { const P = tetra(4, 60); P.M = mid(P.A, P.D);
    return { P, size: 18, I: [...solid(P, ["AB", "AC", "AD", "BC", "CD", "DB"], { A: "a", B: "l", C: "b", D: "r" }), face(["M", "B", "C"], { c: "m", op: 0.3 }), seg("M", "B", { c: "m" }), seg("M", "C", { c: "m" }),
      face(["A", "B", "C"], { c: "b", op: 0.15 }), pt("M"), lab("M", R("M"), { o: "ar" }), tick("A", "M"), tick("M", "D")] }; };
  F.twoPlanesXY = () => { const P = { X: [0, 0, 0], Y: [6, 0, 0], A: [2, 0, 0], B: [6, 3, 1.5], C: [6, 0, 1.5] };
    return { P, size: 20, I: [plane([[2, 4, 2], [0, 0, 0], [6, 0, 0], [8, 4, 2]], { c: "b", op: 0.2 }), plane([[0, 0, 0], [3, 0, 4], [9, 0, 4], [6, 0, 0]], { c: "n", op: 0.2 }),
      seg("X", "Y", { c: "g", w: 0.1 }), seg("A", "B", { c: "m" }), seg("B", "C", { c: "b" }), ra("C", "B", [6, 0, 3]), ...["A", "B", "C"].map(n => pt(n)),
      lab("X", R("X"), { o: "l" }), lab("Y", R("Y"), { o: "r" }), lab("A", R("A"), { o: "b" }), lab("B", R("B"), { o: "a" }), lab("C", R("C"), { o: "b" }),
      lab([7.6, 3.6, 2], "$\\alpha$", {}), lab([8.6, 0.3, 4], "$\\beta$", {}), lab(mid(P.A, P.B), "$6$", { o: "al", c: "g" }), lab(mid(P.B, P.C), "$3$", { o: "r", c: "g" }), arc("A", "Y", "B", { r: 0.8, c: "g" })] }; };
  F.cylCut = () => ({ P: {}, size: 18, I: [cyl([0, 0, 0], 2, 6, { c: "b", op: 0.18 }), circ([0, 0, 0], [0, 1, 0], 2, { c: "b" }),
    ell([0, 3, 0], [2, 2 * Math.sqrt(3), 0], [0, 0, 2], { fill: true, c: "m" }), lab([3.2, 5.5, 0], "$60^\\circ$", { c: "g" })] });
  F.cuboidACF = () => { const P = box(2, 4, 2);
    return cuboid(2, 4, 2, [face(["A", "C", "F"], { c: "n", op: 0.28 }), seg("A", "C", { c: "n" }), seg("C", "F", { c: "n" }), seg("F", "A", { c: "n" }), face(["E", "F", "G"], { c: "m", op: 0.35 }),
      lab(mid(P.A, P.D), "$2$", { o: "l", c: "g" }), lab(mid(P.A, P.B), "$2$", { o: "a", c: "g" }), lab(mid(P.E, P.A), "$4$", { o: "l", c: "g" })]); };
  F.cubePQR = () => { const P = box(4, 4, 4); P.P = [1, 4, 4]; P.Q = [3, 4, 0]; P.R = [3, 0, 4];
    return cuboid(4, 4, 4, [face(["P", "Q", "R"], { c: "m", op: 0.3 }), seg("P", "Q", { c: "m" }), seg("Q", "R", { c: "m" }), seg("R", "P", { c: "m" }), face(["B", "F", "G", "C"], { c: "y", op: 0.25 }),
      ...["P", "Q", "R"].map(n => pt(n)), lab("P", R("P"), { o: "al" }), lab("Q", R("Q"), { o: "a" }), lab("R", R("R"), { o: "b" })], { P: P.P, Q: P.Q, R: P.R }); };
  F.pts = (list, segs = [], ax = [5, 6, 6, -3, -4, -3], extra = []) => {
    const P = {}, I = [];
    for (const [n, x, y, z, an, t] of list) { P[n] = M(x, y, z); I.push(pt(n), lab(n, R(t || `${n}(${x},\\,${y},\\,${z})`), { o: an || "a", sz: 1.25 })); }
    for (const [p, q, c] of segs) I.push(seg(p, q, { c: c || "b", w: 0.08 }));
    return { P, size: 20, I: [...axes(...ax), ...I, ...extra] };
  };
  F.cubeFI = () => { const P = box(2, 2, 2); P.I = lerp(P.A, P.G, 1 / 3);
    return cuboid(2, 2, 2, [seg("A", "G", { c: "b" }), seg("I", "F", { c: "m", w: 0.1 }), pt("I"), lab("I", R("I"), { o: "a" }), lab(mid(P.E, P.A), "$3$", { o: "l", c: "g" })], { I: P.I }); };
  F.sphereAt = (x, y, z, r, extra = [], ax) => ({ P: { C: M(x, y, z) }, size: 20, I: [...axes(...(ax || [Math.max(4, x + r + 1), Math.max(4, y + r + 1), Math.max(4, z + r + 1), Math.min(-2, x - r - 1), Math.min(-2, y - r - 1), Math.min(-2, z - r - 1)])),
    sph(M(x, y, z), r, { c: "y", op: 0.22 }), circ(M(x, y, z), [0, 1, 0], r, { c: "y" }), pt("C"), ...extra] });
  F.sphereY = () => F.sphereAt(-1, 1, 2, Math.sqrt(14), [lab(M(-1, 1, 2), R("C(-1,\\,1,\\,2)"), { o: "b" }), seg(M(0, -2, 0), M(0, 4, 0), { c: "m", w: 0.12 })]);
  F.cone = () => { const C = M(3, 1, -2), r = 4, rc = Math.sqrt(12), apex = M(3, 1, -6);
    return { P: { C, A: apex }, size: 20, I: [...axes(8, 6, 4, -2, -4, -7), sph(C, r, { c: "y", op: 0.18 }), circ(M(3, 1, 0), [0, 1, 0], rc, { fill: true, c: "b" }), pt("C"),
      seg("A", M(3 + rc, 1, 0), { c: "m", w: 0.07 }), seg("A", M(3 - rc, 1, 0), { c: "m", w: 0.07 }), seg("A", M(3, 1 + rc, 0), { c: "m", w: 0.07 }), seg("A", M(3, 1 - rc, 0), { c: "m", w: 0.07 }), pt("A", { c: "m" })] }; };
  F.tangentSphere = () => { const r = 5; return F.sphereAt(r, r, r, r, [pt(M(1, 9, 10), { c: "m" }), lab(M(1, 9, 10), R("(1,\\,9,\\,10)"), { o: "a" }),
    plane([M(0, 0, 0), M(12, 0, 0), M(12, 12, 0), M(0, 12, 0)], { c: "n", op: 0.1 })], [12, 12, 12, 0, 0, 0]); };
  F.sphereA = () => F.sphereAt(1, 3, 3, Math.sqrt(9 - 6 + 18), [plane([M(-4, -2, 0), M(6, -2, 0), M(6, 8, 0), M(-4, 8, 0)], { c: "n", op: 0.12 })], [7, 9, 9, -4, -2, -2]);
  F.octG = () => { const P = octa(); return { P, size: 18, I: [...solid(P, OCT_E, OCT_L, { faces: [], fop: 0.1 }), face(["A", "B", "C"], { c: "m", op: 0.3 }), face(["B", "C", "D", "E"], { c: "y", op: 0.2 }),
    face(["O0", "B", "C"].map(n => n === "O0" ? [0, 0, 0] : n), { c: "b", op: 0.35 }), lab(mid(P.A, P.B), "$4$", { o: "al", c: "g" })] }; };
  F.quadABCD = () => { const a = 0.6, b = a + Math.sqrt(33);
    return F.pts([["A", 1, 0, a, "l", "A(1,\\,0,\\,a)"], ["B", 3, 0, a, "l", "B(3,\\,0,\\,a)"], ["C", 3, 4, b, "r", "C(3,\\,4,\\,b)"], ["D", 1, 4, b, "r", "D(1,\\,4,\\,b)"]],
      [["A", "B"], ["B", "C"], ["C", "D"], ["D", "A"]], [5, 6, 8, -1, -1, -1], [face([M(1, 0, a), M(3, 0, a), M(3, 4, b), M(1, 4, b)], { c: "b", op: 0.3 })]); };
  F.twoSpheres = () => { const n = nrm([1, 1, 1]), Pp = add([1, 1, 1], mul(n, 2)), t1 = nrm(cross(n, [0, 0, 1])), t2 = cross(n, t1);
    const Pm = M(...Pp), q = (u, v) => M(...add(Pp, add(mul(t1, u), mul(t2, v))));
    return { P: { P: Pm }, size: 20, I: [...axes(6, 6, 6, -5, -5, -5), sph(M(0, 0, 0), 4, { c: "b", op: 0.14 }), sph(M(1, 1, 1), 2, { c: "y", op: 0.3 }),
      plane([q(-4, -4), q(4, -4), q(4, 4), q(-4, 4)], { c: "m", op: 0.18 }), pt("P", { c: "m" }), lab("P", R("P"), { o: "a" })] }; };

  root.FIGS = F;
})(typeof window !== "undefined" ? window : globalThis);
