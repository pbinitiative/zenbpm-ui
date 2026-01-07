import { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import { EditorState, type Extension } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { xml } from '@codemirror/lang-xml';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { bracketMatching, syntaxHighlighting, HighlightStyle, defaultHighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { themeColors } from '@base/theme';

// Light theme for the editor chrome (using theme colors)
const lightTheme = EditorView.theme({
  '&': {
    height: '100%',
    backgroundColor: themeColors.xmlEditor.background,
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: '"SF Mono", Monaco, Consolas, monospace',
    fontSize: '13px',
  },
  '.cm-gutters': {
    backgroundColor: themeColors.xmlEditor.gutterBg,
    borderRight: `1px solid ${themeColors.xmlEditor.gutterBorder}`,
    color: themeColors.xmlEditor.gutterText,
  },
  '.cm-activeLine': {
    backgroundColor: themeColors.xmlEditor.lineHighlight,
  },
  '.cm-activeLineGutter': {
    backgroundColor: themeColors.xmlEditor.selectionBg,
  },
}, { dark: false });

// Light theme XML syntax highlighting (using theme colors)
const xmlHighlightStyle = HighlightStyle.define([
  { tag: tags.tagName, color: themeColors.xmlEditor.tagName, fontWeight: 'bold' },
  { tag: tags.attributeName, color: themeColors.xmlEditor.attributeName },
  { tag: tags.attributeValue, color: themeColors.xmlEditor.attributeValue },
  { tag: tags.string, color: themeColors.xmlEditor.string },
  { tag: tags.blockComment, color: themeColors.xmlEditor.comment, fontStyle: 'italic' },
  { tag: tags.processingInstruction, color: themeColors.xmlEditor.processingInstruction },
  { tag: tags.documentMeta, color: themeColors.xmlEditor.documentMeta },
  { tag: tags.angleBracket, color: themeColors.xmlEditor.angleBracket },
  { tag: tags.definitionOperator, color: themeColors.xmlEditor.operator },
  { tag: tags.character, color: themeColors.xmlEditor.character },
  { tag: tags.content, color: themeColors.xmlEditor.content },
  { tag: tags.invalid, color: themeColors.xmlEditor.invalid, textDecoration: 'underline wavy' },
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
