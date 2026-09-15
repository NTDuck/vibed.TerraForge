#!/usr/bin/env python3
"""Extract code comments (// and /* */) per source file for STE linting (tools/ste-lint.sh)."""
import re
import pathlib

FILES = [
    'src/ui.ts', 'src/screens/market.ts', 'src/screens/asset.ts', 'src/screens/upload.ts',
    'src/screens/dashboard.ts', 'src/screens/review.ts', 'src/screens/strategy.ts',
    'src/screens/overlays.ts', 'src/flow.ts', 'src/seed.ts', 'src/store.ts', 'src/config.ts',
    'src/lib/license.ts', 'src/lib/verification.ts', 'src/main.ts', 'src/app.ts', 'src/persist.ts',
]
OUTDIR = pathlib.Path('/tmp/code_comments')

def main() -> None:
    OUTDIR.mkdir(exist_ok=True)
    for f in FILES:
        lines: list[str] = []
        src = pathlib.Path(f).read_text()
        src = re.sub(r'''(['"])(https?:)?//[^\1]*?\1''', "'url'", src)
        for m in re.finditer(r'(?://[ \t]*(.+)|/\*\*?[ \t]*([\s\S]*?)\*/)', src):
            raw = m.group(1) or m.group(2) or ''
            # block comments: emit each content line separately so list structure survives
            parts = [l.strip().lstrip('*').strip() for l in raw.split('\n')] if m.group(2) else [raw.strip()]
            for text in parts:
                text = re.sub(r'\s+', ' ', text).strip()
                if len(text) >= 4 and re.search(r'[A-Za-z]{3}', text):
                    lines.append(text)
        (OUTDIR / (f.replace('/', '_') + '.txt')).write_text('\n'.join(lines))
    print(f"{len(FILES)} comment files -> {OUTDIR}/")

if __name__ == '__main__':
    main()
