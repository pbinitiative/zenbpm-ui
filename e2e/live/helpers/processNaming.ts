export const PROCESS_RUN_PREFIX_ENV = 'ZENBPM_PROCESS_RUN_PREFIX';

const DEFAULT_TIME_ZONE = 'Europe/Prague';
const XML_ID_PATTERN = /^[A-Za-z_][A-Za-z0-9_.-]*$/;

type PrefixOptions = {
  date?: Date;
  timeZone?: string;
};

type ProcessIdentityOptions = {
  randomSuffix?: string;
  runPrefix?: string;
  scope?: string;
};

export type UniqueProcessIdentity = {
  processId: string;
  processName: string;
  runPrefix: string;
};

function formatTimestamp(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    month: '2-digit',
    second: '2-digit',
    timeZone,
    year: 'numeric',
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}${values.month}${values.day}${values.hour}${values.minute}${values.second}`;
}

function toXmlIdSegment(value: string): string {
  const normalized = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9_.-]+/g, '_')
    .replace(/^[-.]+|[-.]+$/g, '')
    .replace(/_+/g, '_');

  return normalized || 'process';
}

export function validateProcessRunPrefix(prefix: string): void {
  if (!/^\d{14}_$/.test(prefix)) {
    throw new Error(
      `${PROCESS_RUN_PREFIX_ENV} must use the YYYYMMDDHHmmss_ format, received: ${prefix}`,
    );
  }
}

export function createProcessRunPrefix(options: PrefixOptions = {}): string {
  const {
    date = new Date(),
    timeZone = process.env.PLAYWRIGHT_TIME_ZONE ?? DEFAULT_TIME_ZONE,
  } = options;

  const prefix = `${formatTimestamp(date, timeZone)}_`;
  validateProcessRunPrefix(prefix);
  return prefix;
}

export function getProcessRunPrefix(): string {
  const prefix = process.env[PROCESS_RUN_PREFIX_ENV];

  if (!prefix) {
    throw new Error(
      `${PROCESS_RUN_PREFIX_ENV} is not set. Run the test through Playwright globalSetup.`,
    );
  }

  validateProcessRunPrefix(prefix);
  return prefix;
}

export function createUniqueProcessIdentity(
  baseName: string,
  options: ProcessIdentityOptions = {},
): UniqueProcessIdentity {
  const trimmedBaseName = baseName.trim();
  if (!trimmedBaseName) {
    throw new Error('A non-empty process base name is required.');
  }

  const runPrefix = options.runPrefix ?? getProcessRunPrefix();
  validateProcessRunPrefix(runPrefix);
  const randomSuffix = options.randomSuffix
    ? toXmlIdSegment(options.randomSuffix)
    : undefined;
  const scope = options.scope?.trim();
  const idParts = [
    scope && toXmlIdSegment(scope),
    toXmlIdSegment(trimmedBaseName),
    randomSuffix,
  ].filter(Boolean);
  const nameParts = [scope, trimmedBaseName, randomSuffix].filter(Boolean);

  // A BPMN/XML id cannot start with a digit, while the visible process name can
  // use the exact timestamp prefix requested for live test resources.
  const processId = `e2e_${runPrefix}${idParts.join('_')}`;
  if (!XML_ID_PATTERN.test(processId)) {
    throw new Error(`Generated process id is not a valid BPMN/XML id: ${processId}`);
  }

  return {
    processId,
    processName: `${runPrefix}${nameParts.join('_')}`,
    runPrefix,
  };
}
