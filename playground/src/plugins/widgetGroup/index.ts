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
    schema: ({ options, activeSchema: _activeSchema, i18n, schemas, changeSchemas, commitSchemas, onEditFunc, selectoRef  }) => {
      const updateSelectoActiveElements = () => {
        if (selectoRef.current) {
          setTimeout(() => {
            const elems: HTMLElement[] = selectoRef.current.getSelectableElements();
            const groupWidgetElems = elems.filter((elem: HTMLElement) => {
              return elem.getAttribute('data-widgetgroup-id') === activeSchemaId || elem.id === activeSchema.id;
            });

            onEditFunc(groupWidgetElems);
          }, 50);
        }
      }
      
      let widgetOptions: Option[] = [];
      const activeSchema = _activeSchema as WidgetGroupSchema;

      if (!activeSchema.widgetGroupId) {
        activeSchema.widgetGroupId = uuid();
      }

      const activeSchemaId = activeSchema.id as string;
      const activeSchemaWidgetGroupId = activeSchema.widgetGroupId as string;


      const { widgetCategory, widget: widgetId = '' } = activeSchema.widgetSection.selectSection;

      if (widgetCategory) {
        widgetOptions = widgetCategoryOptions.find(v => v.value === widgetCategory)?.widgets || [];
        const newWidgetId = widgetCategoryWidgetIds[widgetCategory].includes(widgetId) ? widgetId : null

        changeSchemas([
          { key: 'widgetSection.selectSection.widget', value: newWidgetId, schemaId: activeSchemaId },
          { key: 'widgetGroupId', value: activeSchemaWidgetGroupId, schemaId: activeSchemaId }
        ]);

        // remove current widgetGroup child comps, and reset the size of groupWidget parent comp
        if (!newWidgetId) {
          activeSchema.widgetSection.selectSection.widget = undefined;
          activeSchema.width = 62.5;
          activeSchema.height = 37.5;
          const hasChildWidgets = schemas.some((schema: SchemaForUI) => 
            schema.widgetGroupId === activeSchemaWidgetGroupId && schema.widgetGroupType === 'child');
          const newSchemas = schemas.filter((schema: SchemaForUI) => {
            return !(schema.widgetGroupId === activeSchemaWidgetGroupId && !!schema.widgetId);
          });

          if (hasChildWidgets) {
            onEditFunc([]);
          }

          commitSchemas(newSchemas);
          updateSelectoActiveElements();

        } else {
          const widget: Widget = cloneDeep(widgetHash[newWidgetId]);
          const { width, height, schemas: widgetSchemas } = widget;

          const widgetGroupChildComp = schemas.find((schema: SchemaForUI) => {
            return schema.widgetGroupId === activeSchemaWidgetGroupId && !!schema.widgetGroupCompId;
          });
                    
          if (!widgetGroupChildComp || widgetGroupChildComp.widgetGroupCompId !== widget.id) {
            let newSchemas = cloneDeep(schemas);

            newSchemas = newSchemas.filter((schema: SchemaForUI) => {
              return !(schema.widgetGroupId === activeSchemaWidgetGroupId && schema.id !== activeSchemaId);
            });

            const widgetGroupSchema = newSchemas.find((schema: SchemaForUI) => schema.id === activeSchemaId);

            if (widgetGroupSchema) {
              widgetGroupSchema.width = width;
              widgetGroupSchema.height = height;
            }

            const newWidgetSchemas: SchemaForUI[] = widgetSchemas.map((schema: Schema, idx: number) => {
              schema.id = uuid();
              schema.name = `widgetGroup_${activeSchemaWidgetGroupId}_${widget.name}_comp_${idx}`;
              schema.widgetGroupId = activeSchemaWidgetGroupId;
              schema.widgetGroupCompId = widget.id;
              schema.widgetGroupType = 'child';

              // Convert from relative coordinates to absolute coordinates
              const parantPos = activeSchema.position;
              schema.position.x += parantPos.x;
              schema.position.y += parantPos.y;

              return schema;
            });
          
            commitSchemas(newSchemas.concat(newWidgetSchemas));
            onEditFunc([]);
            updateSelectoActiveElements();
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
      widgetGroupCompId: '',
      widgetGroupType: 'parent',
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