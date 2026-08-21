import { createUniqueProcessIdentity, type UniqueProcessIdentity } from './processNaming.ts';

type PrepareBpmnXmlOptions = {
  scope?: string;
  sourceLabel?: string;
  sourceXml: string;
};

export type PreparedBpmnProcess = UniqueProcessIdentity & {
  originalProcessId: string;
  originalProcessName: string;
};

export type PreparedBpmnXml = {
  processes: PreparedBpmnProcess[];
  runPrefix: string;
  xml: string;
};

const PROCESS_TAG_PATTERN = /<(?:[A-Za-z_][\w.-]*:)?process\b[^>]*>/g;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function decodeXmlAttribute(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function encodeXmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function readXmlAttribute(tag: string, attributeName: string): string | undefined {
  const match = tag.match(
    new RegExp(`\\b${attributeName}\\s*=\\s*(["'])(.*?)\\1`, 'i'),
  );
  return match?.[2];
}

export function setXmlAttribute(tag: string, attributeName: string, value: string): string {
  const encodedValue = encodeXmlAttribute(value);
  const attributePattern = new RegExp(
    `(\\b${attributeName}\\s*=\\s*)(["'])(.*?)\\2`,
    'i',
  );

  if (attributePattern.test(tag)) {
    return tag.replace(
      attributePattern,
      (_match, prefix: string, quote: string) => `${prefix}${quote}${encodedValue}${quote}`,
    );
  }

  return tag.replace(/\s*(\/?)>$/, ` ${attributeName}="${encodedValue}"$1>`);
}

export function replaceQuotedIdReferences(xml: string, oldId: string, newId: string): string {
  const quotedIdPattern = new RegExp(`(["'])${escapeRegExp(oldId)}\\1`, 'g');
  return xml.replace(quotedIdPattern, (_match, quote: string) => `${quote}${newId}${quote}`);
}

export function findXmlElementTag(xml: string, localName: string): string | undefined {
  const tagPattern = new RegExp(
    `<(?:[A-Za-z_][\\w.-]*:)?${escapeRegExp(localName)}\\b[^>]*>`,
    'i',
  );
  return xml.match(tagPattern)?.[0];
}

export function prepareUniqueBpmnXml(options: PrepareBpmnXmlOptions): PreparedBpmnXml {
  const sourceLabel = options.sourceLabel ?? 'BPMN source';
  const sourceXml = options.sourceXml;
  const processTags = [...sourceXml.matchAll(PROCESS_TAG_PATTERN)].map((match) => match[0]);

  if (processTags.length === 0) {
    throw new Error(`No BPMN process element found in ${sourceLabel}.`);
  }

  let preparedXml = sourceXml;
  const processes: PreparedBpmnProcess[] = [];

  for (const processTag of processTags) {
    const originalProcessId = readXmlAttribute(processTag, 'id');
    if (!originalProcessId) {
      throw new Error(`A BPMN process without an id was found in ${sourceLabel}.`);
    }

    const originalProcessName = decodeXmlAttribute(
      readXmlAttribute(processTag, 'name') ?? originalProcessId,
    );
    const identity = createUniqueProcessIdentity(originalProcessName, {
      scope: options.scope,
    });

    let updatedProcessTag = setXmlAttribute(processTag, 'id', identity.processId);
    updatedProcessTag = setXmlAttribute(updatedProcessTag, 'name', identity.processName);
    preparedXml = preparedXml.replace(processTag, updatedProcessTag);
    preparedXml = replaceQuotedIdReferences(
      preparedXml,
      originalProcessId,
      identity.processId,
    );

    processes.push({
      ...identity,
      originalProcessId,
      originalProcessName,
    });
  }

  return {
    processes,
    runPrefix: processes[0].runPrefix,
    xml: preparedXml,
  };
}
