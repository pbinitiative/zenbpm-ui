import { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import { EditorState, type Extension } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { xml } from '@codemirror/lang-xml';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { bracketMatching, syntaxHighlighting, HighlightStyle, defaultHighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';

// Light theme for the editor chrome
const lightTheme = EditorView.theme({
  '&': {
    height: '100%',
    backgroundColor: '#ffffff',
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: '"SF Mono", Monaco, Consolas, monospace',
    fontSize: '13px',
  },
  '.cm-gutters': {
    backgroundColor: '#f5f5f5',
    borderRight: '1px solid #e0e0e0',
    color: '#999',
  },
  '.cm-activeLine': {
    backgroundColor: '#f0f7ff',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#e8f0fe',
  },
}, { dark: false });

// Light theme XML syntax highlighting (matching @lezer/xml tags)
const xmlHighlightStyle = HighlightStyle.define([
  { tag: tags.tagName, color: '#22863a', fontWeight: 'bold' }, // Element names - green bold
  { tag: tags.attributeName, color: '#6f42c1' },     // Attribute names - purple
  { tag: tags.attributeValue, color: '#032f62' },    // Attribute values - dark blue
  { tag: tags.string, color: '#032f62' },            // Strings - dark blue
  { tag: tags.blockComment, color: '#6a737d', fontStyle: 'italic' }, // Comments - gray italic
  { tag: tags.processingInstruction, color: '#005cc5' }, // <?xml ?> - blue
  { tag: tags.documentMeta, color: '#005cc5' },      // DOCTYPE etc - blue
  { tag: tags.angleBracket, color: '#d73a49' },      // < > / - red
  { tag: tags.definitionOperator, color: '#24292e' }, // = sign
  { tag: tags.character, color: '#e36209' },         // Entity references like &amp; - orange
  { tag: tags.content, color: '#24292e' },           // Text content - dark
  { tag: tags.invalid, color: '#cb2431', textDecoration: 'underline wavy' }, // Invalid/mismatched - red underline
]);

// Combined extensions for the XML editor
const xmlEditorExtensions: Extension = [
  lineNumbers(),
  highlightActiveLine(),
  history(),
  bracketMatching(),
  highlightSelectionMatches(),
  keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
  xml(),
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
  syntaxHighlighting(xmlHighlightStyle),
  lightTheme,
];

interface XmlEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string | number;
}

export const XmlEditor = ({ value, onChange, height = '100%' }: XmlEditorProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChange(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: value,
      extensions: [
        xmlEditorExtensions,
        updateListener,
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Only initialize once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update content when value prop changes externally
  useEffect(() => {
    if (!viewRef.current) return;

    const currentValue = viewRef.current.state.doc.toString();
    if (value !== currentValue) {
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: currentValue.length,
          insert: value,
        },
      });
    }
  }, [value]);

  return (
    <Box
      ref={containerRef}
      sx={{
        height,
        width: '100%',
        '& .cm-editor': {
          height: '100%',
        },
      }}
    />
  );
};
