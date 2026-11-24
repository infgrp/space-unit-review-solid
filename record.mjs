// 입체 풀이 페이지를 4K 60fps 영상(무음)으로 녹화한다.
// 페이지를 ?rec=1 로 열고, REC.shot() 으로 1/60 초씩 진행시키며 한 장씩 받아 ffmpeg 에 넘긴다(실시간이 아니므로 끊김 없음).
// 단계 길이는 audio/stepNN.mp3 길이로 정하고 timeline.json 에 적는다 → mix_audio.py 가 같은 시각에 음성을 깐다.
//
// 사용법:  node record.mjs [out.mp4] [--frames N(시험용)] [--w 3840 --h 2160] [--from-step K(그 단계부터, 앞은 그리지 않고 진행)] [--to-step M(M 단계 앞에서 끝)]
// 단계별로 나눠 녹화하고 이어 붙이려면 record_all.mjs 를 쓴다 (크롬이 중간에 죽어도 그 조각만 다시 찍는다)
import { spawn, execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync, readdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const OUT = resolve(args[0] && !args[0].startsWith("--") ? args[0] : join(HERE, "video_noaudio.mp4"));
const W = +opt("--w", 3840), H = +opt("--h", 2160), FPS = 60, MAXF = +opt("--frames", 0), FROM = +opt("--from-step", 0), TO = opt("--to-step", null);

// ── 크롬 (헤드리스, GPU)
const CH = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe"].find(p => existsSync(p));
const port = 9400 + Math.floor(Math.random() * 400);
const prof = mkdtempSync(join(tmpdir(), "rec-"));
const ch = spawn(CH, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, "--use-angle=d3d11", "--ignore-gpu-blocklist",
  `--window-size=${W},${H}`, "--force-device-scale-factor=1", "--hide-scrollbars", "--allow-file-access-from-files", "--enable-logging=stderr", "--v=0", "about:blank"], { stdio: ["ignore", "ignore", process.env.CHLOG ? (await import("node:fs")).openSync(process.env.CHLOG, "w") : "ignore"] });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws, id = 0; const pend = new Map();
for (let i = 0; i < 80 && !ws; i++) {
  try { const j = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); const pg = j.find(x => x.type === "page"); if (pg) { ws = new WebSocket(pg.webSocketDebuggerUrl); break; } } catch {}
  await sleep(200);
}
await new Promise(r => ws.onopen = r);   // 만든 직후 같은 틱에 걸어야 open 을 놓치지 않는다
// 크롬이 죽거나 멈추면 응답이 오지 않는다 → 60초 넘게 기다리면 오류로 끝낸다 (조용히 멈춰 있지 않도록)
const send = (method, params = {}) => new Promise(r => {
  const i = ++id;
  const to = setTimeout(() => { console.error(`응답 없음 (${method}) — 크롬이 멈춘 것 같습니다. 녹화를 중단합니다.`); try { ch.kill(); } catch {} process.exit(2); }, 60000);
  pend.set(i, v => { clearTimeout(to); r(v); });
  ws.send(JSON.stringify({ id: i, method, params }));
});
ws.onclose = () => { console.error("크롬 연결이 끊겼습니다. 녹화를 중단합니다."); process.exit(3); };
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); }
  if (m.method === "Runtime.exceptionThrown") console.log("EXC:", JSON.stringify(m.params.exceptionDetails).slice(0, 300)); };
const ev = async expr => (await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })).result.value;
await send("Runtime.enable"); await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: "file:///" + join(HERE, "index.html").replace(/\\/g, "/") + "?rec=1&pr=1&mute" });
for (let i = 0; i < 600 && !(await ev("!!(window.REC && REC.ready)")); i++) await sleep(250);
if (!(await ev("!!(window.REC && REC.ready)"))) { console.error("페이지 준비 실패"); ch.kill(); process.exit(1); }
console.log("페이지 준비됨:", await ev("innerWidth + 'x' + innerHeight + ' pr ' + devicePixelRatio"));

// ── 시간표: 단계마다 [카메라 이동 여유] + 해설 + [멈춤(문제)] + [끝 여유]  — 멈춤은 페이지의 HOLDS
const dur = f => parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString());
const mp3 = readdirSync(join(HERE, "audio")).filter(f => /^step\d\d\.mp3$/.test(f)).sort();
const LEAD0 = 2.4, LEAD = 1.0, TAIL = 1.6, LAST_TAIL = 5.0, MIN = 6;
const HOLDS = JSON.parse(await ev("JSON.stringify(window.HOLDS || [])"));
let t = 0; const steps = [];
mp3.forEach((f, i) => {
  const a = dur(join(HERE, "audio", f)), lead = i === 0 ? LEAD0 : LEAD, hold = HOLDS[i] || 0;
  const len = Math.max(MIN, lead + a + hold + (i === mp3.length - 1 ? LAST_TAIL : TAIL));
  steps.push({ step: i, start: +t.toFixed(3), voice: +(t + lead).toFixed(3), voiceLen: a, hold, len: +len.toFixed(3) });
  t += len;
});
const TOTAL = t;
writeFileSync(join(HERE, "timeline.json"), JSON.stringify({ fps: FPS, total: TOTAL, steps }, null, 1));
console.log(`길이 ${TOTAL.toFixed(1)}초 · ${Math.round(TOTAL * FPS)}장 · ${W}x${H}`);

// ── ffmpeg (JPEG 를 받아 H.264)
const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
  "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", "-movflags", "+faststart", OUT], { stdio: ["pipe", "inherit", "inherit"] });
const write = buf => new Promise(r => ff.stdin.write(buf) ? r() : ff.stdin.once("drain", r));

const N = MAXF || (TO !== null && +TO < steps.length ? Math.round(steps[+TO].start * FPS) : Math.round(TOTAL * FPS));
await ev("REC.intro()");
let si = 0; const t0 = Date.now();
// --from-step: 앞 구간은 그리지 않고 같은 순서로 시간만 흘린다 (상태가 똑같이 재현된다)
const F0 = FROM ? Math.round(steps[FROM].start * FPS) : 0;
for (let f = 0; f < F0;) {
  const next = si + 1 < steps.length ? Math.min(F0, Math.ceil(steps[si + 1].start * FPS)) : F0;
  if (next > f) { await ev(`REC.skip(${next - f})`); f = next; }
  if (f < F0 && si + 1 < steps.length && f / FPS >= steps[si + 1].start) { si++; await ev(`REC.go(${si})`); }
}
if (FROM) console.log(`${F0}장까지 건너뜀 (단계 ${si})`);
for (let f = F0; f < N; f++) {
  const time = f / FPS;
  while (si + 1 < steps.length && time >= steps[si + 1].start) { si++; await ev(`REC.go(${si})`); }
  const url = await ev("REC.shot(0.93)");
  await write(Buffer.from(url.slice(url.indexOf(",") + 1), "base64"));
  if (f % 300 === 0) { const el = (Date.now() - t0) / 1000, rate = (f + 1) / el; console.log(`${f}/${N} 장 · 단계 ${si} · ${rate.toFixed(2)} 장/초 · 남은 시간 약 ${((N - f) / rate / 60).toFixed(1)}분`); }
}
ff.stdin.end();
await new Promise(r => ff.on("close", r));
ch.kill();
console.log("완료:", OUT, `(${((Date.now() - t0) / 60000).toFixed(1)}분)`);
process.exit(0);
