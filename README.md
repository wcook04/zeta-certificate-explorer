# Zeta certificate explorer

Browse the 10,156 zero intervals in Salvatore Mercuri and Bhavik Mehta’s
[Lean verification up to height 10,011](https://github.com/smmercuri/zeta/tree/34037d5a7662e2eb6e970bfb22299c84e45ed5d9).
Each interval has certified opposite signs of Hardy’s Z function at its endpoints.
The upstream zero count gives one simple zero per interval and accounts for
all zeros in the counted range.

[Open the explorer](https://wcook04.github.io/zeta-certificate-explorer/) ·
[Catalogue files](#download-the-original-catalogue) ·
[Working paper](#working-paper) ·
[Build and host](#build-and-host)

## Explore the certificates

[Certificate 2391](https://wcook04.github.io/zeta-certificate-explorer/#/2391)
shows the exact interval, both endpoint signs, the approximation and error
bounds, and the margins by which the signs are certified. You can compare
the two certificates that meet at a shared endpoint.

[Certificate 53](https://wcook04.github.io/zeta-certificate-explorer/#/53) is
the first Riemann–Siegel example with a proof tree. Open a quantity to see
the Lean lemma that bounds it and the quantities used in that bound. The
explorer includes fourteen such trees.

The Lean verification and original catalogue are Mercuri and Mehta’s work.
Will Cook built the extractor and explorer with AI assistance.

## Download the original catalogue

These GitHub file pages are pinned to the explorer release. The catalogue
comes from Mercuri and Mehta’s [upstream revision 34037d5a76](https://github.com/smmercuri/zeta/tree/34037d5a7662e2eb6e970bfb22299c84e45ed5d9).

| File | Contents |
| --- | --- |
| [Zero intervals CSV](https://github.com/wcook04/zeta-certificate-explorer/blob/1b46132858d85b45c6d4f2bff61e7aa4cdffec0e/downloads/34037d5a7662e2eb6e970bfb22299c84e45ed5d9/zero-intervals.csv) | Catalogue index and exact lower and upper endpoints |
| [Full certificates CSV](https://github.com/wcook04/zeta-certificate-explorer/blob/1b46132858d85b45c6d4f2bff61e7aa4cdffec0e/downloads/34037d5a7662e2eb6e970bfb22299c84e45ed5d9/certificates.csv) | Approximation method, endpoint signs, enclosures, error bounds, sign margins and Lean batch coordinates |
| [Full JSON catalogue](https://github.com/wcook04/zeta-certificate-explorer/blob/1b46132858d85b45c6d4f2bff61e7aa4cdffec0e/downloads/34037d5a7662e2eb6e970bfb22299c84e45ed5d9/catalogue.json) | The structured certificate records used by the explorer |
| [Certificate evidence ZIP](https://github.com/wcook04/zeta-certificate-explorer/blob/1b46132858d85b45c6d4f2bff61e7aa4cdffec0e/downloads/34037d5a7662e2eb6e970bfb22299c84e45ed5d9/certificate-evidence.zip) | Both CSVs, JSON, provenance, licence and SHA-256 checksums |

Read the endpoints as decimal strings or rational numbers to retain their
exact values. The other decimal bounds use directed rounding. See the
[column definitions and provenance](https://github.com/wcook04/zeta-certificate-explorer/blob/1b46132858d85b45c6d4f2bff61e7aa4cdffec0e/downloads/34037d5a7662e2eb6e970bfb22299c84e45ed5d9/README.txt)
and the [release manifest](https://github.com/wcook04/zeta-certificate-explorer/blob/1b46132858d85b45c6d4f2bff61e7aa4cdffec0e/downloads/34037d5a7662e2eb6e970bfb22299c84e45ed5d9/manifest.json) for details.

## Working paper

[*Shared Riemann–Siegel bounds and a Lehmer pair from seven values*](https://github.com/wcook04/zeta-certificate-explorer/blob/1b46132858d85b45c6d4f2bff61e7aa4cdffec0e/papers/riemann-siegel-lehmer-pair-20261124.pdf)
is an AI-written working draft by Will Cook. It presents the smaller
Riemann–Siegel coefficient bound and five grid changes, and the seven-value
certificate for zeros 2391 and 2392. The supporting
[Lean declarations](https://github.com/wcook04/zeta-proof-evidence/blob/b549e6615098ea13db0d746c6cc34198161e00fe/declarations.md)
and [Comparator records](https://github.com/wcook04/zeta-proof-evidence/blob/b549e6615098ea13db0d746c6cc34198161e00fe/verification.md)
are pinned separately from the original catalogue.

## How the data is made

1. **Build.** [`extract/zeta-trees.workflow.yml`](extract/zeta-trees.workflow.yml) builds
   `smmercuri/zeta` at commit `34037d5a7662e2eb6e970bfb22299c84e45ed5d9` with Lean `v4.35.0` on a
   GitHub Actions runner. The run behind the published data is 44762446053 on
   `wcook04/proof-reader`, branch `claude/zeta-certificate-trees-20261120`.
2. **Read the compiled proofs.** For each of the 52 batch modules, a Lean program
   ([`extract/ExtractZeta.lean`](extract/ExtractZeta.lean) with
   [`extract/TreeDump.lean`](extract/TreeDump.lean)) reads the batch theorem's proof from the
   compiled files, decodes its list of certificates in order, and writes a summary of every
   certificate. For the fourteen chosen intervals it writes the whole proof term as a graph.
   Numbers stay as the proof's exact integers, written as strings.
3. **Prepare the site's data.** [`tools/prepare.py`](tools/prepare.py) computes every displayed
   number with exact fractions from those integers and rounds outward: an interval is never
   printed narrower, or a margin larger, than the proof shows. It checks that every one of the
   20,312 endpoint margins is positive. It widens the finite approximation enclosure by the proved
   analytic error to produce the displayed true-Z interval, and prepares the short table margins by
   rounding down. Directed rounding uses exact integer division; no fixed-precision Decimal division
   occurs before the rounding decision.

   It also simplifies each graph for reading:
   - steps that rename or re-centre the same value are merged into one card;
   - the kernel's arithmetic checks are listed on the card they belong to;
   - the certificate's side conditions are drawn as one card, marked as grouped.

   The labels on cards are generated from the expressions.
4. **Show it.** [`web/`](web/) is a React page. Its graph view is the map engine from
   [Proof Reader](https://github.com/wcook04/proof-reader) (`web/src/map/`, copied unchanged from
   Proof Reader at commit `88f7724`, which copied it from lean-exposition).

## Build and host

The [source code](web/) and the [published static files](https://github.com/wcook04/zeta-certificate-explorer/tree/1b46132858d85b45c6d4f2bff61e7aa4cdffec0e)
are both on GitHub. You can serve the published files as they are, or build
from source using the commands below.

Use Python 3.10 or later and Node.js 20.19+, 22.12+ or a later supported release.
The lockfile pins the web dependencies.

~~~sh
cd web
npm ci
npm run build
python3 -m http.server 8080 --bind 127.0.0.1 --directory dist
~~~

Open <http://127.0.0.1:8080/#/2391> for certificate 2391. For development, use
`npm run dev` in `web/`. Both the dev command and the build generate the downloads
from the checked catalogue. The shipped build uses relative URLs for its
scripts, fonts and data. Upload all of `web/dist/` to a static host and serve it
over HTTP, at a domain root or under a directory of your choice. Keep each
release at a stable path such as `/releases/<upstream-commit>/` so links ending
in `#/2391` continue to identify that release's certificate. No routing rules or
API server are needed.

From a clean Git checkout with the web dependencies installed, build a
transferable ZIP with `python3 -B tools/package_handoff.py /path/to/explorer.zip`.
The ZIP includes a ready-to-serve site, the source revision and hosting
instructions. Use `--paper /path/to/paper.pdf` to include a PDF you intend to
share. The package links the bundled copy beside the catalogue downloads.

## Extract another release

Check out the desired full commit of smmercuri/zeta. Follow that revision's
build instructions to compile its certificate batches with the toolchain
recorded there. The extractor needs the original private Lean proof bodies.
On releases that shrink them, build with proofs kept, or first restore the
required batches with the upstream `scripts/proofs.sh restore` command.

From the explorer source directory, run the following. Substitute the row
count and verified height from the upstream theorem. Choose a fresh staging
directory for each upstream revision.

~~~sh
python3 -B extract/extract_batches.py /path/to/compiled/zeta /path/to/extraction \
  --detail RiemannSiegel/Batch0002:37
python3 -B tools/prepare.py /path/to/extraction /path/to/prepared-data \
  --expected-rows VERIFIED_ROW_COUNT --verified-height VERIFIED_HEIGHT
python3 -B tools/export_downloads.py /path/to/prepared-data /path/to/downloads
~~~

The extractor discovers certificate batches in the pinned checkout and
records its SHA and toolchain. The optional `--detail` argument selects
zero-based batch offsets for proof trees. To inspect a few batches locally,
pass repeated `--batch` arguments. The preparation step requires a complete
catalogue. The extraction relies on the upstream zero count and analytic
error bounds and reads their certificate data from the compiled proofs.

Review the prepared manifest and check that every tree in the inventory was
written. To build a site for that release, replace `web/public/data/` in a
fresh copy of the explorer with the prepared directory and run `npm run build`.
The export directory uses the full upstream SHA. The browser currently loads
the whole catalogue, so test load time before deploying a substantially larger
release.

The original dataset can also be regenerated from the retained extraction
artifact with `python3 -B tools/prepare.py data/run web/public/data`. Its row
count and height are built-in defaults for the original commit only.

## Source map

- [web/](web/) contains the interface and the pinned original catalogue.
- [extract/](extract/) reads the compiled Lean certificate terms and writes summaries and selected trees.
- [tools/](tools/) validates the extracted data, generates downloads and packages the site.

## Licence

Apache-2.0, as for `smmercuri/zeta` and Proof Reader.
