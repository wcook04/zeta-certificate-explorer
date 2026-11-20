"""Summarise Lean trace.profiler Firefox JSON files: inclusive trace time per frame name, summed
over threads. Usage: profile_summary.py RUN_ID FILE... > summary.json

The profiler's weights are trace durations (weightType tracing-ms). Inclusive totals of nested
frames overlap, threads run concurrently, and nothing here is a per-row or per-node cost.
"""
import json
import sys
from collections import Counter


def summarise(path):
    d = json.load(open(path))
    incl = Counter()
    weight_types = set()
    for th in d["threads"]:
        st, ft, fn, stk, s = th["stringArray"], th["frameTable"], th["funcTable"], th["stackTable"], th["samples"]
        weight_types.add(s.get("weightType"))
        w = s.get("weight") or [1] * len(s["stack"])
        for si, wt in zip(s["stack"], w):
            names = set()
            while si is not None:
                names.add(st[fn["name"][ft["func"][stk["frame"][si]]]])
                si = stk["prefix"][si]
            for n in names:
                incl[n] += wt or 0
    return {"file": path.split("/")[-1], "weight_types": sorted(map(str, weight_types)),
            "inclusive_ms_by_frame": dict(incl.most_common(40))}


print(json.dumps({"run_id": sys.argv[1], "profiles": [summarise(p) for p in sys.argv[2:]]}, indent=1))
