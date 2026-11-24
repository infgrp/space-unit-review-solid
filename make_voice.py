"""단계별 해설 음성(mp3)을 Azure TTS 로 만든다.

사용법:  python make_voice.py            (바뀐 대본만 다시 만든다)
         python make_voice.py --all      (전부 다시 만든다)
         (python 이 깨진 PC 에서는 python 대신 py -3.12)

환경변수 AZURE_SUBSCRIPTION_KEY, AZURE_SERVICE_REGION 이 필요하다. 키는 만들 때만 쓰고 페이지에는 들어가지 않는다.
결과: audio/step00.mp3 ~ (단계 수만큼), audio/manifest.json (대본 해시 → 바뀐 것만 다시 만들기)
"""
import hashlib
import json
import os
import sys
import time
import urllib.request
from pathlib import Path
from xml.sax.saxutils import escape

VOICE = "ko-KR-HyunsuMultilingualNeural"
RATE = "0%"

# 수식은 칠판을 읽듯 말로 바꾼다 (f(x) → 에프 엑스, f'(x) → 에프 프라임 엑스, ln|t| → 엘엔 절댓값 티, 25/27 → 27분의 25)
# 한 줄 = 한 단계 (STEPS 와 같은 개수, 같은 순서). 그래프를 가리킬 때는 "위쪽 분홍색 곡선", "점선처럼" 처럼 화면 말을 쓴다.
def _load_script():
    """content.js 의 단계별 say 를 순서대로 (한 줄 = 한 단계)."""
    import subprocess  # noqa: PLC0415
    here = Path(__file__).resolve().parent if "__file__" in globals() else Path.cwd()
    js = "require('./figs.js');require('./content.js');console.log(JSON.stringify(globalThis.UNIT.blocks.flatMap(b=>b.parts.map(p=>p.say))))"
    out = subprocess.run(["node", "-e", js], cwd=here, capture_output=True, check=True).stdout.decode("utf-8")
    return json.loads(out)


SCRIPT = _load_script()


def tts(text: str, out: Path) -> None:
    key, region = os.environ["AZURE_SUBSCRIPTION_KEY"], os.environ["AZURE_SERVICE_REGION"]
    ssml = (f'<speak version="1.0" xml:lang="ko-KR"><voice name="{VOICE}">'
            f'<prosody rate="{RATE}">{escape(text)}</prosody></voice></speak>').encode("utf-8")
    req = urllib.request.Request(
        f"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1", data=ssml, method="POST",
        headers={"Ocp-Apim-Subscription-Key": key, "Content-Type": "application/ssml+xml",
                 "X-Microsoft-OutputFormat": "audio-24khz-96kbitrate-mono-mp3", "User-Agent": "latex2three3d-voice"})
    for attempt in range(6):   # 학교망 일시 오류 대비 재시도
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                out.write_bytes(r.read()); return
        except Exception as e:  # noqa: BLE001
            if attempt == 5: raise
            wait = 3 * 1.5 ** attempt
            print(f"  재시도 {attempt + 1} ({wait:.0f}초 뒤): {e}")
            time.sleep(wait)


def main() -> None:
    here = Path(__file__).resolve().parent
    adir = here / "audio"; adir.mkdir(exist_ok=True)
    mf = adir / "manifest.json"
    old = json.loads(mf.read_text(encoding="utf-8")) if mf.exists() else {}
    new = {}
    for i, text in enumerate(SCRIPT):
        name = f"step{i:02d}.mp3"; h = hashlib.sha1((VOICE + RATE + text).encode()).hexdigest()[:12]
        new[name] = h
        if "--all" not in sys.argv and old.get(name) == h and (adir / name).exists():
            continue
        tts(text, adir / name)
        print(f"{name}  {(adir / name).stat().st_size // 1024} KB")
    mf.write_text(json.dumps(new, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
