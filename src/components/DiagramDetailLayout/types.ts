import type { ReactNode } from 'react';

export interface MetadataField {
  /** Label text displayed above the value */
  label: string;
  /** ReactNode to display as the value */
  value: ReactNode;
  /** Whether to use monospace font for string values */
  mono?: boolean;
}

export interface VersionInfo {
  key: string;
  version: number;
}

/** Definition info for instances - displayed as a link to the parent definition */
export interface DefinitionInfo {
  /** Definition key (used for link) */
  key: number | string;
  /** Type of definition (determines the link URL) */
  type: 'process' | 'decision';
}
