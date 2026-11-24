# Zeta certificate explorer

Browse the **10,156 certified zero intervals** from Salvatore Mercuri and
Bhavik Mehta’s [Lean verification up to height 10,011](https://github.com/smmercuri/zeta/tree/34037d5a7662e2eb6e970bfb22299c84e45ed5d9).
This branch holds the built site. The source code and build instructions
are in the [main README](https://github.com/wcook04/zeta-certificate-explorer/blob/main/README.md).

[Open the explorer](https://wcook04.github.io/zeta-certificate-explorer/) · [Catalogue files](#catalogue-files) ·
[Working paper](#working-paper) · [Host this copy](#host-this-copy)

## What you can see

[Certificate 2391](https://wcook04.github.io/zeta-certificate-explorer/#/2391) gives a zero between `2919.714` and
`2920.738`. The certificate bounds Hardy’s Z strictly below zero at the
left endpoint and strictly above zero at the right. The upstream zero
count establishes uniqueness and completeness in the counted range.
[Certificate 53](https://wcook04.github.io/zeta-certificate-explorer/#/53) also shows the Lean proof steps used to
obtain the bounds. The site saves fourteen of these proof trees.

## Catalogue files

The [catalogue directory](https://github.com/wcook04/zeta-certificate-explorer/tree/gh-pages/downloads/34037d5a7662e2eb6e970bfb22299c84e45ed5d9)
is named after the upstream Lean commit.

| File | What it contains |
| --- | --- |
| [Zero intervals CSV](https://github.com/wcook04/zeta-certificate-explorer/blob/gh-pages/downloads/34037d5a7662e2eb6e970bfb22299c84e45ed5d9/zero-intervals.csv) | One index and two exact endpoints per interval |
| [Full certificates CSV](https://github.com/wcook04/zeta-certificate-explorer/blob/gh-pages/downloads/34037d5a7662e2eb6e970bfb22299c84e45ed5d9/certificates.csv) | The approximation method, endpoint signs, enclosures, error bounds, margins and source coordinates |
| [JSON catalogue](https://github.com/wcook04/zeta-certificate-explorer/blob/gh-pages/downloads/34037d5a7662e2eb6e970bfb22299c84e45ed5d9/catalogue.json) | The certificate records the browser reads |
| [Evidence ZIP](https://github.com/wcook04/zeta-certificate-explorer/blob/gh-pages/downloads/34037d5a7662e2eb6e970bfb22299c84e45ed5d9/certificate-evidence.zip) | Both CSVs, the JSON catalogue, the manifest, licence and checksums |

Read the endpoints as decimal strings or rational numbers to keep them
exact. The [column guide](https://github.com/wcook04/zeta-certificate-explorer/blob/gh-pages/downloads/34037d5a7662e2eb6e970bfb22299c84e45ed5d9/README.txt) explains how to read
each export. The [manifest](https://github.com/wcook04/zeta-certificate-explorer/blob/gh-pages/downloads/34037d5a7662e2eb6e970bfb22299c84e45ed5d9/manifest.json) records the Lean
toolchain and proof-tree indices. To verify an extracted evidence ZIP,
run `shasum -a 256 -c SHA256SUMS` in its directory.

## Deployment tree

~~~text
.
├── README.md
├── .nojekyll                    Serve the static files through GitHub Pages
├── index.html                   Page entry point
├── favicon.svg                  Browser tab icon
├── assets/                      Built JavaScript, CSS and font files
├── data/
│   ├── catalogue.json           Certificate records loaded by the site
│   ├── manifest.json            Source commit, counts and proof-tree index
│   └── trees/                   Fourteen proof-tree JSON files by certificate number
├── downloads/
│   └── <upstream-sha>/
│       ├── zero-intervals.csv   Index and exact endpoints
│       ├── certificates.csv     Full certificate records
│       ├── catalogue.json       Copy of the catalogue loaded by the site
│       ├── manifest.json        Release and extraction provenance
│       ├── README.txt           Column guide
│       ├── SHA256SUMS           Checksums for the catalogue package
│       ├── LICENSE              Catalogue licence
│       └── certificate-evidence.zip
├── papers/
│   └── riemann-siegel-lehmer-pair-20261124.pdf
├── LICENSE                      Explorer licence
└── licenses/                    Licences for bundled web libraries and fonts
~~~

## Working paper

[*Shared Riemann–Siegel bounds and a Lehmer pair from seven values*](https://github.com/wcook04/zeta-certificate-explorer/blob/gh-pages/papers/riemann-siegel-lehmer-pair-20261124.pdf) is Will Cook’s AI-written working draft
about the coefficient bound, search-grid changes and Lehmer pair.
The supporting [Lean declarations](https://github.com/wcook04/zeta-proof-evidence/blob/b549e6615098ea13db0d746c6cc34198161e00fe/declarations.md) and
[Comparator records](https://github.com/wcook04/zeta-proof-evidence/blob/b549e6615098ea13db0d746c6cc34198161e00fe/verification.md) describe the follow-up
work. The original catalogue comes from Mercuri and Mehta’s Lean proof.

## Host this copy

Clone this branch and serve its files over HTTP. For a local preview
with Python 3, use

~~~sh
git clone --branch gh-pages --single-branch https://github.com/wcook04/zeta-certificate-explorer.git zeta-explorer-site
cd zeta-explorer-site
python3 -m http.server 8080 --bind 127.0.0.1
~~~

Open <http://127.0.0.1:8080/#/2391>. For a public deployment, copy the
tracked site files to a static host. The host can serve them at a domain root
or in a subdirectory. Certificate links use the part of the address
after `#`, which the browser handles.

To change the site or prepare a new catalogue, see the
[source tree](https://github.com/wcook04/zeta-certificate-explorer/blob/main/README.md#source-map) and
[build instructions](https://github.com/wcook04/zeta-certificate-explorer/blob/main/README.md#build-and-host).
