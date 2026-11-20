# Zero certificates up to height 10,011

**[Open the site](https://wcook04.github.io/zeta-certificate-explorer/)**

Salvatore Mercuri and Bhavik Mehta's [Lean verification of the Riemann hypothesis](https://github.com/smmercuri/zeta)
proves that every nontrivial zero of the Riemann zeta function with |Im(s)| < 10,011 lies on the
critical line. It rests on 10,156 intervals of height, each certified to contain a zero of
Hardy's Z function, and on Turing's method to show there are no other zeros.

This site lists every one of those intervals. For each it shows, read from the compiled proof:

- the interval each end's approximation Z̃ is proved to lie in, and its sign;
- the proved bound on the approximation's error, and the height where that bound was proved;
- the resulting enclosure for true Z, and its minimum distance from zero;
- which formula the certificate uses: Euler–Maclaurin below t = 149.5, Riemann–Siegel above it,
  and for 74 intervals Riemann–Siegel with its first correction term C₁.

Each endpoint can also be compared with the certificate for the neighbouring interval that meets
it. This is useful when two certificates use different approximation formulas at the same height.

For fourteen intervals it also opens the computation Lean checked, as a graph of the quantities
the certificate encloses. Each card is one quantity and the interval it is proved to lie in; a
card unfolds into the quantities it is built from. The panel gives the lemma that
produced the value and the arithmetic obligations present at that step. Buttons jump directly to
the left approximation, right approximation or error bound. The graph describes the successful
proof dependencies; it does not claim to replay the construction history or measure kernel work.

The verification, its Lean and its data are the authors'. The extraction, this site and its
plain-language labels were made by Will Cook with AI and have not been reviewed by the authors.

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

## Run it

```sh
cd web
npm install
npm run dev
```

To rebuild the data from a new extraction run, download its `zeta-certificate-trees` artifact
into `data/run/` and run `python3 tools/prepare.py data/run web/public/data`.

## Licence

Apache-2.0, as for `smmercuri/zeta` and Proof Reader.
