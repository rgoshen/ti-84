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

# Changelog

All notable changes to this project are documented in this file. It is generated
automatically by [semantic-release](https://github.com/semantic-release/semantic-release)
from [Conventional Commits](https://www.conventionalcommits.org/) — do not edit by hand.
