import type { Schema } from '@pdfme/common';

export interface WidgetGroupSchema extends Schema {
  widgetGroupId: string;
  widgetGroupCompId: string;
  widgetGroupType: string;
  widgetGroupSection: {
    widgetCategory: string | undefined;
    widget: string | undefined;
  };
}
