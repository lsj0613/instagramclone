import { useEffect, useRef } from "react";

export function useIntersectionObserver(
  callback: () => void,
  options?: IntersectionObserverInit
) {
  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!observerRef.current) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        callback();
      }
    }, options);

    observer.observe(observerRef.current);

    return () => observer.disconnect();
  }, [callback, options]);

  return observerRef;
}
