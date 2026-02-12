/**
 * Camunda form schema type (bpmn-io/form-js).
 * Uses a loose definition to stay compatible with the form-js internal types.
 */
export interface FormSchema {
  type?: string;
  schemaVersion?: number;
  components: Record<string, unknown>[];
  [key: string]: unknown;
}

export interface FormBuilderRef {
  getSchema: () => FormSchema;
  importSchema: (schema: FormSchema) => Promise<void>;
}
