/**
 * Drops `nullable` from every schema of no `type` among the component
 * `schemas`, a map of schemas by name, as AJV refuses to compile it there. A
 * constrained schema becomes an `anyOf` of its constraints and `{type: 'null'}`,
 * so that null stays valid.
 */
export function dropUntypedNullable(schemas: unknown): void;
