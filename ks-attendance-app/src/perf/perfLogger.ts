/**
 * Performance Logger
 * 
 * Utilities for measuring and logging performance metrics.
 */

import React from 'react';

interface PerfMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceLogger {
  private metrics: Map<string, PerfMetric> = new Map();
  private enabled: boolean = __DEV__;
  
  /**
   * Start measuring a metric
   */
  start(name: string, metadata?: Record<string, any>) {
    if (!this.enabled) return;
    
    this.metrics.set(name, {
      name,
      startTime: Date.now(),
      metadata,
    });
  }
  
  /**
   * End measuring and log duration
   */
  end(name: string) {
    if (!this.enabled) return;
    
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`Performance metric "${name}" was never started`);
      return;
    }
    
    metric.endTime = Date.now();
    metric.duration = metric.endTime - metric.startTime;
    
    this.log(metric);
    this.metrics.delete(name);
  }
  
  /**
   * Measure a function execution time
   */
  async measure<T>(
    name: string,
    fn: () => Promise<T> | T,
    metadata?: Record<string, any>
  ): Promise<T> {
    this.start(name, metadata);
    try {
      const result = await fn();
      this.end(name);
      return result;
    } catch (error) {
      this.end(name);
      throw error;
    }
  }
  
  /**
   * Log metric to console
   */
  private log(metric: PerfMetric) {
    const emoji = this.getEmoji(metric.duration!);
    console.log(
      `${emoji} [Perf] ${metric.name}: ${metric.duration}ms`,
      metric.metadata || ''
    );
  }
  
  /**
   * Get emoji based on duration thresholds
   */
  private getEmoji(duration: number): string {
    if (duration < 100) return '⚡';
    if (duration < 500) return '✅';
    if (duration < 1000) return '⚠️';
    return '🐌';
  }
  
  /**
   * Enable/disable logging
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }
  
  /**
   * Get all active metrics
   */
  getActiveMetrics(): PerfMetric[] {
    return Array.from(this.metrics.values());
  }
}

// Singleton instance
export const perfLogger = new PerformanceLogger();

/**
 * Hook to measure component mount time
 * 
 * @example
 * function MyComponent() {
 *   useComponentPerf('MyComponent');
 *   return <View>...</View>;
 * }
 */
export function useComponentPerf(componentName: string) {
  React.useEffect(() => {
    perfLogger.end(`${componentName}-mount`);
    
    return () => {
      perfLogger.start(`${componentName}-unmount`);
    };
  }, [componentName]);
  
  // Start measuring on render
  perfLogger.start(`${componentName}-mount`);
}

/**
 * Decorator to measure async function performance
 * 
 * @example
 * const fetchData = measurePerf('fetchData', async () => {
 *   return await api.get('/data');
 * });
 */
export function measurePerf<T extends (...args: any[]) => any>(
  name: string,
  fn: T
): T {
  return ((...args: any[]) => {
    return perfLogger.measure(name, () => fn(...args));
  }) as T;
}
