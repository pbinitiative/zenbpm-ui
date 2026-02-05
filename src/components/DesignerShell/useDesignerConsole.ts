import { useState, useCallback } from 'react';
import type { ConsoleMessage, ConsoleMessageType, AddConsoleMessageOptions } from './types';

// Message ID counter for unique IDs
let messageIdCounter = 0;
const generateMessageId = () => `msg-${Date.now()}-${++messageIdCounter}`;

export interface UseDesignerConsoleResult {
  consoleMessages: ConsoleMessage[];
  consoleOpen: boolean;
  addConsoleMessage: (type: ConsoleMessageType, message: string, options?: AddConsoleMessageOptions) => void;
  toggleConsole: () => void;
  clearConsole: () => void;
}

export function useDesignerConsole(): UseDesignerConsoleResult {
  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([]);
  const [consoleOpen, setConsoleOpen] = useState(false);

  // Add message to console
  const addConsoleMessage = useCallback(
    (
      type: ConsoleMessageType,
      message: string,
      options?: AddConsoleMessageOptions
    ) => {
      const { details, link, preventOpenConsole } = options ?? {};
      const newMessage: ConsoleMessage = {
        id: generateMessageId(),
        type,
        message,
        details: details,
        link: link,
        timestamp: new Date(),
      };
      setConsoleMessages((prev) => [...prev, newMessage]);

      if (!preventOpenConsole) {
        setConsoleOpen(true);
      }
    },
    []
  );

  // Toggle console visibility
  const toggleConsole = useCallback(() => {
    setConsoleOpen((prev) => !prev);
  }, []);

  // Clear console messages
  const clearConsole = useCallback(() => {
    setConsoleMessages([]);
  }, []);

  return {
    consoleMessages,
    consoleOpen,
    addConsoleMessage,
    toggleConsole,
    clearConsole,
  };
}
