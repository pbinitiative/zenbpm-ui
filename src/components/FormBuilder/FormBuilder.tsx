import { forwardRef, useRef, useEffect, useImperativeHandle, useCallback } from 'react';
import { FormEditor } from '@bpmn-io/form-js';
import '@bpmn-io/form-js/dist/assets/form-js.css';
import '@bpmn-io/form-js/dist/assets/form-js-editor.css';
import '@bpmn-io/form-js/dist/assets/properties-panel.css';
import type { FormSchema, FormBuilderRef } from './types';
import {Box} from "@mui/material";

const DEFAULT_SCHEMA: FormSchema = {
  type: 'default',
  components: [],
};

interface FormBuilderProps {
  /** Initial form schema to load */
  initialSchema?: FormSchema;
  /** Called when the form schema changes */
  onChange?: () => void;
  /** Height of the builder container */
  height?: string | number;
}

export const FormBuilder = forwardRef<FormBuilderRef, FormBuilderProps>(
  ({ initialSchema, onChange, height = '100%' }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<FormEditor | null>(null);

    // Initialize editor on mount
    useEffect(() => {
      if (!containerRef.current) return;

      const editor = new FormEditor({
        container: containerRef.current,
      });

      const schema = initialSchema ?? DEFAULT_SCHEMA;
      editor.importSchema(schema).catch((err: unknown) => {
        console.error('Failed to import form schema', err);
      });

      editorRef.current = editor;

      return () => {
        editor.destroy();
        editorRef.current = null;
      };
      // Only run on mount — schema changes are handled via importSchema
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Listen for changes
    useEffect(() => {
      const editor = editorRef.current;
      if (!editor || !onChange) return;

      editor.on('changed', onChange);
      return () => {
        editor.off('changed', onChange);
      };
    }, [onChange]);

    const getSchema = useCallback((): FormSchema => {
      return (editorRef.current?.saveSchema() as FormSchema) ?? DEFAULT_SCHEMA;
    }, []);

    const importSchema = useCallback(async (schema: FormSchema): Promise<void> => {
      if (editorRef.current) {
        await editorRef.current.importSchema(schema);
      }
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        getSchema,
        importSchema,
      }),
      [getSchema, importSchema],
    );

    return <Box ref={containerRef} sx={{ height, width: '100%' }} />;
  },
);

FormBuilder.displayName = 'FormBuilder';
