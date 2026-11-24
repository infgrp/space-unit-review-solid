"""녹화한 무음 영상에 해설 음성 + 배경음악(직접 합성)을 깔고 자막(.srt)을 만든다.

사용법:  python mix_audio.py [video_noaudio.mp4] [대단원평가_4K.mp4]
필요: timeline.json (record.mjs 가 만든다), audio/stepNN.mp3, ffmpeg, numpy
"""
import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
SR = 48000


def load_mp3(p: Path) -> np.ndarray:
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def lowpass(x: np.ndarray, fc: float) -> np.ndarray:
    a = np.exp(-2 * np.pi * fc / SR)
    from scipy.signal import lfilter  # noqa: PLC0415
    return lfilter([1 - a], [1, -a], x)


def bgm(total: float) -> np.ndarray:
    """잔잔하지만 장엄한 패드: A단조 Am–F–C–G (한 화음 8초) + 낮은 지속음 + 가끔 울리는 종소리."""
    n = int(total * SR)
    t = np.arange(n) / SR
    out = np.zeros((n, 2))
    chords = [[57, 60, 64], [53, 57, 60], [48, 55, 64], [55, 59, 62]]   # MIDI
    hz = lambda m: 440 * 2 ** ((m - 69) / 12)
    seg = 8.0
    rng = np.random.default_rng(7)
    for k in range(int(total / seg) + 2):
        t0 = k * seg - 1.0
        i0, i1 = max(0, int(t0 * SR)), min(n, int((t0 + seg + 2.5) * SR))
        if i0 >= i1:
            continue
        tt = t[i0:i1] - t0
        env = np.clip(tt / 2.2, 0, 1) * np.clip((seg + 2.5 - tt) / 2.5, 0, 1)
        env = env ** 1.5
        for j, m in enumerate(chords[k % 4]):
            f = hz(m)
            for det, pan in ((-0.12, 0.25), (0.12, 0.75)):
                ph = rng.uniform(0, 6.28)
                w = np.sin(2 * np.pi * (f + det) * tt + ph) + 0.35 * np.sin(2 * np.pi * 2 * (f + det) * tt) + 0.12 * np.sin(2 * np.pi * 3 * (f + det) * tt)
                s = w * env * 0.05
                out[i0:i1, 0] += s * (1 - pan)
                out[i0:i1, 1] += s * pan
        # 베이스
        fb = hz(chords[k % 4][0] - 24)
        sb = np.sin(2 * np.pi * fb * tt) * env * 0.09
        out[i0:i1] += sb[:, None]
        # 종소리 (화음 바뀔 때 두 번)
        for dt_, m in ((1.0, chords[k % 4][2] + 12), (4.6, chords[k % 4][1] + 12)):
            b0 = int((t0 + dt_) * SR)
            if 0 <= b0 < n:
                L = min(n - b0, int(4 * SR))
                tb = np.arange(L) / SR
                bell = (np.sin(2 * np.pi * hz(m) * tb) + 0.4 * np.sin(2 * np.pi * hz(m) * 2.76 * tb)) * np.exp(-tb * 1.4) * 0.035
                out[b0:b0 + L, 0] += bell * 0.6
                out[b0:b0 + L, 1] += bell * 0.4
    # 부드럽게 + 앞뒤 페이드
    out[:, 0] = lowpass(out[:, 0], 2400)
    out[:, 1] = lowpass(out[:, 1], 2400)
    fade = np.clip(t / 3.0, 0, 1) * np.clip((total - t) / 4.0, 0, 1)
    return out * fade[:, None]


