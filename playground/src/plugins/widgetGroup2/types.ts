import type { Schema } from '@pdfme/common';

export interface Option {
  label: string;
  value: string;
  schemas?: Schema[];
}


export interface WidgetCategoryOption {
  label: string;
  value: string;
  widgets: Option[];
}

export interface WidgetGroupSchema extends Schema {
  widgetGroupSchemaId: string; // parent widget group ID, uuid()
  widgetGroupType: string; // 'parent' or 'child'
  widgetGroupId: string;
  widgetGroupName: string;
  widgetGroupSection: {
    widgetGroupId?: string;
    widgetId?: string;
  }
}

export interface WidgetGroupHash {
  [key: string]: {
    name: string
  }
}

export interface WidgetGroupCategoryWidgetIds {
  [key: string]: string[];
}

export interface WidgetGroupWidgetOptions {
  [key: string]: Option[]; 
}

