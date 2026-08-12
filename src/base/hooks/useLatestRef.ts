import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

/**
 * Returns a ref whose `.current` always holds the most recently rendered value
 * of `value`. Read `ref.current` to access the latest value from callbacks,
 * intervals, and effects without forcing the consumer to re-subscribe.
 *
 * The ref is updated in an effect (rather than written during render) so the
 * value satisfies the `react-hooks/refs` rule, which rejects unconditional
 * ref writes during render as a misuse of lazy initialization.
 *
 * Trade-off: the ref lags by one render relative to `value`. This is
 * acceptable for every existing call site (callbacks, effects, intervals,
 * event handlers) because those run after render commits anyway. It is NOT
 * appropriate when the ref value must be observed by code running in the
 * same render that received the new `value` — for that, derive directly
 * from `value` instead of via the ref.
 *
 * @example
 *   const onClickRef = useLatestRef(onClick);
 *   <div onClick={() => onClickRef.current?.(event)} />
 */
export function useLatestRef<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}
