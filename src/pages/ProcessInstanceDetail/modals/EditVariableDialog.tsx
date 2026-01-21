import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import { JsonEditor } from '@components/JsonEditor';

type VariableType = 'string' | 'number' | 'boolean' | 'json';

interface Variable {
  name: string;
  value: string;
  rawValue: unknown;
}

interface EditVariableDialogProps {
  open: boolean;
  variable: Variable;
  onClose: () => void;
  onSave: (name: string, value: unknown) => Promise<void>;
}

// Detect the type of a value
const detectValueType = (rawValue: unknown): VariableType => {
  if (typeof rawValue === 'string') return 'string';
  if (typeof rawValue === 'number') return 'number';
  if (typeof rawValue === 'boolean') return 'boolean';
  return 'json';
};

// Safely convert value to string (avoiding [object Object])
const safeStringify = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return '';
  }
};

// Get initial input value based on type
const getInitialInputValue = (rawValue: unknown, type: VariableType): string => {
  if (type === 'string') return typeof rawValue === 'string' ? rawValue : '';
  if (type === 'number') return typeof rawValue === 'number' ? String(rawValue) : '';
  if (type === 'boolean') return ''; // Boolean uses checkbox, not text
  // For JSON, format nicely
  return safeStringify(rawValue);
};

export const EditVariableDialog = ({
  open,
  variable,
  onClose,
  onSave,
}: EditVariableDialogProps) => {
  const { t } = useTranslation([ns.common, ns.processInstance]);

  // Detect initial type from rawValue
  const initialType = useMemo(() => detectValueType(variable.rawValue), [variable.rawValue]);

  const [valueType, setValueType] = useState<VariableType>(initialType);
  const [stringValue, setStringValue] = useState(() =>
    initialType === 'string' && typeof variable.rawValue === 'string' ? variable.rawValue : ''
  );
  const [numberValue, setNumberValue] = useState(() =>
    initialType === 'number' && typeof variable.rawValue === 'number' ? String(variable.rawValue) : ''
  );
  const [booleanValue, setBooleanValue] = useState(() =>
    initialType === 'boolean' ? Boolean(variable.rawValue) : false
  );
  const [jsonValue, setJsonValue] = useState(() =>
    getInitialInputValue(variable.rawValue, initialType === 'json' ? 'json' : 'string')
  );
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTypeChange = useCallback((newType: VariableType) => {
    setValueType(newType);
    setJsonError(null);

    // Convert current value to new type's initial value
    if (newType === 'json') {
      // When switching to JSON, format the current value
      let currentValue: unknown;
      if (valueType === 'string') currentValue = stringValue;
      else if (valueType === 'number') currentValue = numberValue ? Number(numberValue) : 0;
      else if (valueType === 'boolean') currentValue = booleanValue;
      else currentValue = jsonValue;

      try {
        setJsonValue(JSON.stringify(currentValue, null, 2));
      } catch {
        setJsonValue(String(currentValue));
      }
    }
  }, [valueType, stringValue, numberValue, booleanValue, jsonValue]);

  const validateJsonValue = useCallback((newValue: string) => {
    if (!newValue.trim()) {
      setJsonError(null);
      return true;
    }
    try {
      JSON.parse(newValue);
      setJsonError(null);
      return true;
    } catch {
      setJsonError(t('common:errors.invalidJson'));
      return false;
    }
  }, [t]);

  const handleJsonValueChange = useCallback((newValue: string) => {
    setJsonValue(newValue);
    validateJsonValue(newValue);
  }, [validateJsonValue]);

  const handleSave = useCallback(async () => {
    let finalValue: unknown;

    switch (valueType) {
      case 'string':
        finalValue = stringValue;
        break;
      case 'number':
        finalValue = numberValue ? Number(numberValue) : 0;
        break;
      case 'boolean':
        finalValue = booleanValue;
        break;
      case 'json':
        if (!validateJsonValue(jsonValue)) return;
        try {
          finalValue = jsonValue.trim() ? JSON.parse(jsonValue) : null;
        } catch {
          return;
        }
        break;
    }

    setLoading(true);
    try {
      await onSave(variable.name, finalValue);
    } finally {
      setLoading(false);
    }
  }, [valueType, stringValue, numberValue, booleanValue, jsonValue, variable.name, onSave, validateJsonValue]);

  const renderValueInput = () => {
    switch (valueType) {
      case 'string':
        return (
          <TextField
            label={t('processInstance:dialogs.editVariable.value')}
            value={stringValue}
            onChange={(e) => setStringValue(e.target.value)}
            helperText={t('processInstance:dialogs.editVariable.stringHelp')}
            multiline
            rows={4}
            fullWidth
            autoFocus
          />
        );
      case 'number':
        return (
          <TextField
            label={t('processInstance:dialogs.editVariable.value')}
            value={numberValue}
            onChange={(e) => setNumberValue(e.target.value)}
            helperText={t('processInstance:dialogs.editVariable.numberHelp')}
            type="number"
            fullWidth
            autoFocus
          />
        );
      case 'boolean':
        return (
          <FormControlLabel
            control={
              <Checkbox
                checked={booleanValue}
                onChange={(e) => setBooleanValue(e.target.checked)}
              />
            }
            label={t('processInstance:dialogs.editVariable.booleanLabel')}
          />
        );
      case 'json':
        return (
          <JsonEditor
            label={t('processInstance:dialogs.editVariable.value')}
            value={jsonValue}
            onChange={handleJsonValueChange}
            error={!!jsonError}
            errorMessage={jsonError ?? undefined}
            helperText={t('processInstance:dialogs.editVariable.jsonHelp')}
            height={200}
          />
        );
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('processInstance:dialogs.editVariable.title')}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('processInstance:fields.variableName')}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {variable.name}
            </Typography>
          </Box>

          <FormControl fullWidth size="small">
            <InputLabel>{t('processInstance:dialogs.editVariable.type')}</InputLabel>
            <Select
              value={valueType}
              label={t('processInstance:dialogs.editVariable.type')}
              onChange={(e) => handleTypeChange(e.target.value as VariableType)}
            >
              <MenuItem value="string">{t('processInstance:dialogs.editVariable.types.string')}</MenuItem>
              <MenuItem value="number">{t('processInstance:dialogs.editVariable.types.number')}</MenuItem>
              <MenuItem value="boolean">{t('processInstance:dialogs.editVariable.types.boolean')}</MenuItem>
              <MenuItem value="json">{t('processInstance:dialogs.editVariable.types.json')}</MenuItem>
            </Select>
          </FormControl>

          {renderValueInput()}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {t('common:actions.cancel')}
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={(valueType === 'json' && !!jsonError) || loading}
        >
          {t('common:actions.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
