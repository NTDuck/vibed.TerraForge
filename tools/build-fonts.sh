#!/usr/bin/env bash
# Build the trimmed font pipeline: subset css (vietnamese/latin-ext/latin only)
# + woff2 files → dist/fonts.css + dist/fonts/*.woff2.
# No build tools needed — reads node_modules/@fontsource directly.
set -euo pipefail
cd "$(dirname "$0")/.."

command -v python3 >/dev/null || { echo "python3 required"; exit 1; }
[ -d node_modules/@fontsource ] || { echo "run bun install first"; exit 1; }

mkdir -p dist/fonts

python3 - <<'EOF'
import re, shutil, pathlib

fonts = pathlib.Path('dist/fonts')
imports = [
    ('@fontsource/space-grotesk', ['500', '600', '700']),
    ('@fontsource/ibm-plex-sans', ['400', '500', '600']),
    ('@fontsource/jetbrains-mono', ['400']),
]
tmp_css = []
for pkg, weights in imports:
    for w in weights:
        css = pathlib.Path(f'node_modules/{pkg}/{w}.css').read_text()
        blocks = re.split(r'(?=/\* [a-z0-9-]+-\d+-normal \*/)', css)
        keep = [b for b in blocks if re.match(r'/\* [a-z0-9-]*?(vietnamese|latin-ext|latin)-', b)]
        merged = ''.join(keep)
        for u in re.findall(r'url\(\./files/([^)]+?\.woff2)\)', merged):
            shutil.copy(pathlib.Path(f'node_modules/{pkg}/files/{u}'), fonts / u)
            merged = merged.replace(f'./files/{u}', f'fonts/{u}')
        merged = re.sub(r',?\s*url\([^)]*\.woff\)\s*format\([^)]*\)', '', merged)
        tmp_css.append(merged)

pathlib.Path('dist/fonts.css').write_text('\n'.join(tmp_css))
total = sum(f.stat().st_size for f in fonts.glob('*.woff2'))
print(f"fonts: {len(list(fonts.glob('*.woff2')))} woff2 files, {total // 1024}KB")
EOF
