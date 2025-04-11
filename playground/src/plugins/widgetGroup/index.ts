import { Plugin, Schema, PropPanelSchema, SchemaForUI, Widget, cloneDeep } from '@pdfme/common';
import { Group } from 'lucide';
import { createSvgStr, uuid } from '../utils';
//import { widgetCategoryOptions, widgetCategoryWidgetIds, widgetHash, Option } from './widgetData';
import { WidgetGroupSchema } from './types';


export interface WidgetGroupSchema extends Schema {
  widgetGroupId: string; // parent widget group ID, uuid()
  widgetGroupCompId?: string; // widget component ID from the widget dropdown menu
  widgetGroupName: string;
  widgetGroupWidth: number;
  widgetGroupHeight: number;
}

const widgetGroupSchema: Plugin<WidgetGroupSchema> = {
  ui: (arg) => {
    const { schema, rootElement } = arg;
    const div = document.createElement('div');
    div.style.width = '100%';
    div.style.height = '100%';
    div.style.boxSizing = 'border-box';
    div.style.borderWidth = '1px';
    div.style.borderStyle = 'dashed';
    div.style.borderColor = '#25c2a0';
    div.style.backgroundColor = 'transparent';
    div.style.padding = '4px';

    const span = document.createElement('span');
    span.textContent = `Widget Group: ${schema.widgetGroupName}`;
    span.style.color = '#166a57';
    span.style.fontSize = '18px';

    div.appendChild(span);
    rootElement.appendChild(div);
  },
  pdf: () => { },
  propPanel: {
    schema: ({ options, activeSchema, i18n, schemas, changeSchemas  }) => {

      changeSchemas([
        { key: 'width', value: activeSchema.widgetGroupWidth, schemaId: activeSchema.id},
        { key: 'height', value: activeSchema.widgetGroupHeight, schemaId: activeSchema.id}
      ]);
  
      const schema: Record<string, PropPanelSchema> = {
        type: {
          title: i18n('type'),
          widget: 'select',
          required: true,
          disabled: true,
        },
        width: {
          title: i18n('width'),
          type: 'number',
          widget: 'inputNumber',
          required: true,
          disabled: true,
          span: 6,
          props: { min: 0 },
        },
        height: {
          title: i18n('height'),
          type: 'number',
          widget: 'inputNumber',
          required: true,
          disabled: true,
          span: 6,
          props: { min: 0 },
        },
        rotate: {
          title: i18n('rotate'),
          type: 'number',
          widget: 'inputNumber',
          disabled: true,
          max: 360,
          props: { min: 0 },
          span: 6,
        },
        opacity: {
          title: i18n('opacity'),
          type: 'number',
          widget: 'inputNumber',
          disabled: true,
          props: { step: 0.1, min: 0, max: 1 },
          span: 6,
        },
      };

      return schema;
    },
    defaultSchema: {
      name: '',
      type: 'widgetGroup',
      readOnly: true,
      required: false,
      content: '',
      position: { x: 0, y: 0 },
      width: 62.5,
      height: 37.5,
      editable: false,
      widgetGroupName: 'helloWorld helloWorld helloWorld',
      widgetGroupWidth: 100,
      widgetGroupHeight: 50,
    },
  },
  icon: createSvgStr(Group),
};

export default widgetGroupSchema;