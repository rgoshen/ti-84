# Changelog

All notable changes to this project are documented in this file. It is generated
automatically by [semantic-release](https://github.com/semantic-release/semantic-release)
from [Conventional Commits](https://www.conventionalcommits.org/) — do not edit by hand.

## [0.2.1](https://github.com/rgoshen/ti-84/compare/v0.2.0...v0.2.1) (2026-07-12)


### Bug Fixes

* **release:** keep the changelog title on top, backfill 0.1.0, and stop compose pulling a local image ([81105d9](https://github.com/rgoshen/ti-84/commit/81105d92ef893cba0167e29d33dfdaa68dcbde23))

# [0.2.0](https://github.com/rgoshen/ti-84/compare/v0.1.0...v0.2.0) (2026-07-11)

### Bug Fixes

* **docker:** wire the Transformation Explorer title build-arg ([ef17e1c](https://github.com/rgoshen/ti-84/commit/ef17e1cbcb8c34c179ddb7c90e61a3a3aed59107))
* **explorer:** ease-out limit sweeps so the point glides along the window edge to the wall ([b0df155](https://github.com/rgoshen/ti-84/commit/b0df155064b93229af5868d67b0855d3ab95dc55))
* **explorer:** no default function; point stops at the window edge (visible-range model) ([f6c9f0b](https://github.com/rgoshen/ti-84/commit/f6c9f0b8bbc7e92e6b4269ad0e6b43d3c51dd328))
* **nav:** close the hover gap so the Explorers dropdown items are reachable ([cdff6a7](https://github.com/rgoshen/ti-84/commit/cdff6a76b697a7f6b9d5dd3c69240d03f43b9bd1))
* **nav:** put the caret inside the Explorers nav item and fix intro text spacing ([ce63544](https://github.com/rgoshen/ti-84/commit/ce63544849542cd7c15a277f68e7bcb5537f8e10))
* **ui:** forward slider accessible name to the thumb (role=slider) ([8fcddea](https://github.com/rgoshen/ti-84/commit/8fcddea6cfc099b773f2f940b8da57daf786c796))

### Features

* **explorer:** add branch geometry with anti-teleport drag clamp ([928eef3](https://github.com/rgoshen/ti-84/commit/928eef3d7bf69948437d6bac004a1bbb52756c11))
* **explorer:** add function-plot renderer, island, and Explorers section ([4092466](https://github.com/rgoshen/ti-84/commit/4092466b458c5997bee353b57be92b89a2b074f7))
* **explorer:** add ghost parent colour to explorer palette ([1710e5f](https://github.com/rgoshen/ti-84/commit/1710e5f66e8a0ce132f432e1738eec79a49e2f09))
* **explorer:** add limit-sweep path generator (sweepX) ([07f292b](https://github.com/rgoshen/ti-84/commit/07f292b380a133d4add628456d4f59c653538932))
* **explorer:** add parent-function catalog for transformations ([f26ff3b](https://github.com/rgoshen/ti-84/commit/f26ff3b42a513190afc152ca142a68221705b55d))
* **explorer:** add points toggle and f(x)/g(x) value table to the Transformation Explorer ([f2b108f](https://github.com/rgoshen/ti-84/commit/f2b108fe63587cad685256186837836fb0f298d9))
* **explorer:** add points toggle and value table to the Function Explorer ([5bee19a](https://github.com/rgoshen/ti-84/commit/5bee19a7964e412ea5289a290cf2b53a11ab97ab))
* **explorer:** add the point shape picker to both explorers, matching the graphing calculator ([25daec0](https://github.com/rgoshen/ti-84/commit/25daec0be943913c911bd984d9e5caa385fea309))
* **explorer:** add theme-aware overlay palette (explorerColors) ([1bf03d8](https://github.com/rgoshen/ti-84/commit/1bf03d87d4bdee0be515f250ec3f947aa38dedc4))
* **explorer:** add Transformation Explorer island (sliders, reflects, readout) ([e7b984d](https://github.com/rgoshen/ti-84/commit/e7b984d9a61e46a5c01c646dfcf1e8c43663c6cf))
* **explorer:** add Transformation Explorer route, hub card, and title ([7d89583](https://github.com/rgoshen/ti-84/commit/7d8958307a20d6d0523d537e8163805f6c805729))
* **explorer:** compose transformed expression g(x)=a·f(b(x−h))+k ([b02a1a6](https://github.com/rgoshen/ti-84/commit/b02a1a63922115841a5d93b991d319661b2c1b4f))
* **explorer:** detect vertical asymptotes and classify end behaviour ([ebf18fa](https://github.com/rgoshen/ti-84/commit/ebf18fa31edb85052d91d44d8ea0c5e583a30bd4))
* **explorer:** export makeMarker and add a shared value table ([e8298fd](https://github.com/rgoshen/ti-84/commit/e8298fd4579016324b0c1d3f059bbcb087c568b3))
* **explorer:** export shared plot helpers and add Slider wrapper ([d2bbcea](https://github.com/rgoshen/ti-84/commit/d2bbceabf178ebbcc33d4622ca73fa2ec3e3585d))
* **explorer:** generate arrow-notation readout (describeReadout) ([1748d2e](https://github.com/rgoshen/ti-84/commit/1748d2e7a2b01a03d59e338f0c2234e08cbba3d9))
* **explorer:** narrate transformations in plain English (describeTransform) ([a5ec280](https://github.com/rgoshen/ti-84/commit/a5ec280e711b373b3f87f56402a1ede74893376b))
* **explorer:** render dashed parent + solid transformed curve ([0601f8d](https://github.com/rgoshen/ti-84/commit/0601f8ddc7fcbe6b409abcaecd2fb649b9dc86ca))
* **nav:** add Explorers dropdown and point the home card at the hub ([62205d7](https://github.com/rgoshen/ti-84/commit/62205d7eb88020c1d1dcb243788b302c3063510c))

# 0.1.0 (2026-06-30)

### Bug Fixes

* **graphing:** tighten hover e2e discrimination and address review nits ([09e5896](https://github.com/rgoshen/ti-84/commit/09e589621a3b15c88fc42612ce51e54db2182b19))
* **graphing:** make dark-mode grid and x/y axes legible ([60db54a](https://github.com/rgoshen/ti-84/commit/60db54a1ce16cd35c68a31dcd30a03c16120289a))
* **docker:** serve clean URLs without a port-dropping 301 redirect ([fda6834](https://github.com/rgoshen/ti-84/commit/fda6834f1f8f3a18cfe331d91efe35583ccf9a8b))
* keep point markers on the curve during zoom and pan ([558898c](https://github.com/rgoshen/ti-84/commit/558898c9e91e32a978649b33bd98fba589fa403b))
* align point markers by appending overlay into Function Plot canvas group ([6c6d663](https://github.com/rgoshen/ti-84/commit/6c6d6636a1d74e76714428ba0c49e2570f465b80))
* make existing x=0/y=0 grid lines bolder instead of drawing new ones ([4e8dce4](https://github.com/rgoshen/ti-84/commit/4e8dce4b574e2668c9030885c8ae280eba046ed9))
* read real axis tick positions so points and origin axes align with plot ([1d31348](https://github.com/rgoshen/ti-84/commit/1d3134820f9b0324e48881c56f885884ede29b14))
* bold origin axes, correct inverted points, render triangles via path ([357f45b](https://github.com/rgoshen/ti-84/commit/357f45b44bc687a76aac704acf3780eecb6e12e9))
* make dark-mode lines visible and pretty-print equations with KaTeX ([0a69505](https://github.com/rgoshen/ti-84/commit/0a69505e4c8a0aeae87f706ec9aa6d8494afb7b7))
* simplify theme default logic so THEME_DEFAULT env var applies cleanly ([bb141da](https://github.com/rgoshen/ti-84/commit/bb141daa8c892801a7e9d2566e642933999487a3))
* restore default host port to 8084 across compose and docs ([90e7846](https://github.com/rgoshen/ti-84/commit/90e7846d78cb128ef705b40bef670d2a9b8585dc))
* remove stray HOST_PORT env var that broke compose port mapping ([c7e5463](https://github.com/rgoshen/ti-84/commit/c7e54638a0024a3a87441b74b7408726a80d700c))
* replace text page with functional graphing calculator using function-plot ([e15e607](https://github.com/rgoshen/ti-84/commit/e15e60728f67ad8fb0ee50bde5ce9de2850e347b))

### Features

* **graphing:** floating coordinate tooltip on marker hover ([d139f1c](https://github.com/rgoshen/ti-84/commit/d139f1c9d9224cdd6e260ec6cd590f1b16962e98))
* **graphing:** suppress function-plot native crosshair tip ([2b8da84](https://github.com/rgoshen/ti-84/commit/2b8da8420b30b207301b0e5982bce29910914b43))
* **graphing:** add pure hover-readout helpers and constants ([7b229f8](https://github.com/rgoshen/ti-84/commit/7b229f8d2644cf2120698486f6a29fa8b7c02f36))
* **graphing:** restore bold zero-axis gridlines ([806129c](https://github.com/rgoshen/ti-84/commit/806129c4af0eee6872949bacb107aaf24ae65c1a))
* complete Astro migration — shared shell, /ti-84 page, Docker cutover ([2badec2](https://github.com/rgoshen/ti-84/commit/2badec24a82e932cdb5104f9c218ae13bd9c1edf))
* **graphing:** port graphing calculator to a React island ([881a901](https://github.com/rgoshen/ti-84/commit/881a901914eb311381580c9471867d9dfb7d98a4))
* **build:** Astro + TS + Tailwind scaffold and tested math core ([512d87f](https://github.com/rgoshen/ti-84/commit/512d87fafc518d49d8758ed2115785bb93c7f912))
* plot point markers at whole-number gridline crossings ([05e7ca7](https://github.com/rgoshen/ti-84/commit/05e7ca7ba8d2bc1faa2a6baee985fe765bfe8ff0))
* add docker-compose with env-var-driven site defaults via envsubst ([fe782ec](https://github.com/rgoshen/ti-84/commit/fe782ec73598493f601feeb56a11707b3a3d79bd))
* fix dark mode lines, add color picker, value table, and point shapes ([bb1c7cf](https://github.com/rgoshen/ti-84/commit/bb1c7cf37728315baff5cc1d51111376c22a438e))
* add nav menu and Graphing Calculator Online page with themed content ([ba36a41](https://github.com/rgoshen/ti-84/commit/ba36a41559f2c873fd9e569c1a4015a74c56dd06))
* add TI-84 calculator website with theme toggle and Docker ([244b1e1](https://github.com/rgoshen/ti-84/commit/244b1e1ae1c5f3effb392da24ae737a2181f846c))
