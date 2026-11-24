# Zeta certificate explorer

The explorer displays the **10,156 zero intervals** from Salvatore Mercuri
and Bhavik Mehta’s [Lean verification of the Riemann hypothesis up to height
10,011](https://github.com/smmercuri/zeta/tree/34037d5a7662e2eb6e970bfb22299c84e45ed5d9). You can inspect a certificate, trace a sign bound back
to its Lean batch, or use the exact endpoints in your own code.

[Open the explorer](https://wcook04.github.io/zeta-certificate-explorer/) · [Catalogue files](#download-the-original-catalogue) ·
[Working paper](#working-paper) · [Build and host](#build-and-host) ·
[Source tree](#source-map)

## Explore the certificates

[Certificate 2391](https://wcook04.github.io/zeta-certificate-explorer/#/2391) gives the interval `(2919.714, 2920.738)`.
The two endpoint bounds show how the certificate locates a zero.

| Height | Enclosure for Hardy’s Z | Certified sign |
| --- | --- | --- |
| 2919.714 | [−2.9437471, −2.909715] | Negative |
| 2920.738 | [0.33503734, 0.36906967] | Positive |

Hardy’s Z is continuous on the real line, so opposite signs give a zero
inside the interval. The upstream zero count gives uniqueness and
completeness in the counted range. The explorer shows the approximation
and the bound on its error at each endpoint. Together those bounds give
the displayed enclosure for Z.

To see how Lean obtains an endpoint bound, open the proof tree for
[certificate 53](https://wcook04.github.io/zeta-certificate-explorer/#/53). Each box represents a quantity or a step in
its proof. Open a box to see the enclosure, the lemma used, and the inputs
to the step. The explorer has fourteen saved proof trees. You can also
compare the two certificates that meet at a shared endpoint.

The proof and catalogue are Mercuri and Mehta’s work. Will Cook built the
extractor and explorer with AI assistance.

## Download the original catalogue

These links open the files on GitHub. The directory name gives the full
[upstream Lean commit](https://github.com/smmercuri/zeta/tree/34037d5a7662e2eb6e970bfb22299c84e45ed5d9).

| File | Contents |
| --- | --- |
| [Zero intervals CSV](https://github.com/wcook04/zeta-certificate-explorer/blob/gh-pages/downloads/34037d5a7662e2eb6e970bfb22299c84e45ed5d9/zero-intervals.csv) | `index`, `lower` and `upper` for each of the 10,156 intervals |
| [Full certificates CSV](https://github.com/wcook04/zeta-certificate-explorer/blob/gh-pages/downloads/34037d5a7662e2eb6e970bfb22299c84e45ed5d9/certificates.csv) | The interval, approximation method, both endpoint checks, and the Lean batch declaration and offset |
| [JSON catalogue](https://github.com/wcook04/zeta-certificate-explorer/blob/gh-pages/downloads/34037d5a7662e2eb6e970bfb22299c84e45ed5d9/catalogue.json) | The same certificate records with the two endpoints stored as separate objects |
| [Evidence ZIP](https://github.com/wcook04/zeta-certificate-explorer/blob/gh-pages/downloads/34037d5a7662e2eb6e970bfb22299c84e45ed5d9/certificate-evidence.zip) | Both CSVs, the JSON catalogue, the release manifest, the licence, and checksums |

Read `lower` and `upper` as decimal strings or rationals to keep the
endpoints exact. The catalogue index starts at 1, and offsets within a
Lean batch start at 0. In the full CSV, `EM` means Euler–Maclaurin, `C0`
means zeroth-order Riemann–Siegel, and `C1` includes the first correction
term. The `left_` and `right_` columns give the two signed checks.
Certificate 2391, for example, comes from Riemann–Siegel batch 12 at
offset 138. `lean_path` names the source file at the upstream commit,
and `lean_declaration` names the batch theorem in that file.
[Column definitions and provenance](https://github.com/wcook04/zeta-certificate-explorer/blob/gh-pages/downloads/34037d5a7662e2eb6e970bfb22299c84e45ed5d9/README.txt)

The [release manifest](https://github.com/wcook04/zeta-certificate-explorer/blob/gh-pages/downloads/34037d5a7662e2eb6e970bfb22299c84e45ed5d9/manifest.json) gives the source commit,
Lean toolchain, certificate counts and saved proof-tree indices.
[SHA-256 checksums](https://github.com/wcook04/zeta-certificate-explorer/blob/gh-pages/downloads/34037d5a7662e2eb6e970bfb22299c84e45ed5d9/SHA256SUMS) cover the files inside the evidence
ZIP. To verify them, extract the ZIP and run `shasum -a 256 -c SHA256SUMS`
from that directory.

## Working paper

[*Shared Riemann–Siegel bounds and a Lehmer pair from seven values*](https://github.com/wcook04/zeta-certificate-explorer/blob/gh-pages/papers/riemann-siegel-lehmer-pair-20261124.pdf) is Will Cook’s AI-written working draft. It
presents a tighter bound for the first omitted Riemann–Siegel coefficient,
five changes to the search grid, and a Lehmer-pair certificate using seven
values of the completed zeta function. The paper’s
[Lean declarations](https://github.com/wcook04/zeta-proof-evidence/blob/b549e6615098ea13db0d746c6cc34198161e00fe/declarations.md) and
[recorded Comparator checks](https://github.com/wcook04/zeta-proof-evidence/blob/b549e6615098ea13db0d746c6cc34198161e00fe/verification.md) accompany that
follow-up work. The explorer’s catalogue comes from the original
Mercuri–Mehta proof.

## Source map

This branch contains the files used to build the explorer. The
[deployment README](https://github.com/wcook04/zeta-certificate-explorer/tree/gh-pages#readme) maps the files served by
GitHub Pages.

~~~text
.
├── README.md
├── LICENSE
├── .gitignore
├── extract/
│   ├── extract_batches.py       Find Lean batches and run the extractor
│   ├── ExtractZeta.lean          Read certificate data from compiled proof terms
│   ├── TreeDump.lean             Read the steps and inputs in selected proofs
│   ├── TestTreeDump.lean         Small Lean examples for testing TreeDump
│   ├── profile_summary.py        Summarise saved Lean profiler traces
│   └── zeta-trees.workflow.yml   Workflow used for the original extraction
├── tools/
│   ├── prepare.py                Turn the Lean output into catalogue and tree JSON
│   ├── export_downloads.py       Write the CSVs, data archive and checksums
│   ├── package_handoff.py        Package a built site and its source revision
│   └── __pycache__/              Python bytecode stored in the checkout
└── web/
    ├── index.html                HTML entry point
    ├── package.json              Build commands and dependencies
    ├── package-lock.json         Exact npm dependency versions
    ├── tsconfig.json             TypeScript settings
    ├── vite.config.ts            Build settings and site base path
    ├── public/
    │   ├── README.md             README copied into the deployed site
    │   ├── favicon.svg           Browser tab icon
    │   └── data/
    │       ├── catalogue.json    One record for each certificate
    │       ├── manifest.json     Provenance, counts and saved tree indices
    │       └── trees/            Fourteen files named by catalogue index
    └── src/
        ├── main.tsx              Start the React application
        ├── App.tsx               Catalogue, certificate detail and endpoint comparison
        ├── types.ts              Shapes of the catalogue and proof-tree data
        ├── certGraph.ts          Turn a saved proof tree into nodes and edges
        ├── MarginStrip.tsx       Plot sign margins across the catalogue
        ├── SignChart.tsx         Show enclosures and signs for nearby endpoints
        ├── Metaprogram.tsx       Explain the operations used in a selected Lean proof
        ├── app.css               Explorer layout and styles
        ├── styles/
        │   ├── base.css          Base page styles
        │   ├── family.css        Styles shared by the sites
        │   └── tokens.css        Colour, type and spacing values
        ├── api/types.ts          Types shared with the Proof Reader graph
        ├── app/router.ts         Address and trace types from Proof Reader
        ├── model/graph.ts        Graph types and dependency traversal
        └── map/
            ├── ArgumentTree.tsx  Interactive proof-tree view
            ├── treeModel.ts      Prepare nodes and edges for that view
            ├── walk.ts           Walk the proof graph
            ├── labels.ts         Format node labels
            ├── tree.css          Styles for the proof-tree view
            ├── canvas/           Compact view, camera interaction and trace drawing
            └── engine/           Layout, link routing, animation and layout checks
~~~

<details>
<summary>Files inside the proof-tree canvas and layout engine</summary>

~~~text
web/src/map/
├── canvas/
│   ├── SimplifiedMap.tsx       Compact graph view
│   ├── chips.ts               Markers for proof nodes outside the viewport
│   ├── representation.ts      Node details shown at each zoom level
│   ├── scene.ts               Expanded nodes, camera position and view mode
│   ├── trace.ts               Highlight paths through the graph
│   └── useReducedMotion.ts     Read the browser's reduced-motion setting
└── engine/
    ├── audit.ts               Check for overlaps in a routed drawing
    ├── camera.ts              Fit and pan the viewport
    ├── coords.ts              Assign horizontal coordinates to ordered nodes
    ├── layout.ts              Arrange the visible graph in layers
    ├── motion.ts              Time animation of nodes, connectors and camera
    ├── occurrences.ts         Repeat shared leaves where they are used
    ├── order.ts               Order nodes to reduce crossings
    ├── pav.ts                 Fit ordered coordinates with minimum spacing
    ├── router.ts              Route connectors around the proof nodes
    ├── skeleton.ts            Select the edges to draw
    └── types.ts               Shared types for layout and routing
~~~

</details>

`npm ci` fills `web/node_modules/`. Both `npm run dev` and `npm run build`
generate `web/public/downloads/<upstream-sha>/` from the catalogue. Vite
writes the built site to `web/dist/`. Raw Lean extraction output can go in
`data/run/`. These directories are ignored by Git.

## Build and host

### Serve the published files

For a local preview, clone the [deployment branch](https://github.com/wcook04/zeta-certificate-explorer/tree/gh-pages)
and serve the checkout with Python 3.

~~~sh
git clone --branch gh-pages --single-branch https://github.com/wcook04/zeta-certificate-explorer.git zeta-explorer-site
cd zeta-explorer-site
python3 -m http.server 8080 --bind 127.0.0.1
~~~

Open <http://127.0.0.1:8080/#/2391>. To host it publicly, put the
tracked files from the deployment branch on a static HTTP host. The browser
loads the catalogue and assets from that same host.

### Build from source

Use Python 3.10 or later and Node.js 20.19 or later in the 20.x series,
or Node.js 22.12 or later.

~~~sh
git clone https://github.com/wcook04/zeta-certificate-explorer.git
cd zeta-certificate-explorer/web
npm ci
npm run build
python3 -m http.server 8080 --bind 127.0.0.1 --directory dist
~~~

`npm run dev` starts the development server from `web/`. Publish the
contents of `web/dist/` to host a new build. The site works at a domain
root or in a subdirectory because it uses relative URLs. In a certificate
link such as `#/2391`, everything after `#` is read in the browser. Keep
each release at its own URL if you want links to identify a particular
source revision.

The deployment branch also contains the published PDF and licence files.
From a clean source checkout with the web dependencies installed,
`python3 -B tools/package_handoff.py /path/to/explorer.zip` packages the
built site, source and hosting instructions. Add
`--paper /path/to/paper.pdf` to include a paper in that package.

## How the data is made

1. **Build the upstream proof.** The original extraction used Lean 4.35.0
   at [Mercuri–Mehta revision 34037d5a76](https://github.com/smmercuri/zeta/tree/34037d5a7662e2eb6e970bfb22299c84e45ed5d9). The
   [saved workflow](extract/zeta-trees.workflow.yml) records the build and
   extraction used in GitHub Actions run 44762446053 in
   `wcook04/proof-reader`.
2. **Read the compiled certificate batches.** [ExtractZeta.lean](extract/ExtractZeta.lean)
   wrote summaries from all 52 batches. [TreeDump.lean](extract/TreeDump.lean)
   also followed the proof steps for fourteen selected intervals. The
   extractor keeps the exact integers used in the proof as strings.
3. **Prepare the rows and trees.** [prepare.py](tools/prepare.py) widens
   decimal enclosures and rounds sign margins down. It checks that all
   20,312 endpoint margins are positive. The tree preparation groups
   steps that operate on the same quantity, so you can follow an
   enclosure through its inputs.
4. **Export and display the records.** [export_downloads.py](tools/export_downloads.py)
   checks the tree inventory and writes the two CSVs, archive and
   checksums. The app reads the JSON files from the static site. Its
   graph viewer comes from [Proof Reader](https://github.com/wcook04/proof-reader)
   at revision `88f7724`.

## Extract another release

Check out the full commit of `smmercuri/zeta` that you want to serve.
Build its certificate batches with the Lean toolchain pinned in that
checkout. The extractor reads the proof bodies from Lean’s
`.olean.private` files. If the upstream
build discarded them, restore the batches with its `scripts/proofs.sh
restore` command before extracting.

Run these commands from the root of the explorer source checkout.
Replace the uppercase arguments with the count and height from the
upstream theorem.

~~~sh
python3 -B extract/extract_batches.py /path/to/compiled/zeta /path/to/extraction \
  --detail RiemannSiegel/Batch0002:37
python3 -B tools/prepare.py /path/to/extraction /path/to/prepared-data \
  --expected-rows VERIFIED_ROW_COUNT --verified-height VERIFIED_HEIGHT
python3 -B tools/export_downloads.py /path/to/prepared-data /path/to/downloads
~~~

The `--detail` example asks for the proof tree at offset 37 in
Riemann–Siegel batch 2. Pass `--batch` to extract a subset for inspection.
Preparing a public catalogue requires the full set of batches. The
extractor records the source commit and toolchain in its output.

To serve the new release, put the prepared files in `web/public/data/`
in a fresh source checkout and build the site. Check the manifest,
the tree inventory and the published links. The browser loads the whole
catalogue, so measure load time when moving to a much larger release.

If you already have the original extraction output in `data/run/`, use
`python3 -B tools/prepare.py data/run web/public/data`. The original commit
has built-in defaults for its count and height.

## Licence

The explorer uses the [Apache 2.0 licence](LICENSE). The
[deployment tree](https://github.com/wcook04/zeta-certificate-explorer/tree/gh-pages) includes the web dependency
and font licences in `licenses/`. The original proofs and catalogue
are attributed to Mercuri and Mehta at the upstream revision above.
