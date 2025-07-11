import { JSDOM } from 'jsdom';

export interface ExtractorField {
  selectors: string[];
  attribute?: string;
  multiple?: boolean;
  transform?: (value: string) => any;
  regex?: RegExp;
  contains?: string[];
  required?: boolean;
  fallback?: any;
}

export interface ExtractorSchema {
  [fieldName: string]: string[] | ExtractorField;
}

export interface DetectionSignals {
  urlPatterns: string[];
  selectors: string[];
  requiredElements: string[];
  keywords: string[];
}

export interface Template {
  name: string;
  description: string;
  detect: (url: string, dom: JSDOM) => number;
  extract: ExtractorSchema;
}

export interface ExtractedData {
  [key: string]: any;
  _template?: string;
  _confidence?: number;
}
