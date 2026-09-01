# Changelog

## [0.2.0](https://github.com/mkobit/bases-chartkit/compare/0.1.0...0.2.0) (2026-09-01)


### ⚠ BREAKING CHANGES

* **obsidian:** minAppVersion raised from 1.11.4 to 1.13.4; the plugin no longer loads on older Obsidian installs.

### Features

* add grouped multi-series boxplot fixture and assertions ([#426](https://github.com/mkobit/bases-chartkit/issues/426)) ([696bd95](https://github.com/mkobit/bases-chartkit/commit/696bd9587f40ce9fa5957d5b6ff2f6c8738c1a98))
* add OpenSpec validation PostToolUse hook to .claude/settings.json ([#394](https://github.com/mkobit/bases-chartkit/issues/394)) ([299ffea](https://github.com/mkobit/bases-chartkit/commit/299ffeae8c649b2f1f3f6c20dc6668f3ecdc9c54))
* **area:** add multi-series stacked-area demo to example vault ([#384](https://github.com/mkobit/bases-chartkit/issues/384)) ([cf38790](https://github.com/mkobit/bases-chartkit/commit/cf38790fdef9fa4630804b1979ec340b3e601b9a))
* **area:** add vintage-theme and flipped-axis demo variants ([#386](https://github.com/mkobit/bases-chartkit/issues/386)) ([87eba39](https://github.com/mkobit/bases-chartkit/commit/87eba3940192eeeb34d8708426e27edd459b3e96))
* **area:** expose stack toggle for stacked-area charts ([#383](https://github.com/mkobit/bases-chartkit/issues/383)) ([3fb17f0](https://github.com/mkobit/bases-chartkit/commit/3fb17f0d5cd86214e52558e93ba6a8658e19ccc4))
* **area:** plot Bases-formula-formatted dates on the x-axis ([#389](https://github.com/mkobit/bases-chartkit/issues/389)) ([3764046](https://github.com/mkobit/bases-chartkit/commit/3764046e0388940927d24109e8d055c31e0136e8))
* **bar:** add flipped-axis (horizontal bar) variant ([#403](https://github.com/mkobit/bases-chartkit/issues/403)) ([ae24afd](https://github.com/mkobit/bases-chartkit/commit/ae24afde326d4ce007eada78be632cc847501279))
* **calendar:** coherent 1..5 mood scale, sequential ramp, theme/color variants ([#400](https://github.com/mkobit/bases-chartkit/issues/400)) ([9256e5d](https://github.com/mkobit/bases-chartkit/commit/9256e5d03742eab56c115bbbcaae58f255e224a0))
* **candlestick:** explain OHLC hover, thin date axis, add variants ([#399](https://github.com/mkobit/bases-chartkit/issues/399)) ([6829bfd](https://github.com/mkobit/bases-chartkit/commit/6829bfd54eafc1a1528df9af99b49141b0a0df45))
* chart titles and per-instance explainability descriptions ([#373](https://github.com/mkobit/bases-chartkit/issues/373)) ([fe78da3](https://github.com/mkobit/bases-chartkit/commit/fe78da3afc6afcb5f302c3c384367dd16bf2d74c))
* **ci:** ratchet eslint-disable comment count against a checked-in budget ([#410](https://github.com/mkobit/bases-chartkit/issues/410)) ([f885d84](https://github.com/mkobit/bases-chartkit/commit/f885d84fcb6da7c916ccae0545081f9e6710b693))
* **ci:** ratchet tests/ cast count against a checked-in budget ([#412](https://github.com/mkobit/bases-chartkit/issues/412)) ([a80986f](https://github.com/mkobit/bases-chartkit/commit/a80986fd93197593da8373a68d5ebf8178279374))
* **e2e:** support light/dark theme parametrization in the Obsidian fixture ([#353](https://github.com/mkobit/bases-chartkit/issues/353)) ([06b4db0](https://github.com/mkobit/bases-chartkit/commit/06b4db010b63ba59f78451043c3a07530ddf9404))
* **example-vault:** restructure example vault to directory-per-chart-type ([#342](https://github.com/mkobit/bases-chartkit/issues/342)) ([5984900](https://github.com/mkobit/bases-chartkit/commit/598490093c2085301061575cf4556de20ca98fa5))
* **gantt:** phased multi-color demo data, variants, and date-axis formatting ([#396](https://github.com/mkobit/bases-chartkit/issues/396)) ([cd6b0e0](https://github.com/mkobit/bases-chartkit/commit/cd6b0e0ed7b5ca7672111b9beffce8362fef9764))
* **heatmap:** sequential ramp, legible cell labels, thinned time axis ([#398](https://github.com/mkobit/bases-chartkit/issues/398)) ([5d9b52f](https://github.com/mkobit/bases-chartkit/commit/5d9b52fab2d5c3701a9e19bc465f1f7709a0ecd5))
* **line:** add theme, flipped-axis, smoothed, and formula-date variants ([#397](https://github.com/mkobit/bases-chartkit/issues/397)) ([9927f2c](https://github.com/mkobit/bases-chartkit/commit/9927f2c1076dd2c109e015c302983d620657cf61))
* **lint:** enforce i18next for user-visible strings ([#380](https://github.com/mkobit/bases-chartkit/issues/380)) ([b848d0b](https://github.com/mkobit/bases-chartkit/commit/b848d0b774f25c73cd6b737d41e430c961c5892d))
* **polar-line:** explainability title, named axes, stacked variant ([#402](https://github.com/mkobit/bases-chartkit/issues/402)) ([56aefe7](https://github.com/mkobit/bases-chartkit/commit/56aefe7465c99ce7dffdea7f3dd98e26b42ea6ee))
* resolve file properties via BasesEntry getValue ([#428](https://github.com/mkobit/bases-chartkit/issues/428)) ([c31215e](https://github.com/mkobit/bases-chartkit/commit/c31215e512fc53c863c6e09de0693f43fe55b48c))
* **settings:** adopt declarative getSettingDefinitions settings API ([#420](https://github.com/mkobit/bases-chartkit/issues/420)) ([fb5483f](https://github.com/mkobit/bases-chartkit/commit/fb5483fe4b1b6dfe99371dc79d8ed45751def8b0))
* **survey:** add a dark-mode pass to the chart-type screenshot survey ([#354](https://github.com/mkobit/bases-chartkit/issues/354)) ([19a08e2](https://github.com/mkobit/bases-chartkit/commit/19a08e2322201d7aaaf2bac0edd4ab4c5b618f14))
* **tasks:** configure mise tasks for parallel checks and caching ([#424](https://github.com/mkobit/bases-chartkit/issues/424)) ([0c8915b](https://github.com/mkobit/bases-chartkit/commit/0c8915bb3a1a7a0bceaa086df7876585847da5cb))
* **theme-river:** explainability title, vertical variant, theme variant ([#401](https://github.com/mkobit/bases-chartkit/issues/401)) ([e4ecc12](https://github.com/mkobit/bases-chartkit/commit/e4ecc1214b5bc76bf8c4b105ccb56db813eb12f8))
* **vault-gen:** link generated examples to canonical ECharts gallery examples ([#407](https://github.com/mkobit/bases-chartkit/issues/407)) ([6e0180b](https://github.com/mkobit/bases-chartkit/commit/6e0180b8cbec0cdd3120eac70f5a2bd438734081))
* **views:** render visual map orient/type as dropdowns ([#381](https://github.com/mkobit/bases-chartkit/issues/381)) ([cd0f5bb](https://github.com/mkobit/bases-chartkit/commit/cd0f5bb4894446cd203cf46b42d4c728a4bbb3b0))
* **waterfall:** add connector lines and absolute-total bars ([#387](https://github.com/mkobit/bases-chartkit/issues/387)) ([e290e7f](https://github.com/mkobit/bases-chartkit/commit/e290e7f14eda365ed2387faae1f3d40b5c567fc6))
* **waterfall:** add vintage-theme and deltas-only demo variants ([#388](https://github.com/mkobit/bases-chartkit/issues/388)) ([5468f40](https://github.com/mkobit/bases-chartkit/commit/5468f40995843b4f07a19e884c1225af9ba7df2e))


### Bug fixes

* **boxplot-chart:** stop white fill from hardcoding a solid block in dark theme ([#349](https://github.com/mkobit/bases-chartkit/issues/349)) ([8160a1b](https://github.com/mkobit/bases-chartkit/commit/8160a1b945e6a1a608136e1e699c6a54e6c1d248))
* **bullet-chart:** adapt range bands and target marker to dark theme ([#348](https://github.com/mkobit/bases-chartkit/issues/348)) ([b378bb3](https://github.com/mkobit/bases-chartkit/commit/b378bb31b5772cafab27f8eb14ccb37a70c2823a))
* **charts:** batch of P2 visual/correctness fixes plus e2e tooltip foundation ([#358](https://github.com/mkobit/bases-chartkit/issues/358)) ([e1306f2](https://github.com/mkobit/bases-chartkit/commit/e1306f2414bfe46442e8a1883f349fc73c21f5a8))
* **charts:** remove unverified type-assertion casts, keep genuine bridges ([#408](https://github.com/mkobit/bases-chartkit/issues/408)) ([68647da](https://github.com/mkobit/bases-chartkit/commit/68647dacc24689758a21ae623c6906b3de3d4387))
* **charts:** show all parallel axis values in tooltip ([#366](https://github.com/mkobit/bases-chartkit/issues/366)) ([56ce379](https://github.com/mkobit/bases-chartkit/commit/56ce379e6111bc447850ec572abbe77b0bd8bf67))
* **charts:** stop pareto/pictorial-bar hardcoding axis-label interval:0 ([#361](https://github.com/mkobit/bases-chartkit/issues/361)) ([4fa0685](https://github.com/mkobit/bases-chartkit/commit/4fa0685b7dfb96c31cc85986fd6957f384116dba))
* **ci:** keep release draft until assets attach, avoid immutable-release 422 ([#341](https://github.com/mkobit/bases-chartkit/issues/341)) ([d91b27d](https://github.com/mkobit/bases-chartkit/commit/d91b27d3bfe5e95b10fca3df8f9381ee7535c43b))
* **ci:** match release.yml tag trigger to real tag format, make release-please manual ([#335](https://github.com/mkobit/bases-chartkit/issues/335)) ([09db272](https://github.com/mkobit/bases-chartkit/commit/09db2723ed5c20ef959691220b726e609d608ce0))
* **ci:** revert release-please to auto-run on push to main ([#336](https://github.com/mkobit/bases-chartkit/issues/336)) ([526bb97](https://github.com/mkobit/bases-chartkit/commit/526bb978df0c80c54cb4c65701fc31d3de6ed9da))
* **e2e:** clean up Obsidian child + tmpdirs on SIGTERM/SIGINT to the worker ([#339](https://github.com/mkobit/bases-chartkit/issues/339)) ([201d8da](https://github.com/mkobit/bases-chartkit/commit/201d8da0352c16a3214c94f2857b7ebebd6e5b76))
* **e2e:** extend hover-tooltip coverage to 26 more chart types ([#364](https://github.com/mkobit/bases-chartkit/issues/364)) ([6d9e2fa](https://github.com/mkobit/bases-chartkit/commit/6d9e2faf7dc1e72193d75f44f1f485df0dfabdce))
* **e2e:** GPU-crash mitigation and radar tooltip-hover hardening ([#362](https://github.com/mkobit/bases-chartkit/issues/362)) ([ae66451](https://github.com/mkobit/bases-chartkit/commit/ae66451ec2c9eeeeed3d61ea5e7b40f4594e68d3))
* **e2e:** harden Obsidian teardown with process-group SIGTERM/SIGKILL escalation ([#359](https://github.com/mkobit/bases-chartkit/issues/359)) ([87019cc](https://github.com/mkobit/bases-chartkit/commit/87019ccd980522a3d93ea982e960008f31e2e84b))
* **e2e:** hover unambiguous parallel vertex for interior-axis tooltip ([#385](https://github.com/mkobit/bases-chartkit/issues/385)) ([576b66a](https://github.com/mkobit/bases-chartkit/commit/576b66af00eb685c4d0285b9ba18ae6864983cec))
* **e2e:** remove unverified type-assertion casts in e2e/ ([#411](https://github.com/mkobit/bases-chartkit/issues/411)) ([161b18b](https://github.com/mkobit/bases-chartkit/commit/161b18bb92bd8ac3cce38c1686e8021baf867a49))
* **e2e:** use a shared 60s poll timeout for vault-indexing-dependent assertions ([#352](https://github.com/mkobit/bases-chartkit/issues/352)) ([1d492c5](https://github.com/mkobit/bases-chartkit/commit/1d492c542a742b6aaea8d83b47c1ed449eaabc6d))
* **e2e:** wait for ECharts 'finished' before capturing docs screenshots ([#343](https://github.com/mkobit/bases-chartkit/issues/343)) ([a13f33c](https://github.com/mkobit/bases-chartkit/commit/a13f33cca6828fb13de1dd2db44e61d9d2696419))
* **e2e:** wait for vault indexing before doc-screenshot survey sweep ([#406](https://github.com/mkobit/bases-chartkit/issues/406)) ([c8a4532](https://github.com/mkobit/bases-chartkit/commit/c8a4532c4ce93c9f4c550bc4a499fa60d2697add))
* **effect-scatter-chart:** normalize sizeProp through a visualMap instead of raw pixel size ([#345](https://github.com/mkobit/bases-chartkit/issues/345)) ([895e494](https://github.com/mkobit/bases-chartkit/commit/895e494dca61ac2f69c6145dc34b7145e90ab038))
* label tooltip values in bar/line/stacked-bar charts ([#375](https://github.com/mkobit/bases-chartkit/issues/375)) ([1a283a3](https://github.com/mkobit/bases-chartkit/commit/1a283a38e937979aa855a4c300dd6f690e7ea48d))
* **lang:** sentence-case candlestick price placeholders ([#382](https://github.com/mkobit/bases-chartkit/issues/382)) ([bc67c64](https://github.com/mkobit/bases-chartkit/commit/bc67c64b1acc16b28466cbed1ab372d97e7016e7))
* **lint:** require a reason on every eslint-disable comment ([#344](https://github.com/mkobit/bases-chartkit/issues/344)) ([95223c9](https://github.com/mkobit/bases-chartkit/commit/95223c9a1ad78927d4e65cef407e7c8fefd6471a))
* **radar-chart:** auto-compute per-indicator min/max instead of leaving axes unscaled ([#347](https://github.com/mkobit/bases-chartkit/issues/347)) ([1dd2285](https://github.com/mkobit/bases-chartkit/commit/1dd2285bfe34f324f582f01b3ab38d52b7f53dc0))
* **rose-chart:** thread legendPosition/legendOrient through to the transformer ([#350](https://github.com/mkobit/bases-chartkit/issues/350)) ([a70278a](https://github.com/mkobit/bases-chartkit/commit/a70278a66014194591f7d9f14b0f536d71c3ad8f))
* **sankey-chart:** drop self-loops and detect cycles before rendering ([#346](https://github.com/mkobit/bases-chartkit/issues/346)) ([a123a3c](https://github.com/mkobit/bases-chartkit/commit/a123a3c66917d0e035d01ba9bcd847b20b816de2))
* **tests:** narrow cartesian type assertions ([#417](https://github.com/mkobit/bases-chartkit/issues/417)) ([2904b3a](https://github.com/mkobit/bases-chartkit/commit/2904b3ac4ae796475c792434f4ac7118431ca521))
* **tests:** remove unverified type-assertion casts in gauge/heatmap tests ([#413](https://github.com/mkobit/bases-chartkit/issues/413)) ([08f606e](https://github.com/mkobit/bases-chartkit/commit/08f606e74f55dd5403e681fb7bb50c3478746305))
* **tests:** remove unverified type-assertion casts in pie/waterfall/boxplot/word-cloud/utils tests ([#415](https://github.com/mkobit/bases-chartkit/issues/415)) ([437d35e](https://github.com/mkobit/bases-chartkit/commit/437d35e5e328985e7b980e1d8a781a6a5ec1f0bd))
* **tests:** remove unverified type-assertion casts in polar-scatter/polar-line/calendar/treemap tests ([#414](https://github.com/mkobit/bases-chartkit/issues/414)) ([9f5e0db](https://github.com/mkobit/bases-chartkit/commit/9f5e0db63d695cf58642cf073e01204372dc40c8))
* **tests:** remove unverified type-assertion casts in radar/gantt/candlestick/map/parallel tests ([#418](https://github.com/mkobit/bases-chartkit/issues/418)) ([0e84f3b](https://github.com/mkobit/bases-chartkit/commit/0e84f3bf2fccc03d4ebd0734a4759fc680ef7ada))
* **tests:** remove unverified type-assertion casts in theme-river/funnel/hierarchy/graph tests ([#416](https://github.com/mkobit/bases-chartkit/issues/416)) ([579868d](https://github.com/mkobit/bases-chartkit/commit/579868d868f8a54392e8eabb0a86f27841a3a746))
* **treemap-chart:** enable breadcrumb so drilled-in nodes can navigate back out ([#356](https://github.com/mkobit/bases-chartkit/issues/356)) ([366b55d](https://github.com/mkobit/bases-chartkit/commit/366b55d09371cb1b5543f89161e6e7eb1745ed52))
* **treemap-chart:** pass real common transformer options instead of an empty object ([#357](https://github.com/mkobit/bases-chartkit/issues/357)) ([84b31d6](https://github.com/mkobit/bases-chartkit/commit/84b31d632c2d86c308105078b3ed577ac0d3cff9))
* **treemap-chart:** stop hardcoded white border from surviving into dark theme ([#351](https://github.com/mkobit/bases-chartkit/issues/351)) ([9607ce9](https://github.com/mkobit/bases-chartkit/commit/9607ce953b3303d272fc7e1f7cc212f23b3e548b))
* **treemap:** render nested hierarchy instead of flat tiles ([#392](https://github.com/mkobit/bases-chartkit/issues/392)) ([eea875f](https://github.com/mkobit/bases-chartkit/commit/eea875f6840a8b0c90907768d85404a07de9dbed))
* **vault-dev:** pick an ephemeral CDP port instead of hardcoded 9222 ([#405](https://github.com/mkobit/bases-chartkit/issues/405)) ([438016f](https://github.com/mkobit/bases-chartkit/commit/438016f0d3ce20c0fce093be1856689105421ee1))
* **views:** remove unverified type-assertion casts in src/views ([#409](https://github.com/mkobit/bases-chartkit/issues/409)) ([dc69560](https://github.com/mkobit/bases-chartkit/commit/dc69560ccb721cff505776944afd9ab975920ab3))


### Performance improvements

* **e2e:** reuse one Obsidian instance per Playwright worker ([#376](https://github.com/mkobit/bases-chartkit/issues/376)) ([5dd48bf](https://github.com/mkobit/bases-chartkit/commit/5dd48bfc2f16130beaa427ead23e37b72bd27fad))
* **e2e:** short-circuit chart-view lookup to cut headless suite 40m to 2.5m ([#377](https://github.com/mkobit/bases-chartkit/issues/377)) ([7e1b2fd](https://github.com/mkobit/bases-chartkit/commit/7e1b2fd041c096dda63fbfa86ec1459be2848775))


### Dependency updates

* **obsidian:** raise minAppVersion to 1.13.4 ([#368](https://github.com/mkobit/bases-chartkit/issues/368)) ([b7e3edd](https://github.com/mkobit/bases-chartkit/commit/b7e3edd520a33c0f96648584438baae070b84d38))


### Documentation

* chart-type screenshots and dependency cleanup ([#338](https://github.com/mkobit/bases-chartkit/issues/338)) ([6bf6067](https://github.com/mkobit/bases-chartkit/commit/6bf6067a171bc19062153a1505a611f6cb4eaa10))
* **charts:** trim WHAT-narration comments from transformers and views ([#365](https://github.com/mkobit/bases-chartkit/issues/365)) ([6e41c14](https://github.com/mkobit/bases-chartkit/commit/6e41c14374f7e5a1f2717b032516a421c9e0aea2))
* trim AGENTS.md headers and verbose code comments ([#360](https://github.com/mkobit/bases-chartkit/issues/360)) ([a5e50bb](https://github.com/mkobit/bases-chartkit/commit/a5e50bb3910fd1a94d68f8824d66fbf8279362f2))

## [0.1.0](https://github.com/mkobit/bases-chartkit/compare/bases-chartkit-0.0.1...bases-chartkit-0.1.0) (2026-07-20)


### Features

* Add axis configuration options (labels, rotation, flip) ([#47](https://github.com/mkobit/bases-chartkit/issues/47)) ([f942202](https://github.com/mkobit/bases-chartkit/commit/f942202f78e29052f2eaa1ce944c455208f85a98))
* add basic ECharts view for Obsidian Bases ([2070143](https://github.com/mkobit/bases-chartkit/commit/2070143e49cd6f50aaa67b17cef3717eb3e50a32))
* add ECharts view for Obsidian Bases ([6f49e54](https://github.com/mkobit/bases-chartkit/commit/6f49e54dcad1372b15b622a164b11a071db26fa8))
* Add Graph (Network) Chart type ([#18](https://github.com/mkobit/bases-chartkit/issues/18)) ([8d6c62b](https://github.com/mkobit/bases-chartkit/commit/8d6c62bc9cea620819400005595c75bd1aefdbb1))
* add Lines and EffectScatter chart types ([#56](https://github.com/mkobit/bases-chartkit/issues/56)) ([27f42ff](https://github.com/mkobit/bases-chartkit/commit/27f42ff044792e3c2ed57dad3ee524a1fcbebcb9))
* add Polar Scatter chart support ([#99](https://github.com/mkobit/bases-chartkit/issues/99)) ([3d3839d](https://github.com/mkobit/bases-chartkit/commit/3d3839d626a84b9af01115cc784ed43ec5044150))
* add radial bar chart support ([#82](https://github.com/mkobit/bases-chartkit/issues/82)) ([033ad6b](https://github.com/mkobit/bases-chartkit/commit/033ad6b73d88776f96b2dbf7ca442dc7120a04c7))
* add support for echarts line and bar charts ([#7](https://github.com/mkobit/bases-chartkit/issues/7)) ([7e75879](https://github.com/mkobit/bases-chartkit/commit/7e758796e92f0ff7d1b0d6d243364b614cc3d83f))
* Add support for Scatter, Bubble, Radar, Funnel, and Gauge charts ([#10](https://github.com/mkobit/bases-chartkit/issues/10)) ([bb4f68a](https://github.com/mkobit/bases-chartkit/commit/bb4f68a2ba52e426cfe60c6c85137a536c4b618c))
* Add Treemap chart support ([#14](https://github.com/mkobit/bases-chartkit/issues/14)) ([8b7dd6a](https://github.com/mkobit/bases-chartkit/commit/8b7dd6ae5789074ad7db171bd6df7297f2f7d4f2))
* add typed vault builder utility ([#184](https://github.com/mkobit/bases-chartkit/issues/184)) ([27c0931](https://github.com/mkobit/bases-chartkit/commit/27c093160698b0a5b41e0e06de7275c2e3e1a1f2))
* **bullet:** add qualitative range support ([#81](https://github.com/mkobit/bases-chartkit/issues/81)) ([c9cd3ba](https://github.com/mkobit/bases-chartkit/commit/c9cd3ba36eeb7a1c8ee50aa36d16c171767fcfbc))
* **charts:** add example .base files for 14 uncovered chart types ([#301](https://github.com/mkobit/bases-chartkit/issues/301)) ([335daa8](https://github.com/mkobit/bases-chartkit/commit/335daa83817e87168ab1b8ab089cb056cd4db89c))
* **ci:** publish versioned build artifacts on every push ([#155](https://github.com/mkobit/bases-chartkit/issues/155)) ([ae1f657](https://github.com/mkobit/bases-chartkit/commit/ae1f65771af57b6b58a6130611da543616ce691c))
* **e2e:** add getChartOption helper and test case ([#316](https://github.com/mkobit/bases-chartkit/issues/316)) ([e45e1de](https://github.com/mkobit/bases-chartkit/commit/e45e1dee60f90e9068e38ecd445d4c5a69ec502b))
* Enable functional/no-conditional-statements in views and tests ([#66](https://github.com/mkobit/bases-chartkit/issues/66)) ([3abca60](https://github.com/mkobit/bases-chartkit/commit/3abca609692e9426d2564347bb4b041db6565d54))
* enable functional/prefer-immutable-types lint rule ([#67](https://github.com/mkobit/bases-chartkit/issues/67)) ([9a37317](https://github.com/mkobit/bases-chartkit/commit/9a37317bdff3f92ed06cc5456d180ab629c1f620))
* ensure CI runs all check steps even if one fails ([#77](https://github.com/mkobit/bases-chartkit/issues/77)) ([da5bf80](https://github.com/mkobit/bases-chartkit/commit/da5bf80d24e242330cf81a36abef244f12e79d83))
* **example-vault:** add Chicago map-chart example, sentence-case view names ([#328](https://github.com/mkobit/bases-chartkit/issues/328)) ([cfc4e9f](https://github.com/mkobit/bases-chartkit/commit/cfc4e9f8042b3fee83eccb4e443f812b50721e72))
* implement bullet chart type ([#80](https://github.com/mkobit/bases-chartkit/issues/80)) ([0e093ad](https://github.com/mkobit/bases-chartkit/commit/0e093adafcad3728a8cc35ad1623aaa9fabe47cf))
* improve CI workflow and expand linting coverage ([#139](https://github.com/mkobit/bases-chartkit/issues/139)) ([b928627](https://github.com/mkobit/bases-chartkit/commit/b928627c9795a67d69fdc19b8fd83f3e1500575e))
* integrate i18next with type-safe configuration ([#94](https://github.com/mkobit/bases-chartkit/issues/94)) ([47e66f8](https://github.com/mkobit/bases-chartkit/commit/47e66f822ddbcae316509457e274e6c2a1f80e3c))
* make upColor and downColor user configurable settings ([#251](https://github.com/mkobit/bases-chartkit/issues/251)) ([08273f8](https://github.com/mkobit/bases-chartkit/commit/08273f840f0021d1b1b6f2e44b2053b7cd260e51))
* modernize template with pnpm, strict ts, and tooling upgrades ([c9239aa](https://github.com/mkobit/bases-chartkit/commit/c9239aad78c55d7c4e9d47025b735338a146ab0d))
* modernize template with pnpm, strict ts, and tooling upgrades ([155d10a](https://github.com/mkobit/bases-chartkit/commit/155d10a2feb9ac5aa77cc962c9845997a929cdf0))
* **scripts:** cdp tooling for vault:dev — eval, reload, screenshot ([#291](https://github.com/mkobit/bases-chartkit/issues/291)) ([acb5a0a](https://github.com/mkobit/bases-chartkit/commit/acb5a0a4ea1654ab94fcb1e0ccf30dc6fb2a7111))
* Setup WebdriverIO for Automated E2E Testing ([#124](https://github.com/mkobit/bases-chartkit/issues/124)) ([6a526e8](https://github.com/mkobit/bases-chartkit/commit/6a526e8125e031e7a55db26fe67b396b7ac05a2a))
* Support ECharts Legend Positioning and Orientation ([#52](https://github.com/mkobit/bases-chartkit/issues/52)) ([563bdba](https://github.com/mkobit/bases-chartkit/commit/563bdba0e91ea07f48f6d2640b093af3f1cdacf5))


### Bug fixes

* **cd:** downgrade semantic-release to support bun's mocked node version ([#232](https://github.com/mkobit/bases-chartkit/issues/232)) ([67a1331](https://github.com/mkobit/bases-chartkit/commit/67a1331bf45a3b819c8379ce580eab1a908f5566))
* **cd:** patch semantic-release plugin to remove package-lock.json requirement and execute with bun ([#237](https://github.com/mkobit/bases-chartkit/issues/237)) ([719c3b9](https://github.com/mkobit/bases-chartkit/commit/719c3b9748dd4e8b00f313887741eb5282d80411))
* **charts:** add gauge chart aggregation option (sum/avg/min/max/last) ([#312](https://github.com/mkobit/bases-chartkit/issues/312)) ([500039c](https://github.com/mkobit/bases-chartkit/commit/500039c646ad8b69cb0aa28bdb33c1a5bbddb4a6))
* **charts:** aggregate duplicate categories in funnel and pie charts ([#307](https://github.com/mkobit/bases-chartkit/issues/307)) ([2bbef15](https://github.com/mkobit/bases-chartkit/commit/2bbef1599b391a947a1bf70523a77e6e5df19b29))
* **charts:** build real nested hierarchy for treemap, fix blank sunburst ([#306](https://github.com/mkobit/bases-chartkit/issues/306)) ([560067d](https://github.com/mkobit/bases-chartkit/commit/560067d74b869a9b48c9b3df8c44a297d8e0d66b))
* **charts:** consolidate polar-bar-chart into radial-bar-chart ([#313](https://github.com/mkobit/bases-chartkit/issues/313)) ([5275ecc](https://github.com/mkobit/bases-chartkit/commit/5275ecca4f6c7ee66100179c83c6f4e9bc63fdb4))
* **charts:** hide overlapping axis labels on scatter/polar-scatter charts ([#315](https://github.com/mkobit/bases-chartkit/issues/315)) ([3b208e4](https://github.com/mkobit/bases-chartkit/commit/3b208e476661e1881609933a60ad02289d54957b))
* **charts:** resolve 5 chart rendering bugs from fs4 epic survey ([#308](https://github.com/mkobit/bases-chartkit/issues/308)) ([5836fb0](https://github.com/mkobit/bases-chartkit/commit/5836fb0f9e2c907c3df46d63cdb5f6dba3b9d421))
* **charts:** unwrap Bases Value wrapper, fix blank/broken charts across 6 chart types ([#295](https://github.com/mkobit/bases-chartkit/issues/295)) ([16f65d4](https://github.com/mkobit/bases-chartkit/commit/16f65d458ba2af7b50d99839e9f975779016d478))
* **ci:** fix build failures and type checks ([#263](https://github.com/mkobit/bases-chartkit/issues/263)) ([27699c6](https://github.com/mkobit/bases-chartkit/commit/27699c6edfd568261a63e402702ff51ff0aab2c9))
* correct e2e testing setup and documentation ([#128](https://github.com/mkobit/bases-chartkit/issues/128)) ([a056a3f](https://github.com/mkobit/bases-chartkit/commit/a056a3fc8747d5c230ec4f33ec35997b91634972))
* **e2e:** pin Obsidian appVersion/installerVersion instead of 'latest' ([#318](https://github.com/mkobit/bases-chartkit/issues/318)) ([b166ed0](https://github.com/mkobit/bases-chartkit/commit/b166ed084753b4bda7c0f8bce7f23c5a1425fbb8))
* **lint:** migrate to eslint-plugin-obsidianmd 0.4.1's stricter policy ([#333](https://github.com/mkobit/bases-chartkit/issues/333)) ([bd3bcd1](https://github.com/mkobit/bases-chartkit/commit/bd3bcd118c97319737e71c37239ab95cc09f9c73))
* **lint:** pin typescript-eslint to 8.61.1, revert 8.62.0 regression ([#326](https://github.com/mkobit/bases-chartkit/issues/326)) ([0bf2267](https://github.com/mkobit/bases-chartkit/commit/0bf22672128ad6764d65c392b4a89a9e7b7bc4b8))
* resolve build and linting issues including E2E activeWindow support ([#257](https://github.com/mkobit/bases-chartkit/issues/257)) ([dc9096f](https://github.com/mkobit/bases-chartkit/commit/dc9096fba49e5672c6b465a470c861d8fd78fb78))
* resolve linting errors and switch to pnpm ([7eb416f](https://github.com/mkobit/bases-chartkit/commit/7eb416fe5db914bdd7c9b4a11fc2da296afd4d3f))
* resolve typescript build errors by removing conflicting types and adjusting tsconfig ([93785e6](https://github.com/mkobit/bases-chartkit/commit/93785e6c4e412558ae283baaa51d460a6446e435))
* run mise activate and doctor in setup script ([#189](https://github.com/mkobit/bases-chartkit/issues/189)) ([916614e](https://github.com/mkobit/bases-chartkit/commit/916614e41e13eb35797ceae853be561054abcfd3))
* **scripts,e2e:** clean up obsidian-launcher tmpdirs, isolate vault:dev from repo ([#330](https://github.com/mkobit/bases-chartkit/issues/330)) ([b3a1160](https://github.com/mkobit/bases-chartkit/commit/b3a116001be509ef0386f26d19da7c13beb893c5))
* **transformers:** support BasesNote .get() accessor in getNestedValue ([#293](https://github.com/mkobit/bases-chartkit/issues/293)) ([178fae5](https://github.com/mkobit/bases-chartkit/commit/178fae549d920f61c08b7558595c4e8638760067))
* update manifest.json authorUrl and remove fundingUrl ([#271](https://github.com/mkobit/bases-chartkit/issues/271)) ([4dc2365](https://github.com/mkobit/bases-chartkit/commit/4dc2365c5d1dfb8b96324240a870b13ee869910d))
* **vault:** give RPG_Stats example characters real names ([#311](https://github.com/mkobit/bases-chartkit/issues/311)) ([9dc5db3](https://github.com/mkobit/bases-chartkit/commit/9dc5db34fa1fc103933a2d95e0cce01b2685f8de))
* **views:** guard chart render against undefined BasesView config ([#290](https://github.com/mkobit/bases-chartkit/issues/290)) ([948c716](https://github.com/mkobit/bases-chartkit/commit/948c716b5f7309fe53d1cfcdb4603cc6b78cb976))
* when direct property access yields undefined, fall back to a ([16f65d4](https://github.com/mkobit/bases-chartkit/commit/16f65d458ba2af7b50d99839e9f975779016d478))
* when direct property access yields undefined, fall back to a ([178fae5](https://github.com/mkobit/bases-chartkit/commit/178fae549d920f61c08b7558595c4e8638760067))


### Documentation

* add development instructions to README ([#29](https://github.com/mkobit/bases-chartkit/issues/29)) ([e7155cd](https://github.com/mkobit/bases-chartkit/commit/e7155cd942e5277f13ddbc492505d91b5c90e216))
* add Installation, Usage, and Configuration sections to README.md ([#273](https://github.com/mkobit/bases-chartkit/issues/273)) ([5b42556](https://github.com/mkobit/bases-chartkit/commit/5b42556bc34b8b7de0c1747de748ba5c386ef3c4))
* add RELEASING.md describing release-please flow ([#276](https://github.com/mkobit/bases-chartkit/issues/276)) ([62c5846](https://github.com/mkobit/bases-chartkit/commit/62c58463a09ba9fea888fbc8aae5deed6d05f4aa))
* **charts:** fix config key mismatches across chart-types reference ([#302](https://github.com/mkobit/bases-chartkit/issues/302)) ([b4399cf](https://github.com/mkobit/bases-chartkit/commit/b4399cfa0964cb1ac097724796d295fe5fddf5a8))
* create chart types reference document ([#279](https://github.com/mkobit/bases-chartkit/issues/279)) ([0018627](https://github.com/mkobit/bases-chartkit/commit/00186274404da0cfab2d3f29a2659405e6e55e93))
* remove broken Codecov badge from README ([#283](https://github.com/mkobit/bases-chartkit/issues/283)) ([e1697f8](https://github.com/mkobit/bases-chartkit/commit/e1697f8673ae59b0c41f3ed79c854be139f13992))
* trim AGENTS.md files to minimal requirements ([#156](https://github.com/mkobit/bases-chartkit/issues/156)) ([760ba53](https://github.com/mkobit/bases-chartkit/commit/760ba53597c9654084f5dc15740d537bd05cb3cb))
* update README date and add status badges ([#216](https://github.com/mkobit/bases-chartkit/issues/216)) ([3cc2f4b](https://github.com/mkobit/bases-chartkit/commit/3cc2f4bdb8cf084e735cd164033f18a4b141dfea))
