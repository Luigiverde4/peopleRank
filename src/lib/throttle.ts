export interface Throttled<Args extends unknown[]> {
  (...args: Args): void
  /** Drops any pending trailing call. */
  cancel(): void
}

/**
 * Calls `fn` at most once per `intervalMs`. The first call runs immediately
 * and the last call inside a window runs at the end of it, so the final
 * value is never lost.
 */
export function throttle<Args extends unknown[]>(
  fn: (...args: Args) => void,
  intervalMs: number,
): Throttled<Args> {
  let lastRun = -Infinity
  let pendingArgs: Args | null = null
  let timer: ReturnType<typeof setTimeout> | null = null

  const run = (args: Args) => {
    lastRun = Date.now()
    fn(...args)
  }

  const throttled = (...args: Args) => {
    const wait = lastRun + intervalMs - Date.now()
    if (wait <= 0 && timer === null) {
      run(args)
      return
    }
    pendingArgs = args
    if (timer !== null) return
    timer = setTimeout(() => {
      timer = null
      if (pendingArgs) run(pendingArgs)
      pendingArgs = null
    }, Math.max(wait, 0))
  }

  throttled.cancel = () => {
    if (timer !== null) clearTimeout(timer)
    timer = null
    pendingArgs = null
  }

  return throttled
}
