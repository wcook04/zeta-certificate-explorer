Mercuri–Mehta certified zero intervals

Lean verification and certificate data by Salvatore Mercuri and Bhavik Mehta.
Data extraction and explorer by Will Cook, with AI assistance.
Licence: Apache-2.0. See LICENSE.

Upstream revision: 34037d5a7662e2eb6e970bfb22299c84e45ed5d9
Pinned Lean sources: https://github.com/smmercuri/zeta/tree/34037d5a7662e2eb6e970bfb22299c84e45ed5d9
These 10,156 sign-change intervals come from the catalogue for the Lean
verification for |Im(s)| < 10011. Opposite certified Hardy Z signs give a zero
on the critical line in each open interval. The upstream zero count gives
uniqueness and completeness in the counted range.

zero-intervals.csv has 1-based catalogue indices and exact decimal rational
endpoints. Read lower and upper as text, Decimal, or rational numbers to
preserve them exactly. All quantities in the CSV and JSON are in t coordinates.

certificates.csv adds the method (EM or RS), variant (EM, C0, or C1), batch, and
zero-based offset in its Lean declaration. lean_path is relative to the pinned
source tree. C0 and C1 denote zeroth- and first-order Riemann–Siegel certificates.
parameters_json preserves the extractor's natural-number parameters as strings.
For each endpoint the columns give the proved sign, outward enclosure of the
approximation, an upper error bound and the height where it was proved, the
outward enclosure of true Hardy Z, and a lower bound on its distance from zero.
A blank error_at means the extraction did not recover the height. Proof-tree
availability refers to the explorer's saved diagrams.

catalogue.json is the structured dataset the explorer reads. manifest.json
records the toolchain, extraction provenance, variant counts and the inventory
of saved proof trees. All 20,312 endpoint margins are positive.
The downloadable figures describe the inherited catalogue. For the original
Lean theorems and build instructions use the pinned upstream source above.

Verify the files by running shasum -a 256 -c SHA256SUMS in this directory.
