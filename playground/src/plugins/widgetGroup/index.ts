import { Plugin, Schema, PropPanelSchema, SchemaForUI, Widget } from '@pdfme/common';
import { Group } from 'lucide';
import cloneDeep from 'lodash/cloneDeep';
import { createSvgStr, uuid } from '../utils';
import { widgetCategoryOptions, widgetCategoryWidgetIds, widgetHash, Option } from './widgetData';
import { WidgetGroupSchema } from './types';


const widgetGroupSchema: Plugin<WidgetGroupSchema> = {
  ui: async (arg) => { },
  pdf: () => { },
  propPanel: {
    schema: ({ options, activeSchema: _activeSchema, i18n, schemas, changeSchemas, commitSchemas }) => {
      let widgetOptions: Option[] = [];
      const activeSchema = _activeSchema as WidgetGroupSchema;
      const activeSchemaId = activeSchema.id as string;

      const { widgetCategory, widget: widgetId = '' } = activeSchema.widgetSection.selectSection;

      if (widgetCategory) {
        widgetOptions = widgetCategoryOptions.find(v => v.value === widgetCategory)?.widgets || [];
        const newWidgetId = widgetCategoryWidgetIds[widgetCategory].includes(widgetId) ? widgetId : null

        changeSchemas([
          { key: 'widgetSection.selectSection.widget', value: newWidgetId, schemaId: activeSchemaId },
          { key: 'widgetGroupId', value: activeSchemaId, schemaId: activeSchemaId }
        ]);

        if (newWidgetId) {
          const widget: Widget = cloneDeep(widgetHash[newWidgetId]);
          const { width, height, schemas: widgetSchemas } = widget;

          const widgetGroupChildComp = schemas.find((schema: SchemaForUI) => {
            return schema.widgetGroupId === activeSchemaId && !!schema.widgetGroupName;
          });
                    
          if (!widgetGroupChildComp || widgetGroupChildComp.widgetGroupName !== widget.name) {
            let newSchemas = cloneDeep(schemas);

            newSchemas = newSchemas.filter((schema: SchemaForUI) => {
              return !(schema.widgetGroupId === activeSchemaId && schema.id !== activeSchemaId);
            });

            const widgetGroupSchema = newSchemas.find((schema: SchemaForUI) => schema.id === activeSchema.id);

            if (widgetGroupSchema) {
              widgetGroupSchema.width = width;
              widgetGroupSchema.height = height;
            }

            const newWidgetSchemas: SchemaForUI[] = widgetSchemas.map((schema: Schema, idx: number) => {
              schema.id = uuid();
              schema.name = `widgetGroup_${activeSchema.id}_${widget.name}_comp_${idx}`;
              schema.widgetGroupId = activeSchema.id;
              schema.widgetGroupName = widget.name;

              // Convert from relative coordinates to absolute coordinates
              const parantPos = activeSchema.position;
              schema.position.x += parantPos.x;
              schema.position.y += parantPos.y;

              return schema;
            });

            commitSchemas(newSchemas.concat(newWidgetSchemas));
          }
        }
      }

      const schema: Record<string, PropPanelSchema> = {
        type: {
          title: 'Type',
          widget: 'select',
          required: true,
          disabled: true,
        },
        widgetSection: {
          type: 'object',
          properties: {
            selectSection: {
              //title: "title",
              //description: "description",
              column: 1,
              type: 'object',
              widget: 'card',
              properties: {
                widgetCategory: {
                  title: 'Widget Category',
                  type: 'string',
                  widget: 'select',
                  //required: true,
                  default: '',
                  props: {
                    options: widgetCategoryOptions,
                    placeholder: 'Please select category...',
                  },
                },
                widget: {
                  title: 'Widget',
                  type: 'string',
                  widget: 'select',
                  //required: true,
                  default: '',
                  props: {
                    options: widgetOptions,
                    placeholder: 'Please select widget...',
                  },
                },
              },
            }
          }
        }
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
      widgetGroupId: '',
      widgetSection: {
        selectSection: {
          widgetCategory: undefined,
          widget: undefined,
        },
      },
      relPosition: {
        x: 0,
        y: 0,
      },
    },
  },
  icon: createSvgStr(Group),
};

export default widgetGroupSchema;