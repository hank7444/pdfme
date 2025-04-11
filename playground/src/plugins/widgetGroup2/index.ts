import { Plugin, Schema, PropPanelSchema, SchemaForUI, Widget, cloneDeep } from '@pdfme/common';
import { Group } from 'lucide';
import isEqual from 'lodash/isEqual';
import { createSvgStr, uuid } from '../utils';
//import { widgetCategoryOptions, widgetCategoryWidgetIds, widgetHash, Option } from './widgetData';
import { Option, WidgetGroupSchema } from './types';


const widgetGroupSchema: Plugin<WidgetGroupSchema> = {
  ui: async (arg) => { },
  pdf: () => { },
  propPanel: {
    schema: ({ options, activeSchema: _activeSchema, i18n, schemas, commitSchemas, onEditFunc, selectoRef  }) => {
      let widgetOptions: Option[] = [];
      const { 
        categoryOptions,
        categoryWidgetIds,
        widgets = [],
      } = options?.data?.widgetGroup || {};

      if (categoryOptions && categoryWidgetIds && widgets.length) {
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

        const activeSchema = _activeSchema as WidgetGroupSchema;

        if (!activeSchema.widgetGroupId) {
          activeSchema.widgetGroupId = uuid();
        }

        const activeSchemaWidgetGroupId = activeSchema.widgetGroupId as string;
        const { widgetCategory, widget: widgetId = '' } = activeSchema.widgetGroupSection;

        if (widgetCategory) {
          widgetOptions = categoryOptions.find(v => v.value === widgetCategory)?.widgets || [];
          const newWidgetId = categoryWidgetIds[widgetCategory].includes(widgetId) ? widgetId : undefined;
          activeSchema.widgetGroupSection.widget = newWidgetId;
    
          // remove current widgetGroup child comps, and reset the size of groupWidget parent comp
          if (!newWidgetId) {
            activeSchema.widgetGroupSection.widget = undefined;
            activeSchema.width = 62.5;
            activeSchema.height = 37.5;
    
            // Filter out all the child components of this widget group from the schemas
            const newSchemas = schemas.filter((schema: SchemaForUI) => {
              return !(schema.widgetGroupId === activeSchemaWidgetGroupId && schema.widgetGroupType === 'child');
            });

            if (!isEqual(newSchemas, schemas)) {
              setTimeout(() => {
                commitSchemas(newSchemas);
                onEditFunc([]);
                updateSelectoActiveElements();
              });
            }
          } else {
            const widget: Widget = cloneDeep(widgets.find((widget: Widget) => widget.id === newWidgetId));
            const { width, height, schemas: widgetSchemas } = widget;

            // The widgetGroupCompId property of the Widget group component will always be undefined
            const widgetGroupChildComp = schemas.find((schema: SchemaForUI) => {
              return schema.widgetGroupId === activeSchemaWidgetGroupId && schema.widgetGroupType === 'child';
            });
                      
            if (!widgetGroupChildComp || widgetGroupChildComp.widgetGroupCompId !== widget.id) {
              /* 
                Filter out all the child components of the widgetGroup, newSchemas should only contain 
                the widget group parent and other components that do not belong to this widget group 
              */
              const newSchemas = cloneDeep(schemas).filter((schema: SchemaForUI) => {
                return !(schema.widgetGroupId === activeSchemaWidgetGroupId && schema.widgetGroupType === 'child');
              });

              const widgetGroupSchemaIdx = newSchemas.findIndex((schema: SchemaForUI) => schema.id === activeSchema.id);
              const widgetGroupSchema: SchemaForUI | null = newSchemas[widgetGroupSchemaIdx] || null;

              if (widgetGroupSchema) {
                widgetGroupSchema.width = width;
                widgetGroupSchema.height = height;
              }

              // Add new widget child components to the pdfme schemas
              const newWidgetSchemas: SchemaForUI[] = widgetSchemas.map((schema: Schema, idx: number) => {
                schema.id = uuid();
                schema.name = `widgetGroup_${activeSchemaWidgetGroupId}_comp_${idx}`;
                schema.widgetGroupId = activeSchemaWidgetGroupId;
                schema.widgetGroupCompId = widget.id;
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
        }
      }

      const schema: Record<string, PropPanelSchema> = {
        type: {
          title: 'Type',
          widget: 'select',
          required: true,
          disabled: true,
        },
        widgetGroupSection: {
          type: 'object',
          properties: {
            widgetCategory: {
              title: 'Widget Category',
              type: 'string',
              widget: 'select',
              default: '',
              props: {
                options: categoryOptions,
                placeholder: 'Please select category...',
              },
            },
            widget: {
              title: 'Widget',
              type: 'string',
              widget: 'select',
              default: '',
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
      readOnly: true,
      required: false,
      content: '',
      position: { x: 0, y: 0 },
      width: 62.5,
      height: 37.5,
      widgetGroupId: '',
      widgetGroupCompId: '',
      widgetGroupType: 'parent',
      widgetGroupSection: {
        widgetCategory: undefined,
        widget: undefined,
      },
    },
  },
  icon: createSvgStr(Group),
};

export default widgetGroupSchema;