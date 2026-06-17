const SENSITIVE_KEYS = new Set([
    'password',
    'token',
    'access_token',
    'refresh_token',
    'api_key',
    'secret',
    'email',
    'phone',
    'mobile',
    'address'
]);

const REDACTED_VALUE = '[REDACTED]';

function normalizeKey(key) {
    return String(key || '').toLowerCase();
}

function isSensitiveKey(key) {
    const normalized = normalizeKey(key);
    return Array.from(SENSITIVE_KEYS).some(sensitiveKey => normalized.includes(sensitiveKey));
}

function extractHeader(headers, name) {
    if (!headers || typeof headers !== 'object') return null;

    const directValue = headers[name];
    if (directValue !== undefined) return directValue;

    const matchingKey = Object.keys(headers).find(key => key.toLowerCase() === name);
    return matchingKey ? headers[matchingKey] : null;
}

function normalizeHeaderValue(value) {
    if (Array.isArray(value)) return value.find(item => item !== undefined && item !== null) || null;
    return value === undefined ? null : value;
}

function extractRequestMetadata(req) {
    const headers = req && req.headers ? req.headers : {};
    const forwardedFor = normalizeHeaderValue(extractHeader(headers, 'x-forwarded-for'));
    const forwardedIp = typeof forwardedFor === 'string'
        ? forwardedFor.split(',').map(value => value.trim()).find(Boolean)
        : null;

    const ipAddress =
        normalizeHeaderValue(extractHeader(headers, 'cf-connecting-ip')) ||
        normalizeHeaderValue(extractHeader(headers, 'x-real-ip')) ||
        forwardedIp ||
        (req && req.ip) ||
        (req && req.socket && req.socket.remoteAddress) ||
        (req && req.connection && req.connection.remoteAddress) ||
        null;

    return {
        ipAddress: ipAddress ? String(ipAddress) : null,
        userAgent: normalizeHeaderValue(extractHeader(headers, 'user-agent')) || null
    };
}

function maskSensitiveValue(key, value) {
    if (isSensitiveKey(key)) return REDACTED_VALUE;
    return value;
}

function sanitizeAuditPayload(value, seen = new WeakSet()) {
    if (typeof value === 'bigint') {
        return value.toString();
    }

    if (Array.isArray(value)) {
        if (seen.has(value)) return '[Circular]';
        seen.add(value);
        return value.map(item => sanitizeAuditPayload(item, seen));
    }

    if (!value || typeof value !== 'object') {
        return value;
    }

    if (!isPlainObject(value)) {
        return value instanceof Date ? value.toISOString() : value;
    }

    if (seen.has(value)) return '[Circular]';
    seen.add(value);

    const sanitized = {};
    Object.keys(value).forEach(key => {
        const fieldValue = value[key];
        sanitized[key] = isSensitiveKey(key)
            ? REDACTED_VALUE
            : sanitizeAuditPayload(fieldValue, seen);
    });

    return sanitized;
}

function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function valuesEqual(beforeValue, afterValue) {
    if (beforeValue === afterValue) return true;

    try {
        return JSON.stringify(beforeValue) === JSON.stringify(afterValue);
    } catch (error) {
        return false;
    }
}

function buildChangedFieldsDiff(beforeData, afterData, options = {}) {
    const before = isPlainObject(beforeData) ? beforeData : {};
    const after = isPlainObject(afterData) ? afterData : {};
    const fields = Array.isArray(options.fields)
        ? options.fields
        : Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));

    return fields.reduce((diff, fieldName) => {
        const beforeValue = before[fieldName];
        const afterValue = after[fieldName];

        if (!valuesEqual(beforeValue, afterValue)) {
            diff[fieldName] = {
                before: sanitizeAuditPayload(maskSensitiveValue(fieldName, beforeValue)),
                after: sanitizeAuditPayload(maskSensitiveValue(fieldName, afterValue))
            };
        }

        return diff;
    }, {});
}

module.exports = {
    extractRequestMetadata,
    maskSensitiveValue,
    sanitizeAuditPayload,
    buildChangedFieldsDiff
};
