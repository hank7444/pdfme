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
    schema: ({ options, activeSchema: _activeSchema, i18n, schemas, changeSchemas, commitSchemas, onEditFunc, selectoRef  }) => {
      const widgetGroupWidgetOptions: WidgetGroupWidgetOptions 
        = options?.data?.widgetGroupWidgetOptions || {};

      const activeSchema = _activeSchema as WidgetGroupSchema;
      const { widgetGroupId, widgetGroupName } = activeSchema;
      const widgetOptions: Option[] = widgetGroupWidgetOptions[widgetGroupId] || [];

      if (widgetOptions.length) {
        const updateSelectoActiveElements = () => {
          if (selectoRef.current) {
            setTimeout(() => {
              const elems: HTMLElement[] = selectoRef.current.getSelectableElements();
              const groupWidgetElems = elems.filter((elem: HTMLElement) => {
                return elem.getAttribute('data-widgetgroup-id') === activeSchema.widgetGroupId;
              });
              onEditFunc(groupWidgetElems);
            }, 50);
          }
        }

        const activeSchemaWidgetGroupId = activeSchema.widgetGroupId as string;
        const widgetId = activeSchema.widgetGroupSection.widgetId ?? '';
        const widget = widgetOptions.find(v => v.value === widgetId) ?? null;
        const newWidgetId = widget ? widget.value : undefined;
        activeSchema.widgetGroupSection.widgetId = newWidgetId;

        const widgetGroupChildComp = schemas.find((schema: SchemaForUI) => {
          return schema.widgetGroupId === activeSchemaWidgetGroupId && schema.widgetGroupType === 'child';
        });

        if (!widgetGroupChildComp || widgetGroupChildComp.widgetId !== widgetId && widget) {
          /* 
            Filter out all the child components of the widgetGroup, newSchemas should only contain 
            the widget group parent and other components that do not belong to this widget group 
          */
          const widgetSchemas = cloneDeep(widget!.schemas) || [];
          const newSchemas = cloneDeep(schemas).filter((schema: SchemaForUI) => {
            return !(schema.widgetGroupId === activeSchemaWidgetGroupId && schema.widgetGroupType === 'child');
          });

          const widgetGroupSchemaIdx = newSchemas.findIndex((schema: SchemaForUI) => schema.id === activeSchema.id);
          
          // Add new widget child components to the pdfme schemas
          const newWidgetSchemas: SchemaForUI[] = widgetSchemas.map((schema: Schema, idx: number) => {
            schema.id = uuid();
            schema.name = `${activeSchema.widgetGroupSchemaId}_comp_${idx}`;
            schema.widgetGroupId = activeSchemaWidgetGroupId;
            schema.widgetId = newWidgetId;
            schema.widgetGroupType = 'child';

            // Maintain the relative position to the parent component
            schema.relPosition = {
              x: schema.position.x,
              y: schema.position.y
            };

            // Convert from relative coordinates to absolute coordinates
            const parantPos = activeSchema.position;
            schema.position.x += parantPos.x;
            schema.position.y += parantPos.y;

            return schema;
          });

          if (widgetGroupSchemaIdx !== -1) {
            // Use splice to insert newWidgetSchemas after the found widgetGroupSchemaIndex
            newSchemas.splice(widgetGroupSchemaIdx + 1, 0, ...newWidgetSchemas);
          }

          if (!isEqual(newSchemas, schemas)) {
            setTimeout(() => {
              commitSchemas(newSchemas);
              onEditFunc([]);
              updateSelectoActiveElements();
            });
          }
        }
      }

      const schema: Record<string, PropPanelSchema> = {
        widgetGroupSection: {
          type: 'object',
          properties: {
            widgetGroupId: {
              title: 'Widget Group',
              type: 'string',
              widget: 'select',
              default: widgetGroupId,
              disabled: true,
              props: {
                options: [{
                  label: widgetGroupName,
                  value: widgetGroupId,
                }],
                placeholder: 'Please select widgetGroup...',
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
      widgetGroupType: 'parent',
      widgetGroupId: '',
      widgetGroupName: '',
      widgetGroupSection: {
        widgetGroupId: undefined,
        widgetId: undefined,
      },
    },
  },
  icon: createSvgStr(Group),
};

export default widgetGroupSchema;