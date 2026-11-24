"""Read the summaries and requested proof trees from compiled Mercuri–Mehta batches."""

import argparse
import json
import os
import re
import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory

HERE = Path(__file__).resolve().parent
PREFIX = "Zeta/Zeros/Certificates/"
BATCH = re.compile(r"(EulerMaclaurin|RiemannSiegel)/Batch\d+")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("checkout", type=Path, help="pinned upstream checkout with compiled batches")
    parser.add_argument("output", type=Path, help="new directory for the extraction")
    parser.add_argument("--batch", action="append", default=[], help="extract one batch, for example RiemannSiegel/Batch0001")
    parser.add_argument("--detail", action="append", default=[], help="extract trees for BATCH:OFFSET[,OFFSET]")
    parser.add_argument("--lean-path", help="use matching precompiled libraries in an explicit LEAN_PATH")
    args = parser.parse_args()
    checkout = args.checkout.resolve()
    out = args.output.resolve()
    if subprocess.run(["git", "diff", "--quiet", "HEAD", "--"], cwd=checkout).returncode:
        parser.error("the upstream tracked source must match its pinned commit")

    def git(*command):
        return subprocess.check_output(["git", *command], cwd=checkout, text=True).strip()

    revision = git("rev-parse", "HEAD")
    toolchain = (checkout / "lean-toolchain").read_text().strip()
    files = git("ls-files", "--", PREFIX).splitlines()
    available = {
        name for file in files
        if file.endswith(".lean") and BATCH.fullmatch(name := file.removeprefix(PREFIX).removesuffix(".lean"))
    }
    chosen = set(args.batch) if args.batch else available
    if not chosen or chosen - available:
        parser.error(f"unknown or missing batches: {sorted(chosen - available)}")
    details = {}
    for value in args.detail:
        batch, _, offsets = value.partition(":")
        if batch not in chosen or not re.fullmatch(r"\d+(?:,\d+)*", offsets):
            parser.error(f"invalid detail selection: {value}")
        details.setdefault(batch, set()).update(int(item) for item in offsets.split(","))
    certificates = out / "certificates"
    out.mkdir(parents=True, exist_ok=False)
    certificates.mkdir()
    source = (HERE / "TreeDump.lean").read_text().replace("\nimport Lean\n", "\n", 1)
    source += "\n" + (HERE / "ExtractZeta.lean").read_text()
    (out / "provenance.txt").write_text(f"zeta {revision}\ntoolchain {toolchain}\n")
    with TemporaryDirectory() as temp, (out / "extract.log").open("w") as log:
        program = Path(temp) / "ExtractBatch.lean"
        for batch in sorted(chosen, key=lambda name: (name.split("/")[0], int(name.split("Batch")[1]))):
            module = batch.replace("/", ".")
            name = f"Zeta.Certificates.{module}.batch"
            offsets = details.get(batch, set())
            program.write_text(f"import Zeta.Zeros.Certificates.{module}\n{source}")
            env = {
                **os.environ,
                "ZETA_BATCH": name,
                "ZETA_METHOD": "euler_maclaurin" if batch.startswith("EulerMaclaurin/") else "riemann_siegel",
                "ZETA_DETAIL": ",".join(str(i) for i in sorted(offsets)),
                "ZETA_OUT": str(certificates),
            }
            command = ["lake", "env", "lean", str(program)]
            if args.lean_path:
                command = ["lean", str(program)]
                env["LEAN_PATH"] = args.lean_path
            print(batch, file=log, flush=True)
            result = subprocess.run(command, cwd=checkout, env=env, stdout=log, stderr=subprocess.STDOUT)
            summary = certificates / f"{name}.summary.json"
            if result.returncode or not summary.is_file():
                (out / "failed_batches").write_text(batch + "\n")
                raise SystemExit(f"{batch} failed. See {out / 'extract.log'}")
            info = json.loads(summary.read_text())
            expected = {f"{name}.row{offset}.tree.json" for offset in offsets}
            found = {path.name for path in certificates.glob(f"{name}.row*.tree.json")}
            if info["batch_theorem"] != name or expected != found:
                (out / "failed_batches").write_text(batch + "\n")
                raise SystemExit(f"{batch} produced an incomplete or unexpected result")
            print(f"{batch}: {info['rows']} intervals, {len(found)} trees", flush=True)
    if chosen != available:
        (out / "partial_batches").write_text("Selected batches only. This is not a full catalogue.\n")


if __name__ == "__main__":
    main()
