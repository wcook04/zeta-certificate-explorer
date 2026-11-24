"""Build a portable static site and a reproducible source snapshot."""

import argparse
from hashlib import sha256
import json
import os
from pathlib import Path
import shutil
import subprocess
from tempfile import TemporaryDirectory
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "web"


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT, text=True).strip()


def bundle(out, paper):
    revision = git("rev-parse", "HEAD")
    if git("status", "--porcelain"):
        raise ValueError("commit the source changes before packaging a reproducible handoff")
    with TemporaryDirectory() as temp:
        stage = Path(temp)
        site = stage / "site"
        env = {**os.environ, "VITE_BASE_PATH": "./", "VITE_PAPER_FILE": "research/paper.pdf" if paper else ""}
        subprocess.run(["npm", "run", "build", "--", "--outDir", str(site)],
                       cwd=WEB, env=env, check=True)
        if paper:
            (site / "research").mkdir()
            shutil.copyfile(paper, site / "research/paper.pdf")
        (site / ".nojekyll").touch()
        shutil.copyfile(ROOT / "LICENSE", site / "LICENSE")
        licenses = site / "licenses"
        licenses.mkdir()
        locked = json.loads((WEB / "package-lock.json").read_text())["packages"]
        for path, package in locked.items():
            if not path or package.get("dev"):
                continue
            license_path = WEB / path / "LICENSE"
            if license_path.is_file():
                target = path.removeprefix("node_modules/").replace("/", "-") + ".txt"
                shutil.copyfile(license_path, licenses / target)
        data = json.loads((site / "data/manifest.json").read_text())
        pin = data["provenance"]["zeta"]
        paper_note = (
            "The included working paper is linked beside the catalogue downloads. "
            "The PDF contains its own companion evidence ZIP.\n\n"
            if paper else ""
        )
        (stage / "HOSTING.md").write_text(f"""# Host the Zeta certificate explorer

This handoff contains the {data['rows']:,} certified intervals extracted from
Salvatore Mercuri and Bhavik Mehta’s Lean revision {pin}.

From the extracted directory, serve the site locally.

~~~sh
python3 -m http.server 8080 --bind 127.0.0.1 --directory site
~~~

Open <http://127.0.0.1:8080/#/2391> to inspect a certificate. Use
**Download the catalogue** for the CSV, JSON and evidence files.

On a static host, serve the contents of site/ over HTTP. Upload the whole
directory together. A subdirectory such as /releases/{pin}/ works, and
keeping that URL keeps certificate links stable across releases. Each
individual link ends in a hash such as #/2391. The site serves its scripts,
fonts and data from the same host, with no server-side routing.

The directory site/data/ holds the catalogue and {len(data['detailed'])} saved proof trees.
The downloads include provenance and checksums. The site licence and
third-party notices are in site/LICENSE and site/licenses/.

{paper_note}To rebuild or update the explorer, extract explorer-source.zip. It contains
source revision {revision}. Follow its README for building and preparing
data for another pinned release.

Verify this handoff from the extracted directory.

~~~sh
shasum -a 256 -c SHA256SUMS
~~~
""", encoding="utf-8")
        subprocess.run(["git", "archive", "--format=zip", "--output", str(stage / "explorer-source.zip"), revision],
                       cwd=ROOT, check=True)
        files = sorted(path for path in stage.rglob("*") if path.is_file())
        checks = stage / "SHA256SUMS"
        checks.write_text("".join(f"{sha256(path.read_bytes()).hexdigest()}  {path.relative_to(stage)}\n"
                                  for path in files))
        with ZipFile(out, "x", compression=ZIP_DEFLATED) as archive:
            for path in [*files, checks]:
                archive.write(path, path.relative_to(stage))
    print(out)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    parser.add_argument("--paper", type=Path, help="include the working-paper PDF in the handoff")
    args = parser.parse_args()
    if args.output.exists():
        parser.error("choose a new ZIP path")
    if args.paper and (not args.paper.is_file() or args.paper.suffix.lower() != ".pdf"):
        parser.error("--paper must point to the paper PDF")
    bundle(args.output.resolve(), args.paper)
