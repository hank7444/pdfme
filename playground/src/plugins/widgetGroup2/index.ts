import { Plugin, Schema, PropPanelSchema, SchemaForUI, Widget, cloneDeep } from '@pdfme/common';
import { Group } from 'lucide';
import isEqual from 'lodash/isEqual';
import { createSvgStr, uuid } from '../utils';
//import { widgetCategoryOptions, widgetCategoryWidgetIds, widgetHash, Option } from './widgetData';
import { Option, WidgetGroupWidgetOptions, WidgetGroupSchema } from './types';


const widgetGroupSchema: Plugin<WidgetGroupSchema> = {
  ui: async (arg) => {
    const { schema, rootElement } = arg;
    const previewImage = schema.previewImage as string;

    if (previewImage) {
      const div = document.createElement('div');
      div.style.backgroundColor = 'transparent';
      div.style.width = '100%';
      div.style.height = '100%';

      const img = document.createElement('img');
      img.src = previewImage;
      div.appendChild(img);
      rootElement.appendChild(div);
    }
  },
  pdf: () => { },
  propPanel: {
    schema: ({ options, activeSchema: _activeSchema, i18n, schemas, commitSchemas, onEditFunc, selectoRef  }) => {

      const schema: Record<string, PropPanelSchema> = {
        type: {
          title: 'Type',
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
        editable: { 
          title: i18n('editable'), 
          type: 'boolean', 
          span: 8, 
          hidden: true,
        },
        required: { 
          title: i18n('required'), 
          type: 'boolean', 
          span: 16, 
          hidden: true,
        },
      };

      return schema;
    },
    defaultSchema: {
      name: '',
      type: 'widgetGroup',
      content: '',
      position: { x: 0, y: 0 },
      width: 62.5,
      height: 37.5,
    },
  },
  icon: createSvgStr(Group),
};

export default widgetGroupSchema;