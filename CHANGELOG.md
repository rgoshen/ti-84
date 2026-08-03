# Changelog

All notable changes to this project are documented in this file. It is generated
automatically by [semantic-release](https://github.com/semantic-release/semantic-release)
from [Conventional Commits](https://www.conventionalcommits.org/) — do not edit by hand.

# [0.11.0](https://github.com/rgoshen/ti-84/compare/v0.10.0...v0.11.0) (2026-08-03)


### Bug Fixes

* **explorer:** address PR review findings on tan wave feature ([e48c7da](https://github.com/rgoshen/ti-84/commit/e48c7dae2083b52866c341947ead7bb1142a0eab))
* **explorer:** resolve whole-branch review findings for tan wave feature ([3a525b6](https://github.com/rgoshen/ti-84/commit/3a525b6a6b674c8bcec7f13a67fd5caf16ad5f0d))


### Features

* **explorer:** add exactTangent alongside exactCoordinates ([e216351](https://github.com/rgoshen/ti-84/commit/e216351303cfa450bb26912379b299fb4bfc398c))
* **explorer:** add tan's y-domain, nullable waveValue, and asymptote positions ([ccbbefe](https://github.com/rgoshen/ti-84/commit/ccbbefe3ca4f788f85b35bded28c27a078302fc4))
* **explorer:** add the tan coordinate readout with visible r-cancellation ([0a794d3](https://github.com/rgoshen/ti-84/commit/0a794d3bdacda94165b5075a422c1cae2099ce20))
* **explorer:** draw a clamped tangent segment in the angle diagram ([eb03d5a](https://github.com/rgoshen/ti-84/commit/eb03d5a3211f038dd5145bdd2d591f7445effa6c))
* **explorer:** rescale buildWaveSvg per function and draw tan's asymptotes ([d67df56](https://github.com/rgoshen/ti-84/commit/d67df561681eee33c0c71f23e9e4964a66a3de06))
* **explorer:** trace the tan curve as exact-break subpaths ([ed772fb](https://github.com/rgoshen/ti-84/commit/ed772fbf8fa2e67e0603bb400e33d61ab81841c6))
* **explorer:** wire tan θ into the Angle Explorer UI and export ([5174bdc](https://github.com/rgoshen/ti-84/commit/5174bdcf81d2668cceaa71e8c264b51e9216a703))

# [0.10.0](https://github.com/rgoshen/ti-84/compare/v0.9.0...v0.10.0) (2026-08-03)


### Bug Fixes

* **explorer:** suppress colliding standard-angle labels among neighbors ([e21aa63](https://github.com/rgoshen/ti-84/commit/e21aa63b580fbd2dad412abb2df8481fcab52f20))


### Features

* **explorer:** add circle-labels and standard-angles controls ([3a4ca18](https://github.com/rgoshen/ti-84/commit/3a4ca1866a5ed1011872c871d5e280fb4ea92e55))
* **explorer:** add standard-angle label module ([19f514d](https://github.com/rgoshen/ti-84/commit/19f514d7fbf3301a88a49e0aba7e95baedef4af9))
* **explorer:** add unit-aware counting ticks ([1f31ab6](https://github.com/rgoshen/ti-84/commit/1f31ab6fe7ad3bd06cf4ce502a16779ae5304ace))
* **explorer:** carry circle labels and standard angles into export ([aaa5d3a](https://github.com/rgoshen/ti-84/commit/aaa5d3a15ad71c6f8bfb3d65096d7cb1f0204d41))
* **explorer:** draw standard-angle ring with three-way label priority ([87f6dfb](https://github.com/rgoshen/ti-84/commit/87f6dfbf513b784d071f3bcc98a1f8a264c04364))

# [0.9.0](https://github.com/rgoshen/ti-84/compare/v0.8.0...v0.9.0) (2026-07-30)


### Bug Fixes

* **explorer:** resolve final review findings on the wave projection branch ([0cc63e8](https://github.com/rgoshen/ti-84/commit/0cc63e80c3f4288b104d73d8520998d5418626d2))
* **explorer:** state the θ=0 identity once instead of four times ([78d8b5b](https://github.com/rgoshen/ti-84/commit/78d8b5b22e10a2b1eba6349fca6e94548109a722))


### Features

* **explorer:** add the sin/cos wave selector to the Angle Explorer ([7962252](https://github.com/rgoshen/ti-84/commit/7962252f6cdfd277842051219f3a779d077e1981))
* **explorer:** add wave strip scales, π/4 ticks and values ([5bac8d3](https://github.com/rgoshen/ti-84/commit/5bac8d3b8d72c1ebad804d9b429fafec725aee1f))
* **explorer:** build the wave strip's SVG ([290cb24](https://github.com/rgoshen/ti-84/commit/290cb2421435c477570704b0b756daf28160a68d))
* **explorer:** carry the wave into the exported artifact ([3967265](https://github.com/rgoshen/ti-84/commit/39672658167ba44807c826f40794de6bbf6e97e5))
* **explorer:** default the angle to 0 degrees ([f5b0052](https://github.com/rgoshen/ti-84/commit/f5b00528be700bb852c7d24c143d0c291c174ff7))
* **explorer:** highlight the reference-triangle leg the wave plots ([de4864a](https://github.com/rgoshen/ti-84/commit/de4864a16c2ad267d9c995814c9d5f08c90f9d5b))
* **explorer:** trace the wave from 0 to θ ([93bdf34](https://github.com/rgoshen/ti-84/commit/93bdf34ad684be651cc38c35c30524670ca6757f))
* **theme:** add the wave colour to the explorer palette ([d19bb83](https://github.com/rgoshen/ti-84/commit/d19bb8356f4fcd7e1f3502ae834508602acecfd6))

# [0.8.0](https://github.com/rgoshen/ti-84/compare/v0.7.0...v0.8.0) (2026-07-28)


### Bug Fixes

* **export:** make the value table section optional ([f742b87](https://github.com/rgoshen/ti-84/commit/f742b875845e4e80185d8c5dbdc67621accdc4ec))
* **graphing:** preserve INVALID reason instead of misreporting it as DEGENERATE ([ad3f8d1](https://github.com/rgoshen/ti-84/commit/ad3f8d1752d57e3e9383591800b66e5baed3bc3c))
* **graphing:** reword the relation refusal to cover vertical lines ([1940060](https://github.com/rgoshen/ti-84/commit/194006046f1af567d1b0aaa1f524187566733708))
* **graphing:** stop relations rendering false mathematics ([5ee25c1](https://github.com/rgoshen/ti-84/commit/5ee25c14de7ee76400351aa7ad1feb1e3ac9fea8))


### Features

* **explorer:** point relations at the graphing calculator ([da41057](https://github.com/rgoshen/ti-84/commit/da410570ef44bcaae680c9604af930e6606753f5))
* **graphing:** distinguish a vertical line from a degenerate equation ([fb195f5](https://github.com/rgoshen/ti-84/commit/fb195f53318b95a6d929c22b2b719f1c20719cef))
* **graphing:** draw relations with function-plot's implicit sampler ([6c71699](https://github.com/rgoshen/ti-84/commit/6c71699753dfe8d4ae6a5b437f819ea98c47b434))
* **graphing:** route relations and vertical lines to the implicit renderer ([d93c46e](https://github.com/rgoshen/ti-84/commit/d93c46e75b9e035eeed3f805930738dc4238c579))
* **graphing:** stand down single-valued features for relations ([da4151c](https://github.com/rgoshen/ti-84/commit/da4151c35c4085a592fc7d20e3c05c63386eee25))

# [0.7.0](https://github.com/rgoshen/ti-84/compare/v0.6.2...v0.7.0) (2026-07-28)


### Bug Fixes

* **a11y:** render equations with MathML so screen readers can read them ([e5836fe](https://github.com/rgoshen/ti-84/commit/e5836fe72566d1ee8bc6fdf0cdae331f0cc05db0))
* **explorer:** carry the entered equation into the Function Explorer export ([4aae911](https://github.com/rgoshen/ti-84/commit/4aae911c93536aa5c2eab2f78d4d0adbd7cf9ea5))
* **graphing:** keep long equation labels inside their row ([abd0061](https://github.com/rgoshen/ti-84/commit/abd00612a71ffa44cc46db890d1fc531e2038796))
* **graphing:** report proven non-linearity ahead of insufficient samples ([720c592](https://github.com/rgoshen/ti-84/commit/720c5923b754f4fb9133588becc0e25b60593e6d))
* **graphing:** short-circuit the y= path so shifted domains still plot ([64e7f1d](https://github.com/rgoshen/ti-84/commit/64e7f1da5e11cf3246cf9f611b7af135627d3308))
* **graphing:** skip undefined samples in the y-linearity probe ([94c7132](https://github.com/rgoshen/ti-84/commit/94c71322ab0bb7769cff1f0e6801f31db5a17784))


### Features

* **explorer:** accept full equations in the function explorer ([0a7c68d](https://github.com/rgoshen/ti-84/commit/0a7c68daa7bb6ad03dd29fe8d3cf5a16b2311c0a))
* **explorer:** show the entered equation beside the solved form ([519c33f](https://github.com/rgoshen/ti-84/commit/519c33f5048f8ef092f5dbc184bec9e42b73c3f0))
* **graphing:** accept full equations in the graphing calculator ([356523d](https://github.com/rgoshen/ti-84/commit/356523d42f3affa070eeb8c39274e53ff30f306d))
* **graphing:** add parseEquationInput with per-reason messages ([e148f51](https://github.com/rgoshen/ti-84/commit/e148f51ec0c526637d4bccfd0f1866d89fc228a7))
* **graphing:** render entered equations to LaTeX side by side ([ac047e4](https://github.com/rgoshen/ti-84/commit/ac047e446e90b7b8f0ae72f86d53f53472c7b1e5))
* **graphing:** show entered and solved forms for rearranged equations ([eeff91b](https://github.com/rgoshen/ti-84/commit/eeff91b2e0412e09be95e052e24bc73150351f0a))
* **graphing:** solve equations linear in y via symbolic probe ([6a41483](https://github.com/rgoshen/ti-84/commit/6a41483f83caa4c577d283d214b1a1981fe8830c))
* **graphing:** split equation input on a bare equals sign ([15c5bbb](https://github.com/rgoshen/ti-84/commit/15c5bbb39d6a2f882694ebe86485eb934c3a5fc8))

## [0.6.2](https://github.com/rgoshen/ti-84/compare/v0.6.1...v0.6.2) (2026-07-28)


### Bug Fixes

* **explorer:** hide a radian tick label the coordinate readout would cover ([6e4efd8](https://github.com/rgoshen/ti-84/commit/6e4efd80f5955ad061d3ed75ad9a2fb15dc1f9a2))

## [0.6.1](https://github.com/rgoshen/ti-84/compare/v0.6.0...v0.6.1) (2026-07-28)


### Bug Fixes

* **docker:** revalidate HTML so a release is not masked by browser cache ([67965f1](https://github.com/rgoshen/ti-84/commit/67965f108025616e19fcc14c8ed04a54467bc88c))

# [0.6.0](https://github.com/rgoshen/ti-84/compare/v0.5.0...v0.6.0) (2026-07-28)


### Bug Fixes

* **explorer:** clamp the coordinate label instead of flipping it across the origin ([358e261](https://github.com/rgoshen/ti-84/commit/358e2616d5151db9e54a6d8c05b5c7aec7d8dabc))
* **explorer:** give the diagram figure its own e2e test id ([3d346b1](https://github.com/rgoshen/ti-84/commit/3d346b154a076481cdcc42eda1940603e8a36415))
* **explorer:** size the coordinate label width from its text ([f55b7aa](https://github.com/rgoshen/ti-84/commit/f55b7aaf2c40baef67768b881fcd811d738252f2))
* **explorer:** speak a whole coordinate once instead of stuttering it ([5ba7ace](https://github.com/rgoshen/ti-84/commit/5ba7acea2fa416d1373add4a3496f13251359c33))


### Features

* **explorer:** coordinate label on the angle diagram ([d6e9d7b](https://github.com/rgoshen/ti-84/commit/d6e9d7b26df214685cb281e4665a535729871622))
* **explorer:** coordinate readout strings ([02a75d6](https://github.com/rgoshen/ti-84/commit/02a75d6f2b12085080badd72a403be1c56ed5081))
* **explorer:** exact unit-circle coordinate maths ([ced8d37](https://github.com/rgoshen/ti-84/commit/ced8d37ba494ab9f5c038b3e94dfc77a0056592c))
* **explorer:** export the terminal point and cover it end to end ([db2f1cc](https://github.com/rgoshen/ti-84/commit/db2f1cc490a4074c806a3b97d3ff323e7ea73e4b))
* **explorer:** render the coordinates block ([b8c3c8e](https://github.com/rgoshen/ti-84/commit/b8c3c8e393277f68ab53bebe642b1282ce4197ca))

# [0.5.0](https://github.com/rgoshen/ti-84/compare/v0.4.0...v0.5.0) (2026-07-24)


### Bug Fixes

* **build:** drop deprecated baseUrl so tsc passes on TypeScript 6 ([9fffe22](https://github.com/rgoshen/ti-84/commit/9fffe227a1e44b3284658622c7b17191274dbf85))
* **explorer:** format the angle slider value so it never shows float noise ([fbceee2](https://github.com/rgoshen/ti-84/commit/fbceee26cda188b7a76ed922056dc79fda94fea5))
* **explorer:** keep reset clickable and round the diagram's accessible name ([7fe3fbe](https://github.com/rgoshen/ti-84/commit/7fe3fbe922744240ca7e8be52528d258af4577ec))
* **explorer:** round near-integer degrees so exact fractions render correctly ([3041e9e](https://github.com/rgoshen/ti-84/commit/3041e9e65371fb1ab02d0e18754d3535d7124aaa))
* **explorer:** scope the input error to its own field and fix the reserved row height ([b2dc4e5](https://github.com/rgoshen/ti-84/commit/b2dc4e5fdea778e9040940f340e90cfa0de8170d))
* **explorer:** speak plain prose and show a sign-correct arc equation ([8f46456](https://github.com/rgoshen/ti-84/commit/8f46456a00ec1a65985c9ba93436223fc49ca036))
* **explorer:** use a contrast-checked axis colour for diagram reference marks ([2a611c1](https://github.com/rgoshen/ti-84/commit/2a611c15c73f29cdab3f6bd3485c7505435da248))
* **nav:** add the Angle Explorer to the header explorers dropdown ([a753da1](https://github.com/rgoshen/ti-84/commit/a753da12b0846092edc2d3add49e1ebc8c13aedf))
* **ui:** forward slider aria-valuetext to the thumb ([34659fb](https://github.com/rgoshen/ti-84/commit/34659fbfcb202cb8a263914364666e0a2320763d))


### Features

* **explorer:** add bidirectional degree and radian input fields ([fd1832c](https://github.com/rgoshen/ti-84/commit/fd1832c49927cad6cda822273bf6870bc71d69a7))
* **explorer:** add exact angle arithmetic for degrees and radians ([4daf28c](https://github.com/rgoshen/ti-84/commit/4daf28c392d071f9b7b31d5dc58fda438dfa1bc6))
* **explorer:** add PNG and PDF export to the Angle Explorer ([1c2a6c4](https://github.com/rgoshen/ti-84/commit/1c2a6c43407f620801e7fce58feaccf4adb7e3e7))
* **explorer:** add spoken-word angle formatters for screen readers ([df28d88](https://github.com/rgoshen/ti-84/commit/df28d88ff59fb88195c5ba0804309585e283b87a))
* **explorer:** add SVG arc geometry with full-turn split handling ([ed9a1d1](https://github.com/rgoshen/ti-84/commit/ed9a1d14ed63c4f7b56063bc053e23ac2ae92635))
* **explorer:** add the five-way KaTeX readout with arc length ([9652800](https://github.com/rgoshen/ti-84/commit/96528008dff3c785aa0d287aeac64539c1795004))
* **explorer:** announce angle conversions to screen readers ([84920d5](https://github.com/rgoshen/ti-84/commit/84920d5861f1d9ecbb26b733dacf42dae6ebb4f1))
* **explorer:** credit the source demonstration in the UI ([0036a3c](https://github.com/rgoshen/ti-84/commit/0036a3c5c1ddb25b376d314970ea99e6ca6091d2))
* **explorer:** parse degree and radian input with a whitelist guard ([a149f43](https://github.com/rgoshen/ti-84/commit/a149f435e37b8158d205caf39dba25b40c36f9be))
* **explorer:** render the angle diagram with sliders and reset ([b24cf6c](https://github.com/rgoshen/ti-84/commit/b24cf6c20a97fcaf3edbeb15f5a0856d891a6f63))
* **explorer:** scaffold the Angle Explorer route and catalog card ([a5b7376](https://github.com/rgoshen/ti-84/commit/a5b737679a5e39217aaaf1b5657b908e5feea893))
* **explorer:** show the exact pi form alongside the decimal radians ([9370157](https://github.com/rgoshen/ti-84/commit/9370157e0bcd94f9cf2be5f742b3eb2c23aab4c5))
* **export:** register the angle-explorer tool slug ([b6a5bb5](https://github.com/rgoshen/ti-84/commit/b6a5bb58c47488477f4e1247fa5ed8d92912cd63))

# [0.4.0](https://github.com/rgoshen/ti-84/compare/v0.3.0...v0.4.0) (2026-07-13)


### Bug Fixes

* **details:** move live panels into control columns ([13d3760](https://github.com/rgoshen/ti-84/commit/13d3760669727b20c82a748d004ca14b9a0d5da2))
* **export:** match approved graph artifact ([1375539](https://github.com/rgoshen/ti-84/commit/137553964acddcbdbab85dd7e3f13a4255966beb))
* **export:** preserve existing status landmarks ([9cc2186](https://github.com/rgoshen/ti-84/commit/9cc2186255e660e609ea7caefd8369356b728ded))
* **export:** preserve function analysis confidence ([d95502f](https://github.com/rgoshen/ti-84/commit/d95502f04eb5a81f25c171e0513db6c43ec57341))
* **export:** preserve wide artifact composition ([2e60507](https://github.com/rgoshen/ti-84/commit/2e6050752137956ade5b4950736cd42c10a9ed1e))
* **export:** regenerate visual baselines on Linux to match CI ([21106c0](https://github.com/rgoshen/ti-84/commit/21106c07f79a5826e7af21bd14d22239d2e3856b))
* **export:** use global domain and range semantics ([8c6d499](https://github.com/rgoshen/ti-84/commit/8c6d499041786d5816e9da33c2f3a690bd414b25))


### Features

* **details:** add live function detail panels ([96c98d2](https://github.com/rgoshen/ti-84/commit/96c98d24a9b742be740015ad3eb16e85e162807b))
* **details:** use interval notation in transformations ([fdad21e](https://github.com/rgoshen/ti-84/commit/fdad21eef2886e548688b8186e81d018e1a36dcd))
* **explorer:** export function results ([f183c04](https://github.com/rgoshen/ti-84/commit/f183c04d65313209fa62785adfa15ad16c69eadf))
* **explorer:** export transformation results ([9f35f80](https://github.com/rgoshen/ti-84/commit/9f35f806cfdb3d3264657e41028f84a85cfe4521))
* **explorer:** share live and exported function details ([60715fb](https://github.com/rgoshen/ti-84/commit/60715fb8f33c1592916320ffef56b84aad693c16))
* **export:** add png and pdf download adapters ([7ee9677](https://github.com/rgoshen/ti-84/commit/7ee96772b50f05be47940164a0bb69bacf484231))
* **export:** add read-only artifact controller ([06265ce](https://github.com/rgoshen/ti-84/commit/06265ce09891e52dde4394d339fe39e6398b648c))
* **export:** analyze graph function details ([85803ba](https://github.com/rgoshen/ti-84/commit/85803ba0b78734d956723ef4dd3fb51d2c59c569))
* **export:** define graph artifact contract ([a18505b](https://github.com/rgoshen/ti-84/commit/a18505bdc51c225ba8e9feaf6303447c6889cc41))
* **export:** show mathematical function details ([a995d9c](https://github.com/rgoshen/ti-84/commit/a995d9c5c5540556fc186da207a8c19d2aef78b9))
* **export:** timestamp downloads with local time ([8a3881f](https://github.com/rgoshen/ti-84/commit/8a3881f4d2aada8228c310a97c653dffcdc14e9e))
* **export:** use interval notation for graph details ([526e409](https://github.com/rgoshen/ti-84/commit/526e409f2c3ff5e849abb39b966a62c7602b8b09))
* **graphing:** export graph results ([3e7280f](https://github.com/rgoshen/ti-84/commit/3e7280f82f543611d8d8f4299d620bf801c2e798))
* **graphing:** show live function details ([6225354](https://github.com/rgoshen/ti-84/commit/62253546a330add900a7379495f23a971aca2093))

# [0.3.0](https://github.com/rgoshen/ti-84/compare/v0.2.2...v0.3.0) (2026-07-12)


### Bug Fixes

* **explorer:** polish function details panel per whole-branch review ([4493dbf](https://github.com/rgoshen/ti-84/commit/4493dbff190080325b2c35b242755f4257e80a1e))


### Features

* **explorer:** add identity, cube root and natural log parents ([6cdfa22](https://github.com/rgoshen/ti-84/commit/6cdfa227479e10b969b901a71bf3fdaa4f60437b))
* **explorer:** add read-only function details panel ([a122a06](https://github.com/rgoshen/ti-84/commit/a122a06b963eec7cc1e1abf85c8d01756f9f0a95))
* **explorer:** compose the concrete transformed equation ([3bcc182](https://github.com/rgoshen/ti-84/commit/3bcc182c982d6022aa35d2c1c85ca020cbf19739))
* **explorer:** declare domain, range, asymptotes and inverse per parent ([692e5eb](https://github.com/rgoshen/ti-84/commit/692e5ebf97634269b714f1dd0a56bfea16b54b9c))
* **explorer:** derive domain, range, intercepts and asymptotes for g(x) ([5841d5f](https://github.com/rgoshen/ti-84/commit/5841d5f3001e460896956fb5ae62321fda03bdc2))
* **explorer:** give each parent a display template for its own notation ([b77c52c](https://github.com/rgoshen/ti-84/commit/b77c52cb670d7a41556ed111e30ad2e819c4f9f9))
* **explorer:** move the parent picker to a dropdown ([51ede1d](https://github.com/rgoshen/ti-84/commit/51ede1d78e7abd392b1e5c2c7bf408e67c4af7bc))
* **explorer:** show only the real equation, never f(x) ([a98ea0f](https://github.com/rgoshen/ti-84/commit/a98ea0f67b51ce7384a0e4823d2df53ff7313a54))
* **explorer:** show the concrete equation in the readout ([9b0f588](https://github.com/rgoshen/ti-84/commit/9b0f58837554b1b9e7340b375201e178e39f6aa6))

## [0.2.2](https://github.com/rgoshen/ti-84/compare/v0.2.1...v0.2.2) (2026-07-12)


### Bug Fixes

* **docker:** make compose pull the released GHCR image instead of only building ([89aa966](https://github.com/rgoshen/ti-84/commit/89aa966540e1a6343c498ede9fea3e2b697aee38))

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
