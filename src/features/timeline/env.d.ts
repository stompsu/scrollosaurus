// Build-time flag for the 300-item performance fixture (`pnpm perf`). Unset in normal builds, so
// the fixture and the frame-time instrumentation are removed as dead code.
interface ImportMetaEnv {
  readonly VITE_PERF_FIXTURE?: string;
}
