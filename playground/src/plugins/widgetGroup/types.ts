import type { Schema } from '@pdfme/common';

export interface WidgetGroupSchema extends Schema {
  widgetGroupId: string;
  widgetGroupName: string;
  widgetGroupType: string;
  widgetSection: {
    selectSection: {
      widgetCategory?: string;
      widget?: string;
    };
  };
}
