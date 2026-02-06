# Third-party licences

ForeverQR ships the following third-party code and fonts. This list matches the production
dependency tree (`npm ls --omit=dev --all`), checked by `npm run check:licenses`. Build tools
(Astro, Vite, Tailwind, Playwright, Vitest and their dependencies) are dev dependencies and do
not ship in the site.

Each licence and copyright line was taken from the package's own `package.json` and LICENSE
file (or source header where the package has no LICENSE file).

## Runtime libraries

| Package | Version | Licence | Source | Copyright |
| --- | --- | --- | --- | --- |
| qrcode-generator | 2.0.4 | MIT | https://github.com/kazuhikoarase/qrcode-generator | Copyright (c) 2009 Kazuhiko Arase |
| zxing-wasm | 3.1.7 | MIT | https://github.com/Sec-ant/zxing-wasm | Copyright (c) 2023 Ze-Zheng Wu |
| zxing-cpp (compiled into the zxing-wasm reader `.wasm`) | pinned by zxing-wasm 3.1.7 | Apache-2.0 | https://github.com/zxing-cpp/zxing-cpp | Copyright the ZXing authors and zxing-cpp contributors |
| pdf-lib | 1.17.1 | MIT | https://github.com/Hopding/pdf-lib | Copyright (c) 2019 Andrew Dillon |
| @pdf-lib/standard-fonts | 1.0.0 | MIT | https://github.com/Hopding/standard-fonts | Copyright (c) 2018 Andrew Dillon |
| @pdf-lib/upng | 1.0.1 | MIT | https://github.com/Hopding/upng | Copyright (c) 2017 Photopea |
| pako | 1.0.11 | (MIT AND Zlib) | https://github.com/nodeca/pako | Copyright (C) 2014-2017 by Vitaly Puzrin and Andrei Tuputcyn |
| tslib | 1.14.1 | 0BSD | https://github.com/Microsoft/tslib | Copyright (c) Microsoft Corporation |
| opentype.js | 2.0.0 | MIT | https://github.com/opentypejs/opentype.js | Copyright (c) 2020 Frederik De Bleser |
| svelte | 5.59.1 | MIT | https://github.com/sveltejs/svelte | Copyright (c) 2016-2025 Svelte Contributors |

pako's LICENSE file is MIT; its `package.json` also names the Zlib licence for the code ported
from zlib. Zlib is a permissive licence with no copyleft terms; it is a reviewed exception in
`scripts/check-licenses.mjs`.

## Svelte's declared dependencies

Svelte lists these as dependencies (mostly for its compiler), so they are in the production
tree. Only a small part of the Svelte runtime ends up in the built site.

| Package | Version | Licence | Source | Copyright |
| --- | --- | --- | --- | --- |
| @jridgewell/gen-mapping | 0.3.13 | MIT | https://github.com/jridgewell/sourcemaps | Copyright 2024 Justin Ridgewell |
| @jridgewell/remapping | 2.3.5 | MIT | https://github.com/jridgewell/sourcemaps | Copyright 2024 Justin Ridgewell |
| @jridgewell/sourcemap-codec | 1.6.0 | MIT | https://github.com/jridgewell/sourcemaps | Copyright 2024 Justin Ridgewell |
| @jridgewell/trace-mapping | 0.3.31 | MIT | https://github.com/jridgewell/sourcemaps | Copyright 2024 Justin Ridgewell |
| @sveltejs/acorn-typescript | 1.0.13 | MIT | https://github.com/sveltejs/acorn-typescript | Copyright (c) 2022 Tyreal Hu |
| @types/emscripten | 1.41.6 | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped | Copyright (c) Microsoft Corporation |
| @types/estree | 1.0.10 | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped | Copyright (c) Microsoft Corporation |
| acorn | 8.19.0 | MIT | https://github.com/acornjs/acorn | Copyright (C) 2012-2022 by various contributors |
| aria-query | 5.3.1 | Apache-2.0 | https://github.com/A11yance/aria-query | A11yance contributors |
| axobject-query | 4.1.0 | Apache-2.0 | https://github.com/A11yance/axobject-query | A11yance contributors |
| clsx | 2.1.1 | MIT | https://github.com/lukeed/clsx | Copyright (c) Luke Edwards |
| devalue | 5.9.4 | MIT | https://github.com/sveltejs/devalue | Copyright (c) 2018-19 devalue contributors |
| esm-env | 1.2.2 | MIT | https://github.com/benmccann/esm-env | Copyright 2022 Benjamin McCann |
| esrap | 2.4.2 | MIT | https://github.com/sveltejs/esrap | Copyright (c) 2023-2025 esrap contributors |
| is-reference | 3.0.3 | MIT | https://github.com/Rich-Harris/is-reference | Rich Harris |
| locate-character | 3.0.0 | MIT | https://gitlab.com/Rich-Harris/locate-character | Rich Harris |
| magic-string | 0.30.21 | MIT | https://github.com/Rich-Harris/magic-string | Copyright 2018 Rich Harris |
| tagged-tag | 1.0.0 | MIT | https://github.com/sindresorhus/tagged-tag | Copyright (c) Sindre Sorhus |
| type-fest | 5.10.0 | (MIT OR CC0-1.0) | https://github.com/sindresorhus/type-fest | Copyright (c) Sindre Sorhus |
| zimmerframe | 1.1.5 | MIT | https://github.com/sveltejs/zimmerframe | Copyright (c) 2023 zimmerframe contributors |

## Fonts

| Font | File | Licence | Source | Copyright |
| --- | --- | --- | --- | --- |
| Archivo Black | `public/fonts/ArchivoBlack-Regular.ttf` | OFL-1.1 (`public/fonts/ArchivoBlack-OFL.txt`) | https://github.com/Omnibus-Type/ArchivoBlack | Copyright 2017 The Archivo Black Project Authors |
| Inter | `public/fonts/InterVariable.woff2` | OFL-1.1 (`public/fonts/Inter-OFL.txt`) | https://github.com/rsms/inter | Copyright (c) 2016 The Inter Project Authors |
