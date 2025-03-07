import type { Schema } from '@pdfme/common';

export interface WidgetGroupSchema extends Schema {
  widgetSection: {
    selectSection: {
      widgetCategory?: string;
      widget?: string;
    };
  };
}
