const ENABLED = process.env.ACTIVITY_INTELLIGENCE_PERF_LOG === '1';
const PREFIX = '[AIM_PERF]';
let sequence = 0;

function nowNs() {
    return process.hrtime.bigint();
}

function durationMs(startNs) {
    return Number(process.hrtime.bigint() - startNs) / 1e6;
}

function formatValue(value) {
    if (value === undefined || value === null) return '';
    if (typeof value === 'number') return Number.isFinite(value) ? value.toFixed(1).replace(/\.0$/, '') : '';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    return String(value).replace(/\s+/g, '_');
}

function log(trace, phase, fields = {}) {
    if (!ENABLED || !trace) return;
    const parts = [
        PREFIX,
        phase,
        `traceId=${trace.traceId}`,
        `operation=${trace.operation}`
    ];
    Object.entries(fields).forEach(([key, value]) => {
        const formatted = formatValue(value);
        if (formatted !== '') parts.push(`${key}=${formatted}`);
    });
    console.log(parts.join(' '));
}

function startTrace(operation, fields = {}) {
    if (!ENABLED) return null;
    const trace = {
        traceId: `aim-${++sequence}`,
        operation,
        startedNs: nowNs()
    };
    log(trace, `${operation}.start`, fields);
    return trace;
}

function finishTrace(trace, fields = {}) {
    if (!ENABLED || !trace) return;
    log(trace, `${trace.operation}.total`, {
        durationMs: durationMs(trace.startedNs),
        ...fields
    });
}

async function timeAsync(trace, phase, fields, fn) {
    if (!ENABLED || !trace) return await fn();
    const startedNs = nowNs();
    const fieldGetter = typeof fields === 'function' ? fields : () => (fields || {});
    try {
        const result = await fn();
        log(trace, phase, {
            durationMs: durationMs(startedNs),
            ...fieldGetter(result)
        });
        return result;
    } catch (error) {
        log(trace, phase, {
            durationMs: durationMs(startedNs),
            failed: true
        });
        throw error;
    }
}

function timeSync(trace, phase, fields, fn) {
    if (!ENABLED || !trace) return fn();
    const startedNs = nowNs();
    const fieldGetter = typeof fields === 'function' ? fields : () => (fields || {});
    try {
        const result = fn();
        log(trace, phase, {
            durationMs: durationMs(startedNs),
            ...fieldGetter(result)
        });
        return result;
    } catch (error) {
        log(trace, phase, {
            durationMs: durationMs(startedNs),
            failed: true
        });
        throw error;
    }
}

module.exports = {
    ENABLED,
    log,
    startTrace,
    finishTrace,
    timeAsync,
    timeSync
};
