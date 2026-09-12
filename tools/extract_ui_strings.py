#!/usr/bin/env python3
"""Extract user-facing UI prose strings for STE linting (tools/ste-lint.sh)."""
import re
import pathlib

FILES = [
    'src/ui.ts', 'src/screens/market.ts', 'src/screens/asset.ts', 'src/screens/upload.ts',
    'src/screens/dashboard.ts', 'src/screens/review.ts', 'src/screens/strategy.ts',
    'src/screens/overlays.ts', 'src/flow.ts', 'src/seed.ts', 'src/store.ts', 'src/config.ts',
    'src/lib/license.ts', 'src/lib/verification.ts', 'src/main.ts',
]
OUT = '/tmp/ui_strings.txt'


def main() -> None:
    lines: list[str] = []
    for f in FILES:
        src = pathlib.Path(f).read_text()
        for m in re.finditer(r"""['"]([^'"\n]{4,})['"]""", src):
            s = m.group(1)
            # UI strings: letters + a space, not code fragments (no brackets/arrows/paths/urls)
            if (re.search(r'[A-Za-z]', s) and ' ' in s.strip()
                    and not re.search(r'[(){};=>]|^\W+$|^\s*(on|import|from|class|href|http|data:)', s)
                    and not s.strip().replace(' ', '').isdigit()):
                lines.append(f"{f}: {s}")
    pathlib.Path(OUT).write_text('\n'.join(lines))
    print(f"{len(lines)} strings -> {OUT}")


if __name__ == '__main__':
    main()
