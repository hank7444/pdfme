import { Plugin, Schema, PropPanelSchema, SchemaForUI, Widget, cloneDeep } from '@pdfme/common';
import { Group } from 'lucide';
import { createSvgStr, uuid } from '../utils';
import { widgetCategoryOptions, widgetCategoryWidgetIds, widgetHash, Option } from './widgetData';

interface WidgetGroup extends Schema {}


export const widgetGroup: Plugin<WidgetGroup> = {
    ui: async (arg) => {},
    pdf: () => {},
    propPanel: {
      schema: ({ options, activeSchema, i18n, schemas, changeSchemas, commitSchemas, removeSchemas  }) => {
        
        let widgetOptions: Option[] = [];

        // @ts-expect-error asdsad 
        const { widgetCategory, widget: widgetId } = activeSchema.widgetSection.selectSection;

        if (widgetCategory) {
          widgetOptions = widgetCategoryOptions.find(v => v.value === widgetCategory)?.widgets || [];
          const newWidgetId = widgetCategoryWidgetIds[widgetCategory].includes(widgetId) ? widgetId: null

          changeSchemas([{ key: 'widgetSection.selectSection.widget', value: newWidgetId, schemaId: activeSchema.id }]);

          if (newWidgetId) {
            const widget: Widget = cloneDeep(widgetHash[newWidgetId]);

            console.log('### widget: ', widget);

            const { width, height, schemas } = widget;

            changeSchemas([
              { key: 'width', value: width, schemaId: activeSchema.id },
              { key: 'height', value: height, schemaId: activeSchema.id }
            ]);


            const newWidgetSchemas = schemas.map((schema, idx) => {
              schema.id = uuid();
              schema.name = `${activeSchema.id}_${widget.name}_comp_${idx}`;
              return schema;
            })

            console.log('newWidgetSchemas', newWidgetSchemas);
            
            commitSchemas(schemas.concat(newWidgetSchemas));
          }
        }

        const schema: Record<string, PropPanelSchema> = {
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
        content: '',
        position: { x: 0, y: 0 },
        width: 62.5,
        height: 37.5,
        widgetSection: {
          selectSection: {
            widgetCategory: null,
            widget: null,
          }
        }
      },
    },
    icon: createSvgStr(Group),
  };
  