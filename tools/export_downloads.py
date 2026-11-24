"""Export the displayed catalogue in reusable formats without re-rounding its numbers."""

import argparse
import csv
import hashlib
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZIP_DEFLATED, ZipFile

from prepare import validate_catalogue

ROOT = Path(__file__).resolve().parents[1]
UPSTREAM = "https://github.com/smmercuri/zeta"


def coordinates(row):
    method = "EulerMaclaurin" if row["method"] == "EM" else "RiemannSiegel"
    batch = f"{method}/Batch{row['batch']:04d}"
    return f"Zeta.Certificates.{batch.replace('/', '.')}.batch", f"Zeta/Zeros/Certificates/{batch}.lean"


def write_tables(out, rows):
    endpoint_columns = ("sign", "approx_lower", "approx_upper", "error_upper", "error_at",
                        "true_Z_lower", "true_Z_upper", "margin_lower")
    summary = ("index", "lower", "upper")
    full = (*summary, "method", "variant", "batch", "offset", "lean_declaration", "lean_path",
            "parameters_json", "proof_tree")
    with (out / "zero-intervals.csv").open("w", encoding="utf-8", newline="") as intervals, \
         (out / "certificates.csv").open("w", encoding="utf-8", newline="") as certificates:
        simple = csv.writer(intervals)
        detailed = csv.writer(certificates)
        simple.writerow(summary)
        detailed.writerow((*full, *(f"{side}_{name}" for side in ("left", "right") for name in endpoint_columns)))
        for row in rows:
            interval = (row["row"], row["left"], row["right"])
            simple.writerow(interval)
            theorem, source = coordinates(row)
            ends = [
                val for e in row["ends"]
                for val in (e["sign"], *e["z"], e["bound"], e["boundAt"], *e["trueZ"], e["margin"])
            ]
            detailed.writerow((*interval, row["method"], row["variant"], row["batch"], row["offset"],
                               theorem, source, json.dumps(row["params"], separators=(",", ":")),
                               "yes" if row.get("detail") else "no", *ends))


def export(data, downloads):
    catalogue = (data / "catalogue.json").read_bytes()
    rows = json.loads(catalogue)
    manifest = json.loads((data / "manifest.json").read_bytes())
    validate_catalogue(rows, manifest)
    expected = {f"{row}.json" for row in manifest["detailed"]}
    found = {file.name for file in (data / "trees").glob("*.json")}
    if expected != found:
        raise ValueError("saved proof-tree files disagree with the release manifest")
    revision = manifest["provenance"]["zeta"]
    release = downloads / revision
    release.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory(dir=downloads) as temporary:
        out = Path(temporary)
        write_tables(out, rows)
        (out / "catalogue.json").write_bytes(catalogue)
        (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
        (out / "LICENSE").write_bytes((ROOT / "LICENSE").read_bytes())
        height = manifest["verified_height"]
        (out / "README.txt").write_text(f"""Mercuri–Mehta certified zero intervals

Lean verification and certificate data by Salvatore Mercuri and Bhavik Mehta.
Data extraction and explorer by Will Cook, with AI assistance.
Licence: Apache-2.0. See LICENSE.

Upstream revision: {revision}
Pinned Lean sources: {UPSTREAM}/tree/{revision}
These {len(rows):,} sign-change intervals come from the catalogue for the Lean
verification for |Im(s)| < {height}. Opposite certified Hardy Z signs give a zero
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
of saved proof trees. All {manifest["margins_checked"]:,} endpoint margins are positive.
The downloadable figures describe the inherited catalogue. For the original
Lean theorems and build instructions use the pinned upstream source above.

Verify the files by running shasum -a 256 -c SHA256SUMS in this directory.
""", encoding="utf-8")
        checksum = "".join(
            f"{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.name}\n"
            for path in sorted(out.iterdir())
        )
        (out / "SHA256SUMS").write_text(checksum)
        payload = sorted(out.iterdir())
        with ZipFile(out / "certificate-evidence.zip", "w", compression=ZIP_DEFLATED) as bundle:
            for path in payload:
                bundle.write(path, path.name)
        for path in out.iterdir():
            path.replace(release / path.name)
    print(f"{len(rows):,} exact intervals and {manifest['margins_checked']:,} endpoint checks at {revision}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("data", type=Path)
    parser.add_argument("downloads", type=Path)
    args = parser.parse_args()
    export(args.data, args.downloads)
