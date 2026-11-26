/** Ignore the result of an async call once a newer one has started. */
export function latestCall() {
  let newest = 0;
  return () => {
    const id = ++newest;
    return (apply: () => void): void => {
      if (id === newest) apply();
    };
  };
}
