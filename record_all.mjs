// 단계마다 따로 녹화(seg/stepNN.mp4)하고 이어 붙여 video_noaudio.mp4 를 만든다.
// 크롬이 긴 녹화 도중 죽는 일이 있어, 조각마다 새 크롬을 띄우고 실패한 조각만 다시 찍는다(최대 3번).
// 이미 끝난 조각(seg/stepNN.done)은 건너뛰므로 중단 후 다시 실행해도 이어서 한다.
// 사용법:  node record_all.mjs   →  이어서  python mix_audio.py
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const HERE = dirname(fileURLToPath(import.meta.url)), SEG = join(HERE, "seg");
mkdirSync(SEG, { recursive: true });
const n = readdirSync(join(HERE, "audio")).filter(f => /^step\d\d\.mp3$/.test(f)).length;
for (let k = 0; k < n; k++) {
  const nn = String(k).padStart(2, "0"), out = join(SEG, `step${nn}.mp4`), done = join(SEG, `step${nn}.done`);
  if (existsSync(done)) { console.log(`단계 ${k}: 이미 있음`); continue; }
  let ok = false;
  for (let tr = 1; tr <= 3 && !ok; tr++) {
    console.log(`단계 ${k} 녹화 (${tr}번째)`);
    const r = spawnSync("node", [join(HERE, "record.mjs"), out, "--from-step", String(k), "--to-step", String(k + 1)], { stdio: "inherit" });
    ok = r.status === 0;
  }
  if (!ok) { console.error(`단계 ${k} 녹화 실패 — 다시 실행하면 여기서부터 이어 합니다`); process.exit(1); }
  writeFileSync(done, "ok");
}
const list = join(SEG, "list.txt");
writeFileSync(list, Array.from({ length: n }, (_, k) => `file 'step${String(k).padStart(2, "0")}.mp4'`).join("\n"));
const r = spawnSync("ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-movflags", "+faststart", join(HERE, "video_noaudio.mp4")], { stdio: "inherit" });
if (r.status !== 0) process.exit(1);
console.log("이어 붙임: video_noaudio.mp4");
