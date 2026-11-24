"""index.html 에 쓰인 글자만 담은 글꼴 부분집합을 만들어 base64 로 끼워 넣는다.

사용법:
    python build_fonts.py <NotoSansKR[wght].ttf> <GowunBatang-Bold.ttf>

두 글꼴 모두 SIL Open Font License (google/fonts 저장소의 ofl/ 폴더).
문장을 고친 뒤에는 이 스크립트를 다시 실행해야 새 글자가 3D 로 보인다.
"""
import base64
import io
import re
import sys
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.subset import Subsetter, Options
from fontTools.varLib.instancer import instantiateVariableFont

HERE = Path(__file__).resolve().parent
HTML = HERE / "index.html"
PAT = re.compile(r'const (FONT_BODY|FONT_TITLE) = "[^"]*";')


def subset(font: TTFont, chars: set[str]) -> str:
    opt = Options()
    opt.layout_features = []
    opt.hinting = False
    opt.notdef_outline = True
    opt.name_IDs = ["*"]
    sub = Subsetter(opt)
    sub.populate(unicodes={ord(c) for c in chars})
    sub.subset(font)
    buf = io.BytesIO()
    font.save(buf)
    return base64.b64encode(buf.getvalue()).decode("ascii")


def main() -> None:
    body_src, title_src = sys.argv[1], sys.argv[2]
    html = HTML.read_text(encoding="utf-8")
    text = PAT.sub("", html)
    # 내용과 그림은 따로 된 파일에 있다
    for extra in ("content.js", "figs.js"):
        if (HERE / extra).exists():
            text += (HERE / extra).read_text(encoding="utf-8")
    chars = {c for c in text if c >= " "} | {chr(i) for i in range(32, 127)}

    body = TTFont(body_src)
    if "fvar" in body:
        body = instantiateVariableFont(body, {"wght": 700})
    title = TTFont(title_src)

    b64 = {"FONT_BODY": subset(body, chars), "FONT_TITLE": subset(title, chars)}
    html = PAT.sub(lambda m: f'const {m.group(1)} = "{b64[m.group(1)]}";', html)
    HTML.write_text(html, encoding="utf-8")
    hangul = sum(1 for c in chars if "가" <= c <= "힣")
    print(f"글자 {len(chars)}개 (한글 {hangul}) · 본문 {len(b64['FONT_BODY'])//1024}KB · 제목 {len(b64['FONT_TITLE'])//1024}KB")


if __name__ == "__main__":
    main()
