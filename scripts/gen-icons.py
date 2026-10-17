"""Draws Bloom's app icons (a blush book-cloth journal with a satin ribbon bookmark, on oat paper).
    python3 scripts/gen-icons.py
Writes public/icons/icon-192.png, icon-512.png, icon-maskable-512.png and src/app/apple-icon.png."""
from PIL import Image, ImageDraw, PngImagePlugin

OAT = (244, 236, 223)
CLOTH = (235, 192, 179)
SPINE = (219, 166, 153)
CREASE = (184, 131, 122)
RIBBON = (140, 47, 85)
RIBBON_SHADE = (106, 33, 65)
SOURCE = "Drawn procedurally by scripts/gen-icons.py (PIL shapes, DESIGN.md palette). No external imagery."

def draw(size: int, safe: float) -> Image.Image:
    s = 4  # supersample for smooth edges
    W = size * s
    img = Image.new("RGB", (W, W), OAT)
    d = ImageDraw.Draw(img)
    m = W * (1 - safe) / 2           # margin so maskable crops keep the mark
    w = W - 2 * m
    # The book: a nearly square board with a folded spine on the left.
    bx0, by0, bx1, by1 = m + w * 0.18, m + w * 0.12, m + w * 0.82, m + w * 0.88
    r = w * 0.035
    d.rounded_rectangle((bx0, by0, bx1, by1), radius=r, fill=CLOTH)
    sw = (bx1 - bx0) * 0.14
    d.rounded_rectangle((bx0, by0, bx0 + sw, by1), radius=r, fill=SPINE)
    d.rectangle((bx0 + sw - w * 0.012, by0, bx0 + sw, by1), fill=CREASE)
    # The satin ribbon: hangs from the top edge past the bottom, with a swallowtail cut.
    rx0 = bx0 + (bx1 - bx0) * 0.58
    rw = (bx1 - bx0) * 0.13
    top = by0 - w * 0.02
    bottom = by1 + w * 0.08
    notch = rw * 0.75
    d.polygon([(rx0, top), (rx0 + rw, top), (rx0 + rw, bottom), (rx0 + rw / 2, bottom - notch), (rx0, bottom)], fill=RIBBON)
    d.rectangle((rx0 + rw * 0.72, top, rx0 + rw, bottom - notch * 0.6), fill=RIBBON_SHADE)
    return img.resize((size, size), Image.LANCZOS)

def save(img: Image.Image, path: str) -> None:
    meta = PngImagePlugin.PngInfo()
    meta.add_text("Source", SOURCE)
    img.save(path, pnginfo=meta, optimize=True)
    print("wrote", path)

save(draw(192, 0.92), "public/icons/icon-192.png")
save(draw(512, 0.92), "public/icons/icon-512.png")
save(draw(512, 0.72), "public/icons/icon-maskable-512.png")   # inside the 80% maskable safe zone
save(draw(180, 0.86), "src/app/apple-icon.png")
