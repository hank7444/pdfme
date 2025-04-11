import { Plugin, Schema, PropPanelSchema, SchemaForUI, Widget, cloneDeep } from '@pdfme/common';
import { Group } from 'lucide';
import isEqual from 'lodash/isEqual';
import { createSvgStr, uuid } from '../utils';
//import { widgetCategoryOptions, widgetCategoryWidgetIds, widgetHash, Option } from './widgetData';
import { Option, WidgetGroupWidgetOptions, WidgetGroupSchema } from './types';


const widgetGroupSchema: Plugin<WidgetGroupSchema> = {
  ui: async (arg) => { },
  pdf: () => { },
  propPanel: {
    schema: ({ options, activeSchema: _activeSchema, i18n, schemas, commitSchemas, onEditFunc, selectoRef  }) => {
      const widgetGroupWidgetOptions: WidgetGroupWidgetOptions 
        = options?.data?.widgetGroupWidgetOptions || {};

      const activeSchema = _activeSchema as WidgetGroupSchema;
      
      if (!activeSchema.widgetGroupSchemaId) {
        activeSchema.widgetGroupSchemaId = uuid();
      }
      
      const { widgetGroupId, widgetGroupName } = activeSchema;
      const widgetOptions: Option[] = widgetGroupWidgetOptions[widgetGroupId] || [];

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
        widgetGroupSection: {
          type: 'object',
          properties: {
            widgetGroupId: {
              title: 'Widget Group',
              type: 'string',
              widget: 'select',
              default: widgetGroupName,
              disabled: true,
              props: {
                options: [],
                placeholder: 'Please select category...',
              },
            },
            widgetId: {
              title: 'Widget',
              type: 'string',
              widget: 'select',
              default: null,
              props: {
                options: widgetOptions,
                placeholder: 'Please select widget...',
              },
            },
          },
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
      widgetGroupSchemaId: '',
      //widgetGroupCompId: '',
      widgetGroupType: 'parent',
      widgetGroupSection: {
        widgetGroupId: undefined,
        widgetId: undefined,
      },
    },
  },
  icon: createSvgStr(Group),
};

export default widgetGroupSchema;