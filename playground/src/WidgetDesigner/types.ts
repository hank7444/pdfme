import { Schema } from '@pdfme/common';

export interface Widget {
  id: string;
  name: string;
  width: number;
  height: number;
  schemas: Schema[];
}

export interface BasePdf {
  width: number;
  height: number;
  padding: number[];
}

export interface WidgetEditInfo {
  schemas: Schema[], // current schemas backup
  width: number,
  height: number,
  position: { x: number, y: number },
}