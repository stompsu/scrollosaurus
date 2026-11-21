# Lighthouse

Measured by `pnpm lighthouse` on the production build, served like GitHub Pages (gzip, no SPA
fallback), with Lighthouse's default mobile emulation (Moto G Power class, slow 4G, 4× CPU
slowdown). CI runs the same check on every pull request and fails if Performance drops below 90
on any page. The table below is rewritten by each local run.

<!-- lighthouse:start -->

| Page                    | Performance | Accessibility | Best practices | SEO | LCP   | TBT   | CLS |
| ----------------------- | ----------- | ------------- | -------------- | --- | ----- | ----- | --- |
| /                       | 96          | 100           | 100            | 100 | 2.7 s | 80 ms | 0   |
| /species/tyrannosaurus/ | 94          | 100           | 100            | 100 | 3.1 s | 50 ms | 0   |
| /credits/               | 100         | 100           | 100            | 100 | 0.9 s | 0 ms  | 0   |

<!-- lighthouse:end -->
