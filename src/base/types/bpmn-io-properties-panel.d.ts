declare module '@bpmn-io/properties-panel' {
  export function TextAreaEntry(props: Record<string, unknown>): unknown;
  export function isTextAreaEntryEdited(entry: unknown): boolean;
}

declare module '@bpmn-io/properties-panel/preact' {
  export function createElement(
    type: string | ((...args: unknown[]) => unknown),
    props?: Record<string, unknown> | null,
    ...children: unknown[]
  ): unknown;
}
