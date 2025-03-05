import type { Schema } from '@pdfme/common';

export interface WidgetGroupSchema extends Schema {
  widgetGroupId: string;
  widgetGroupCompId: string;
  widgetGroupType: string;
  widgetSection: {
    widgetCategory?: string;
    widget?: string;
  };
}
