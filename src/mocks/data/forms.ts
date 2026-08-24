// Test ZEN_FORM schema used by mock jobs to exercise the form-based completion
// dialog. The schema is intentionally minimal — a single checkbox — so the
// dialog renders without depending on the form-js component tree.
export const TEST_ZEN_FORM = JSON.stringify({
  components: [
    {
      label: 'Approved',
      type: 'checkbox',
      layout: { row: 'Row_1', columns: null },
      id: 'Field_approved',
      key: 'approved',
    },
  ],
  type: 'default',
  id: 'Form_approval',
  schemaVersion: 19,
});
