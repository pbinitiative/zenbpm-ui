/**
 * Drops `nullable` from every schema of no `type` among the component
 * `schemas`, a map of schemas by name, as AJV refuses to compile it there.
 */
export function dropUntypedNullable(schemas: unknown): void;
