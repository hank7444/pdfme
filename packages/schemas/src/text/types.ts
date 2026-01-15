import type { Schema } from '@pdfme/common';
import type { Font as FontKitFont } from 'fontkit';

export type ALIGNMENT = 'left' | 'center' | 'right';
export type VERTICAL_ALIGNMENT = 'top' | 'middle' | 'bottom';
export type DYNAMIC_FONT_SIZE_FIT = 'horizontal' | 'vertical';
export type Spacing = { top: number; right: number; bottom: number; left: number };
export type BorderStyle = 'none' | 'solid' | 'dotted' | 'dashed';
export type FontWidthCalcValues = {
  font: FontKitFont;
  fontSize: number;
  characterSpacing: number;
  boxWidthInPt: number;
};
export type Border = {
  borderStyle: BorderStyle;
  borderColor: string;
  borderWidth: Spacing; 
}
export interface TextSchema extends Schema {
  fontName?: string;
  alignment: ALIGNMENT;
  verticalAlignment: VERTICAL_ALIGNMENT;
  fontSize: number;
  lineHeight: number;
  strikethrough?: boolean;
  underline?: boolean;
  characterSpacing: number;
  dynamicFontSize?: {
    min: number;
    max: number;
    fit: DYNAMIC_FONT_SIZE_FIT;
  };
  fontColor: string;
  backgroundColor: string;
  border?: Border;
  padding?: Spacing;
}