def srt_time(s: float) -> str:
    ms = int(round(s * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


def main() -> None:
    vin = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "video_noaudio.mp4"
    vout = Path(sys.argv[2]) if len(sys.argv) > 2 else HERE / "대단원평가_4K.mp4"
    tl = json.loads((HERE / "timeline.json").read_text(encoding="utf-8"))
    total = tl["total"]
    n = int(total * SR)
    voice = np.zeros(n)
    for st in tl["steps"]:
        v = load_mp3(HERE / "audio" / f"step{st['step']:02d}.mp3")
        i0 = int(st["voice"] * SR)
        voice[i0:i0 + len(v)] += v[: n - i0]
    music = bgm(total)
    # 해설이 나올 때 음악을 조금 낮춘다 (덕킹)
    k = int(0.4 * SR)                                   # 0.4초 이동 평균 (누적합으로 빠르게)
    c = np.concatenate([[0.0], np.cumsum((np.abs(voice) > 0.02).astype(float))])
    idx = np.arange(n)
    act = (c[np.minimum(idx + k // 2, n)] - c[np.maximum(idx - k // 2, 0)]) / k
    duck = 1.0 - 0.45 * np.clip(act * 4, 0, 1)
    mix = music * duck[:, None] * 0.9 + voice[:, None]
    peak = np.max(np.abs(mix))
    if peak > 0.97:
        mix *= 0.97 / peak
    wav = HERE / "mix.wav"
    pcm = (mix * 32767).astype("<i2")
    import wave  # noqa: PLC0415
    with wave.open(str(wav), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())

    # 자막: make_voice.py 의 대본을 문장 단위로 쪼개 글자 수에 비례해 시간을 나눈다
    ns: dict = {}
    src = (HERE / "make_voice.py").read_text(encoding="utf-8")
    exec(src.split("def tts")[0], ns)  # noqa: S102 — 이 폴더의 대본만 읽는다
    lines, k = [], 1
    # 읽기용 발음 → 화면 기호: 글자 이름이 둘 이상 붙어 있거나(에이비 → AB), 점·직선 같은 말 뒤의 한 글자(점 오 → 점 O)
    LET = [("에이치", "H"), ("에이", "A"), ("에프", "F"), ("아이", "I"), ("비", "B"), ("씨", "C"), ("디", "D"), ("이", "E"),
           ("지", "G"), ("엠", "M"), ("엔", "N"), ("오", "O"), ("피", "P"), ("큐", "Q")]
    KEY = ("점 ", "직선 ", "선분 ", "평면 ", "삼각형 ", "각 ", "모서리 ", "꼭짓점 ", "면 ", "사각형 ", "사면체 ", "정사면체 ", "정육면체 ", "직육면체 ")
    GREEK = [("알파", "α"), ("베타", "β"), ("감마", "γ"), ("세타", "θ"), ("직선 엘", "직선 l")]
    hangul = lambda c: "가" <= c <= "힣"  # noqa: E731

    def sym(s: str) -> str:
        for a, b in GREEK:
            s = s.replace(a, b)
        out, i = [], 0
        while i < len(s):
            j, toks = i, []
            while True:
                for k, v in LET:
                    if s.startswith(k, j):
                        toks.append(v); j += len(k); break
                else:
                    break
            if len(toks) >= 2 and toks[-1] == "E" and not (j < len(s) and hangul(s[j])):   # 끝의 "이"는 조사 (엠이 → 엠 + 이)
                toks.pop(); j -= 1
            if toks and (i == 0 or not hangul(s[i - 1])) and (len(toks) >= 2 or s[:i].endswith(KEY)):
                out.append("".join(toks)); i = j
            else:
                out.append(s[i]); i += 1
        s = "".join(out)
        s = re.sub(r"([A-Za-zαβγ]) 프라임", lambda m: m.group(1) + "′", s)
        return s
    for st, text in zip(tl["steps"], [sym(x) for x in ns["SCRIPT"]]):
        sents = [s.strip() for s in re.split(r"(?<=[.?!])\s+", text) if s.strip()]
        w = np.array([len(s) for s in sents], float); w /= w.sum()
        t0 = st["voice"]
        for s, f in zip(sents, w):
            t1 = t0 + f * st["voiceLen"]
            lines.append(f"{k}\n{srt_time(t0)} --> {srt_time(t1)}\n{s}\n"); k += 1; t0 = t1
    srt = vout.with_suffix(".srt")
    srt.write_text("\n".join(lines), encoding="utf-8")

    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(vin), "-i", str(wav), "-c:v", "copy", "-c:a", "aac", "-b:a", "256k",
                    "-shortest", "-movflags", "+faststart", str(vout)], check=True)
    wav.unlink()
    print("완료:", vout, "·", srt.name)


if __name__ == "__main__":
    main()
