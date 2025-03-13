import { Schema, Size } from '@pdfme/common';


export interface Position {
  x: number;
  y: number;
}

export interface Rect {
  width: number;
  height: number;
  position: Position;
}

export interface Widget {
  id: string;
  name: string;
  width: number;
  height: number;
  schemas: Schema[];
  position: Position;
  basePdf: string;
}

export interface BasePdf {
  width: number;
  height: number;
  padding: number[];
}

export interface WidgetEditInfo {
  schemas: Schema[];                  // current schemas backup
  width: number;                      // editRect width
  height: number;                     // editRect height
  position: { x: number, y: number }; // editRect position
  pageCursor: number; // current page cursor
  pageSizes: Size[],
  pageSize: Size;
}