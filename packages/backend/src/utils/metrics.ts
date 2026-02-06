// Simple in-memory metrics collector for Prometheus format
class MetricsCollector {
  private metrics = new Map<string, any>()
  private counters = new Map<string, number>()
  private histograms = new Map<string, { buckets: number[], counts: number[], sum: number }>()

  counter(name: string, labels: Record<string, string> = {}): void {
    const key = this.getKey(name, labels)
    this.counters.set(key, (this.counters.get(key) || 0) + 1)
  }

  histogram(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = this.getKey(name, labels)
    const buckets = [0.1, 0.25, 0.5, 1, 2.5, 5, 10] // Default buckets in seconds
    
    if (!this.histograms.has(key)) {
      this.histograms.set(key, {
        buckets,
        counts: new Array(buckets.length + 1).fill(0),
        sum: 0,
      })
    }
    
    const histogram = this.histograms.get(key)!
    histogram.sum += value
    
    for (let i = 0; i < buckets.length; i++) {
      if (value <= buckets[i]) {
        histogram.counts[i]++
      }
    }
    histogram.counts[histogram.counts.length - 1]++ // +Inf bucket
  }

  gauge(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = this.getKey(name, labels)
    this.metrics.set(key, { type: 'gauge', value, labels })
  }

  private getKey(name: string, labels: Record<string, string>): string {
    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',')
    return labelStr ? `${name}{${labelStr}}` : name
  }

  getMetrics(): string {
    let output = ''
    
    // Counters
    for (const [key, value] of this.counters) {
      output += `# TYPE ${key.split('{')[0]} counter\n`
      output += `${key} ${value}\n`
    }
    
    // Histograms
    for (const [key, histogram] of this.histograms) {
      const baseName = key.split('{')[0]
      const labels = key.includes('{') ? key.slice(key.indexOf('{')) : ''
      
      output += `# TYPE ${baseName} histogram\n`
      
      // Buckets
      for (let i = 0; i < histogram.buckets.length; i++) {
        const bucketLabel = labels 
          ? labels.slice(0, -1) + `,le="${histogram.buckets[i]}"}`
          : `{le="${histogram.buckets[i]}"}`
        output += `${baseName}_bucket${bucketLabel} ${histogram.counts[i]}\n`
      }
      
      // +Inf bucket
      const infLabel = labels 
        ? labels.slice(0, -1) + ',le="+Inf"}'
        : '{le="+Inf"}'
      output += `${baseName}_bucket${infLabel} ${histogram.counts[histogram.counts.length - 1]}\n`
      
      // Sum and count
      output += `${baseName}_sum${labels} ${histogram.sum}\n`
      output += `${baseName}_count${labels} ${histogram.counts[histogram.counts.length - 1]}\n`
    }
    
    // Gauges
    for (const [key, metric] of this.metrics) {
      if (metric.type === 'gauge') {
        output += `# TYPE ${key.split('{')[0]} gauge\n`
        output += `${key} ${metric.value}\n`
      }
    }
    
    // System metrics
    const memUsage = process.memoryUsage()
    output += `# TYPE process_memory_usage_bytes gauge\n`
    output += `process_memory_usage_bytes{type="rss"} ${memUsage.rss}\n`
    output += `process_memory_usage_bytes{type="heap_used"} ${memUsage.heapUsed}\n`
    output += `process_memory_usage_bytes{type="heap_total"} ${memUsage.heapTotal}\n`
    
    output += `# TYPE process_uptime_seconds gauge\n`
    output += `process_uptime_seconds ${process.uptime()}\n`
    
    return output
  }

  reset(): void {
    this.metrics.clear()
    this.counters.clear()
    this.histograms.clear()
  }
}

export const metrics = new MetricsCollector()

// Middleware to collect HTTP metrics
export const metricsMiddleware = () => {
  return async (c: any, next: any) => {
    const start = Date.now()
    
    await next()
    
    const duration = (Date.now() - start) / 1000 // Convert to seconds
    const method = c.req.method
    const status = c.res.status.toString()
    const route = c.req.routePath || c.req.path
    
    metrics.counter('http_requests_total', {
      method,
      status,
      route,
    })
    
    metrics.histogram('http_request_duration_seconds', duration, {
      method,
      status,
      route,
    })
  }
}