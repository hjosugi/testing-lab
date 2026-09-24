// Minimal telemetry with production-shaped contracts: W3C traceparent
// propagation, OTLP/JSON-shaped spans, bounded-cardinality metrics, and
// structured logs that pass through redaction before they are stored.
import { createHash, randomBytes } from 'node:crypto';

const hex = bytes => randomBytes(bytes).toString('hex');

export function parseTraceparent(header) {
  const match = /^00-([0-9a-f]{32})-([0-9a-f]{16})-0[01]$/.exec(header ?? '');
  return match ? { traceId: match[1], parentSpanId: match[2] } : null;
}

export function createTelemetry({ service, allowedLabels = {}, maxSeriesPerMetric = 50 }) {
  const spans = [];
  const logs = [];
  const series = new Map();
  const rejectedLabels = [];

  const redact = value => {
    if (Array.isArray(value)) return value.map(redact);
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => {
        if (/token|password|secret|card|authorization|cvv/i.test(key)) return [key, '[REDACTED]'];
        if (/email/i.test(key) && typeof item === 'string') return [key, `sha256:${createHash('sha256').update(item).digest('hex').slice(0, 12)}`];
        return [key, redact(item)];
      }));
    }
    if (typeof value === 'string') return value.replace(/\b\d{13,19}\b/g, '[PAN]').replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[EMAIL]');
    return value;
  };

  return {
    spans,
    logs,
    rejectedLabels,
    startSpan(name, { traceparent, attributes = {} } = {}) {
      const parent = parseTraceparent(traceparent);
      const span = {
        traceId: parent?.traceId ?? hex(16),
        spanId: hex(8),
        parentSpanId: parent?.parentSpanId ?? '',
        name,
        attributes: redact(attributes),
        status: { code: 'UNSET' },
        startTimeUnixNano: String(process.hrtime.bigint()),
      };
      return {
        span,
        traceparent: `00-${span.traceId}-${span.spanId}-01`,
        end(status = 'OK', message) {
          span.status = { code: status, ...(message ? { message: redact(message) } : {}) };
          span.endTimeUnixNano = String(process.hrtime.bigint());
          spans.push(span);
        },
      };
    },
    // Labels outside the allowlist (user IDs, order IDs, raw paths) are
    // dropped and reported so a deploy cannot explode metric cardinality.
    count(metric, labels = {}) {
      const allowed = allowedLabels[metric] ?? [];
      const kept = {};
      for (const [key, value] of Object.entries(labels)) {
        if (allowed.includes(key)) kept[key] = value;
        else rejectedLabels.push(`${metric}:${key}`);
      }
      const key = `${metric}${JSON.stringify(kept)}`;
      const perMetric = [...series.keys()].filter(existing => existing.startsWith(`${metric}{`)).length;
      if (!series.has(key) && perMetric >= maxSeriesPerMetric) { rejectedLabels.push(`${metric}:series-limit`); return; }
      series.set(key, (series.get(key) ?? 0) + 1);
    },
    series: () => Object.fromEntries(series),
    log(level, message, fields = {}) {
      logs.push({ level, service, message: redact(message), ...redact(fields) });
    },
    otlp() {
      return { resourceSpans: [{ resource: { attributes: [{ key: 'service.name', value: { stringValue: service } }] }, scopeSpans: [{ scope: { name: 'testing-lab' }, spans }] }] };
    },
  };
}
