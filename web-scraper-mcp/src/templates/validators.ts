/**
 * Content validation utilities for extracted fields
 */

export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  required?: boolean;
  validator?: (value: any) => boolean;
}

/**
 * Validate extracted field value
 */
export function validateField(
  value: any,
  validation?: FieldValidation
): { valid: boolean; cleaned: any; error?: string } {
  if (!validation) {
    return { valid: true, cleaned: value };
  }

  // Handle null/undefined
  if (value === null || value === undefined) {
    if (validation.required) {
      return { valid: false, cleaned: null, error: 'Required field is missing' };
    }
    return { valid: true, cleaned: null };
  }

  // Convert to string for validation
  const strValue = String(value).trim();

  // Check if empty
  if (!strValue && validation.required) {
    return { valid: false, cleaned: null, error: 'Required field is empty' };
  }

  // Length validation
  if (validation.minLength && strValue.length < validation.minLength) {
    return {
      valid: false,
      cleaned: strValue,
      error: `Value too short (min: ${validation.minLength})`,
    };
  }

  if (validation.maxLength && strValue.length > validation.maxLength) {
    return {
      valid: false,
      cleaned: strValue.substring(0, validation.maxLength),
      error: `Value too long (max: ${validation.maxLength})`,
    };
  }

  // Pattern validation
  if (validation.pattern && !validation.pattern.test(strValue)) {
    return {
      valid: false,
      cleaned: strValue,
      error: 'Value does not match required pattern',
    };
  }

  // Custom validator
  if (validation.validator && !validation.validator(value)) {
    return {
      valid: false,
      cleaned: value,
      error: 'Custom validation failed',
    };
  }

  return { valid: true, cleaned: value };
}

/**
 * Common validators
 */
export const validators = {
  isUrl: (value: string) => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },

  isEmail: (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  },

  isNumeric: (value: any) => {
    return !isNaN(parseFloat(value)) && isFinite(value);
  },

  isDate: (value: string) => {
    const date = new Date(value);
    return !isNaN(date.getTime());
  },

  hasMinWords: (minWords: number) => (value: string) => {
    const words = value.trim().split(/\s+/);
    return words.length >= minWords;
  },

  isClean: (value: string) => {
    // Check for common extraction artifacts
    const artifacts = ['undefined', 'null', 'NaN', '\\n', '\\t', '&nbsp;'];
    const lower = value.toLowerCase();
    return !artifacts.some(artifact => lower.includes(artifact));
  },
};

/**
 * Clean extracted text content
 */
export function cleanText(text: string): string {
  return (
    text
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      // Remove common HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Remove zero-width characters
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      // Normalize quotes
      .replace(/['']/g, "'")
      .replace(/[""]/g, '"')
      // Trim
      .trim()
  );
}

/**
 * Validate and clean an entire extracted data object
 */
export function validateExtractedData(
  data: Record<string, any>,
  schema: Record<string, FieldValidation>
): {
  valid: boolean;
  cleaned: Record<string, any>;
  errors: Record<string, string>;
} {
  const cleaned: Record<string, any> = {};
  const errors: Record<string, string> = {};
  let valid = true;

  for (const [field, value] of Object.entries(data)) {
    const validation = schema[field];
    const result = validateField(value, validation);

    if (result.valid) {
      cleaned[field] = result.cleaned;
    } else {
      valid = false;
      errors[field] = result.error || 'Validation failed';
      // Still include cleaned value
      if (result.cleaned !== null) {
        cleaned[field] = result.cleaned;
      }
    }
  }

  // Check for required fields that are missing
  for (const [field, validation] of Object.entries(schema)) {
    if (validation.required && !(field in data)) {
      valid = false;
      errors[field] = 'Required field is missing';
    }
  }

  return { valid, cleaned, errors };
}
