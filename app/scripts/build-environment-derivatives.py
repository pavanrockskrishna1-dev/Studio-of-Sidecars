#!/usr/bin/env python3
"""Build lightweight web derivatives of the LOCKED Environment Library v2.

Source of truth (LOCKED):  design/environments/assets/studio_backgrounds/_manifest.json
Masters are never modified. This script reads each 4K master via git
(`git show HEAD:design/environments/<file>` — works on any full clone) and
writes a 1920px-wide JPEG (q80) into app/public/environments/ for the web app.

Usage:  python3 app/scripts/build-environment-derivatives.py
Deps:   Pillow (pip install pillow)
"""
import hashlib
import json
import subprocess
import sys
from pathlib import Path

from PIL import Image

REPO_ROOT = Path(__file__).resolve().parents[2]
ENV_DIR = REPO_ROOT / "design" / "environments"
MANIFEST = ENV_DIR / "assets" / "studio_backgrounds" / "_manifest.json"
OUT_DIR = REPO_ROOT / "app" / "public" / "environments"
TARGET_WIDTH = 1920
JPEG_QUALITY = 80


def git_show(rel_path: str) -> bytes:
    """Read a tracked file from HEAD (blobless clones fetch on demand)."""
    return subprocess.run(
        ["git", "show", f"HEAD:{rel_path}"],
        cwd=REPO_ROOT, capture_output=True, check=True,
    ).stdout


def derive(data: bytes, out_file: Path) -> int:
    img = Image.open(__import__("io").BytesIO(data))
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")
    w, h = img.size
    if w > TARGET_WIDTH:
        img = img.resize((TARGET_WIDTH, round(h * TARGET_WIDTH / w)), Image.LANCZOS)
    img.save(out_file, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
    return out_file.stat().st_size


def main() -> int:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    written = 0

    # Hero (canonical default) — integrity-check the locked sha256 prefix first.
    hero = manifest["hero"]
    hero_data = git_show(f"design/environments/{hero['file']}")
    prefix = hashlib.sha256(hero_data).hexdigest()[:16]
    expected = hero["sha256_prefix"]
    if prefix != expected:
        print(f"ABORT: hero sha256 prefix {prefix} != locked {expected}", file=sys.stderr)
        return 1
    size = derive(hero_data, OUT_DIR / "propeller-pistons-loft.jpg")
    print(f"hero: propeller-pistons-loft.jpg  {size:,} B  (sha256 {prefix}... OK)")
    written += 1

    for asset in manifest["assets"]:
        slug = Path(asset["file"]).stem
        data = git_show(f"design/environments/{asset['file']}")
        size = derive(data, OUT_DIR / f"{slug}.jpg")
        print(f"{asset['id']}: {slug}.jpg  {size:,} B")
        written += 1

    print(f"\n{written} derivatives written to {OUT_DIR.relative_to(REPO_ROOT)}/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
