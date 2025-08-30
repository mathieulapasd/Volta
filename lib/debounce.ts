export interface DebouncedFunction<TArgs extends unknown[]> {
  (...args: TArgs): void;
  cancel: () => void;
  flush: () => void;
}

/**
 * Creates a debounced version of a function. The function will be invoked
 * after it stops being called for `waitMs` milliseconds.
 */
export function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  waitMs = 300
): DebouncedFunction<TArgs> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: TArgs | null = null;

  const debounced = (...args: TArgs) => {
    lastArgs = args;
    if (timer !== null) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      timer = null;
      if (lastArgs !== null) {
        fn(...lastArgs);
        lastArgs = null;
      }
    }, waitMs);
  };

  debounced.cancel = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    lastArgs = null;
  };

  debounced.flush = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (lastArgs !== null) {
      const args = lastArgs;
      lastArgs = null;
      fn(...args);
    }
  };

  return debounced as DebouncedFunction<TArgs>;
}

// biome-ignore lint/suspicious/noExplicitAny: makes sense
export function rafThrottle<T extends (...args: any[]) => void>(fn: T) {
  let ticking = false;
  return (...args: Parameters<T>) => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      fn(...args);
    });
  };
}
