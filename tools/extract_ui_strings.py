#!/usr/bin/env python3
"""Extract user-facing UI prose strings per source file for STE linting (tools/ste-lint.sh).

The ste-lint synonym-rotation check is file-scoped, so this tool writes one
<file>.txt per source file into /tmp/ui_strings/ instead of one merged file.
"""
import re
import pathlib

FILES = [
    'src/ui.ts', 'src/screens/market.ts', 'src/screens/asset.ts', 'src/screens/upload.ts',
    'src/screens/dashboard.ts', 'src/screens/review.ts', 'src/screens/strategy.ts',
    'src/screens/overlays.ts', 'src/flow.ts', 'src/seed.ts', 'src/store.ts', 'src/config.ts',
    'src/lib/license.ts', 'src/lib/verification.ts', 'src/main.ts',
]
OUTDIR = pathlib.Path('/tmp/ui_strings')


def ui_strings(src: str) -> list[str]:
    out: list[str] = []
    for m in re.finditer(r"""['"]([^'"\n]{4,})['"]""", src):
        s = m.group(1)
        # UI strings: letters + a space, not code fragments (no brackets/arrows/paths/urls)
        if (re.search(r'[A-Za-z]', s) and ' ' in s.strip()
                and not re.search(r'[(){};=>]|^\W+$|^\s*(on|import|from|class|href|http|data:)', s)
                and not s.strip().replace(' ', '').isdigit()):
            out.append(s)
    return out


def main() -> None:
    OUTDIR.mkdir(exist_ok=True)
    for f in FILES:
        p = OUTDIR / (f.replace('/', '_') + '.txt')
        p.write_text('\n'.join(ui_strings(pathlib.Path(f).read_text())))
    print(f"{len(FILES)} files -> {OUTDIR}/")


if __name__ == '__main__':
    main()
