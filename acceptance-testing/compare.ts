/**
 * Deep-compares a legacy response body against a modern response body.
 *
 * Two kinds of fields are treated specially instead of requiring byte-exact
 * equality, because they are inherently non-deterministic between two
 * independent requests:
 *   - `uuid` fields: randomly generated per request, so we only assert both
 *     sides produced a non-empty string.
 *   - date-ish fields (`validFrom`, `validUntil`, `start`, `end`): when
 *     `validFrom` is defaulted to `new Date()`, the legacy and modern calls
 *     happen a few milliseconds apart, so we allow a small tolerance instead
 *     of exact string equality.
 */

const UUID_FIELDS = new Set(['uuid']);
const DATE_FIELDS = new Set(['validFrom', 'validUntil', 'start', 'end']);
const DATE_TOLERANCE_MS = 5000;

export interface Diff {
    path: string;
    legacy: unknown;
    modern: unknown;
    reason: string;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function lastKey(path: string): string {
    const segments = path.split('.');
    const last = segments[segments.length - 1] ?? '';
    const bracketIndex = last.indexOf('[');
    return bracketIndex === -1 ? last : last.slice(0, bracketIndex);
}

function compareValues(
    path: string,
    legacy: unknown,
    modern: unknown,
    diffs: Diff[],
): void {
    const key = lastKey(path);

    if (UUID_FIELDS.has(key)) {
        const bothValid =
            typeof legacy === 'string' &&
            typeof modern === 'string' &&
            legacy.length > 0 &&
            modern.length > 0;
        if (!bothValid) {
            diffs.push({
                path,
                legacy,
                modern,
                reason: 'expected both sides to produce a non-empty uuid string',
            });
        }
        return;
    }

    if (DATE_FIELDS.has(key) && legacy !== undefined && modern !== undefined) {
        const legacyTime = new Date(legacy as string).getTime();
        const modernTime = new Date(modern as string).getTime();
        if (Number.isNaN(legacyTime) || Number.isNaN(modernTime)) {
            diffs.push({
                path,
                legacy,
                modern,
                reason: 'expected both sides to be valid dates',
            });
            return;
        }
        const deltaMs = Math.abs(legacyTime - modernTime);
        if (deltaMs > DATE_TOLERANCE_MS) {
            diffs.push({
                path,
                legacy,
                modern,
                reason: `dates differ by ${deltaMs}ms, more than the ${DATE_TOLERANCE_MS}ms tolerance`,
            });
        }
        return;
    }

    if (Array.isArray(legacy) || Array.isArray(modern)) {
        if (!Array.isArray(legacy) || !Array.isArray(modern)) {
            diffs.push({
                path,
                legacy,
                modern,
                reason: 'expected both sides to be arrays',
            });
            return;
        }
        if (legacy.length !== modern.length) {
            diffs.push({
                path,
                legacy: legacy.length,
                modern: modern.length,
                reason: 'array length mismatch',
            });
            return;
        }
        legacy.forEach((item, index) =>
            compareValues(`${path}[${index}]`, item, modern[index], diffs),
        );
        return;
    }

    if (isPlainObject(legacy) || isPlainObject(modern)) {
        if (!isPlainObject(legacy) || !isPlainObject(modern)) {
            diffs.push({
                path,
                legacy,
                modern,
                reason: 'expected both sides to be objects',
            });
            return;
        }
        const keys = new Set([...Object.keys(legacy), ...Object.keys(modern)]);
        for (const objectKey of keys) {
            compareValues(
                path ? `${path}.${objectKey}` : objectKey,
                legacy[objectKey],
                modern[objectKey],
                diffs,
            );
        }
        return;
    }

    if (legacy !== modern) {
        diffs.push({
            path: path || '(root)',
            legacy,
            modern,
            reason: 'value mismatch',
        });
    }
}

export function compareResponses(legacy: unknown, modern: unknown): Diff[] {
    const diffs: Diff[] = [];
    compareValues('', legacy, modern, diffs);
    return diffs;
}
