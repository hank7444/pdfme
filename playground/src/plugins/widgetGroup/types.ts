import type { Schema } from '@pdfme/common';

export interface Option {
  label: string;
  value: string;
}


export interface WidgetCategoryOption {
  label: string;
  value: string;
  widgets: Option[];
}

export interface WidgetGroupSchema extends Schema {
  widgetGroupId: string; // parent widget group ID, uuid()
  widgetGroupCompId?: string; // widget component ID from the widget dropdown menu
  widgetGroupType: string; // 'parent' or 'child'
  //widget: string | undefined; // wiget component ID
  widgetGroupSection: {
    widgetCategory?: string;
    widget?: string;
  }
}

export interface WidgetGroupCategoryWidgetIds {
  [key: string]: string[];
}