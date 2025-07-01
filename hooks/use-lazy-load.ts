// Lazy Loading Hook for Performance Optimization
import { useEffect, useRef, useState, useCallback } from "react";

interface UseLazyLoadOptions {
  threshold?: number;
  rootMargin?: string;
  root?: Element | null;
}

/**
 * Hook for lazy loading elements when they come into viewport
 * Uses Intersection Observer API
 */
export function useLazyLoad(options: UseLazyLoadOptions = {}): [React.RefObject<HTMLDivElement | null>, boolean] {
  const { threshold = 0.1, rootMargin = "50px", root = null } = options;
  const [isVisible, setIsVisible] = useState(false);
  const targetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // Stop observing once visible
        }
      },
      { threshold, rootMargin, root }
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, root]);

  return [targetRef, isVisible];
}

/**
 * Hook for infinite scroll / pagination
 */
export function useInfiniteScroll(callback: () => void, options: UseLazyLoadOptions = {}) {
  const { threshold = 0.1, rootMargin = "100px", root = null } = options;
  const targetRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(callback);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          callbackRef.current();
        }
      },
      { threshold, rootMargin, root }
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, root]);

  return targetRef;
}

/**
 * Hook for virtual scrolling with large lists
 */
export function useVirtualScroll<T>(items: T[], itemHeight: number, containerHeight: number, overscan: number = 3) {
  const [scrollTop, setScrollTop] = useState(0);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(items.length - 1, Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan);

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    startIndex,
    endIndex,
  };
}
