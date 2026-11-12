"""新增圖片：python3 scripts/make_image.py 原始圖檔 名稱 [寬度...]
例：python3 scripts/make_image.py ~/photo.jpg test-drop 600 1200
會在 src/assets/img/ 產生 名稱-寬度.webp 與 名稱.jpg，並更新 src/_data/imgs.json。
"""
import json, sys
from PIL import Image
src, name, *ws = sys.argv[1:]
ws = [int(w) for w in ws] or [600, 1200]
im = Image.open(src).convert("RGB"); W, H = im.size
out = []
for w in ws:
    w = min(w, W); out.append(w)
    im.resize((w, round(H * w / W)), Image.LANCZOS).save(f"src/assets/img/{name}-{w}.webp", "WEBP", quality=80, method=6)
big = out[-1]; bh = round(H * big / W)
im.resize((big, bh), Image.LANCZOS).save(f"src/assets/img/{name}.jpg", "JPEG", quality=82, optimize=True, progressive=True)
p = "src/_data/imgs.json"; meta = json.load(open(p))
meta[name] = {"w": big, "h": bh, "widths": out}
json.dump(meta, open(p, "w"), indent=1)
print("ok", name, meta[name])
