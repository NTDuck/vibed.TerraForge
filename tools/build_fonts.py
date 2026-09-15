"""Build the trimmed font pipeline: subset css (vietnamese/latin-ext/latin only)
+ woff2 files -> dist/fonts.css + dist/fonts/*.woff2.
No build tools needed - reads node_modules/@fontsource directly. Stdlib only."""
import pathlib
import re
import shutil
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
FONT_DIRS = ROOT / 'dist' / 'fonts'

IMPORTS = [
    ('@fontsource/inter', ['400', '500', '600', '700']),
    ('@fontsource/jetbrains-mono', ['400']),
]


def main() -> None:
    src = ROOT / 'node_modules' / '@fontsource'
    if not src.is_dir():
        sys.exit('run bun install first')
    FONT_DIRS.mkdir(parents=True, exist_ok=True)

    out = []
    for pkg, weights in IMPORTS:
        name = pkg.removeprefix('@fontsource/')
        for w in weights:
            css = (src / name / f'{w}.css').read_text()
            blocks = re.split(r'(?=/\* [a-z0-9-]+-\d+-normal \*/)', css)
            keep = [b for b in blocks if re.match(r'/\* [a-z0-9-]*?(vietnamese|latin-ext|latin)-', b)]
            merged = ''.join(keep)
            for u in re.findall(r'url\(\./files/([^)]+?\.woff2)\)', merged):
                shutil.copy(src / name / 'files' / u, FONT_DIRS / u)
                merged = merged.replace(f'./files/{u}', f'fonts/{u}')
            merged = re.sub(r',?\s*url\([^)]*\.woff\)\s*format\([^)]*\)', '', merged)
            out.append(merged)

    (ROOT / 'dist' / 'fonts.css').write_text('\n'.join(out))
    files = list(FONT_DIRS.glob('*.woff2'))
    print(f"fonts: {len(files)} woff2 files, {sum(f.stat().st_size for f in files) // 1024}KB")


if __name__ == '__main__':
    main()
