import { forwardRef, useRef, useEffect, useImperativeHandle } from 'react';
import { Form } from '@bpmn-io/form-js';
import '@bpmn-io/form-js/dist/assets/form-js.css';
import type { FormSchema } from './types';

interface SubmitResult {
  data: Record<string, unknown>;
  errors: Record<string, unknown>;
}

export interface FormViewerRef {
  submit: () => SubmitResult;
}

interface FormViewerProps {
  /** Form schema to render */
  schema: FormSchema;
  /** Initial data to populate form fields */
  data?: Record<string, unknown>;
  /** Called when the form is submitted (via built-in submit button or programmatic submit) */
  onSubmit?: (data: Record<string, unknown>, errors: Record<string, unknown>) => void;
}

export const FormViewer = forwardRef<FormViewerRef, FormViewerProps>(
  ({ schema, data, onSubmit }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const formRef = useRef<Form | null>(null);

    useEffect(() => {
      if (!containerRef.current) return;

      const form = new Form({ container: containerRef.current });
      form.importSchema(schema, data ?? {}).catch((err: unknown) => {
        console.error('Failed to import form schema', err);
      });

      formRef.current = form;

      return () => {
        form.destroy();
        formRef.current = null;
      };
      // Only initialize once — schema and data are fixed for the dialog lifetime
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      const form = formRef.current;
      if (!form || !onSubmit) return;

      const handler = (event: SubmitResult) => {
        onSubmit(event.data, event.errors);
      };

      form.on('submit', handler);
      return () => {
        form.off('submit', handler);
      };
    }, [onSubmit]);

    useImperativeHandle(
      ref,
      () => ({
        submit: () => {
          return (formRef.current?.submit() as SubmitResult) ?? { data: {}, errors: {} };
        },
      }),
      [],
    );

    return <div ref={containerRef} />;
  },
);

FormViewer.displayName = 'FormViewer';
