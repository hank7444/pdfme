import { useRef, useState, useEffect, useCallback } from "react";
import { cloneDeep, Template, Schema, EditWidgetInfo, Size } from "@pdfme/common";
import { Designer } from "@pdfme/ui";
import {
  getFontsData,
  getPlugins,
  uuid,
  displayJSONDataFromLocalStorage,
} from "../helper";
import { NavBar, NavItem } from "../NavBar";

import { WidgetEditInfo, WidgetGroup, Widget } from '../WidgetGroupDesigner/types';
import {
  getBlankTemplate,
  getDefaultWidgetEditInfo,
  getTemplatePadding,
  isRectangleBOutOfBounds,
} from '../WidgetGroupDesigner/helper';


function DesignerApp() {
  const designerRef = useRef<HTMLDivElement | null>(null);
  const designer = useRef<Designer | null>(null);
  const widgetEditInfoRef = useRef<WidgetEditInfo>(getDefaultWidgetEditInfo());
  const pageCursorToUpdateRef = useRef<number | null>(null);

  const widgetGroupIdRef = useRef<string>('');

  const [selectedWidgetId, setSelectedWidgetId] = useState<string>('');
  const [widgetName, setWidgetName] = useState<string>('');
  const [action, setAction] = useState('new');
  const [isDisabledSaveBtn, setIsDisabledSaveBtn] = useState<boolean>(true);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [widgetGroup, setWidgetGroup] = useState<WidgetGroup>();

  const finalIsDisabledSaveBtn = isDisabledSaveBtn || !widgetName;

  const buildDesigner = useCallback(() => {
    if (!designerRef.current) return;
    try {
      const template: Template = getBlankTemplate();
      
      // We don't load the template from local storage in the Widget Designer initially
      /*
      const templateFromLocal = localStorage.getItem("template");
      
      if (templateFromLocal) {
        const templateJson = JSON.parse(templateFromLocal) as Template;
        checkTemplate(templateJson);
        template = templateJson;
      }
      */

      designer.current = new Designer({
        domContainer: designerRef.current,
        template,
        options: {
          font: getFontsData(),
          lang: "en",
          labels: {
            clear: "🗑️",
          },
          theme: {
            token: {
              colorPrimary: "#25c2a0",
            },
          },
          icons: {
            multiVariableText:
              '<svg fill="#000000" width="24px" height="24px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6.643,13.072,17.414,2.3a1.027,1.027,0,0,1,1.452,0L20.7,4.134a1.027,1.027,0,0,1,0,1.452L9.928,16.357,5,18ZM21,20H3a1,1,0,0,0,0,2H21a1,1,0,0,0,0-2Z"/></svg>',
          },
        },
        plugins: getPlugins(),
        isEditWidgetGroupMode: false,
        isWidgetDesigner: true,
      });
    } catch {
      //localStorage.removeItem("template");
    }

    // init widget dropdown
    getWidgetsFromLocalStorage();
  }, []);

  const getWidgetsFromLocalStorage = () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const widgetGroupId = urlParams.get('widgetGroupId') || '';

      widgetGroupIdRef.current = widgetGroupId;

      const widgetGroupsFromLocal = localStorage.getItem('widgetGroups');

      if (widgetGroupsFromLocal) {
        const widgetGroups: WidgetGroup[] = JSON.parse(widgetGroupsFromLocal);

        const widgetGroup = widgetGroups.find((w => w.id === widgetGroupId))
        const widgets = widgetGroup?.widgets || [];

        if (widgetGroup) {
          const { 
            basePdf,
            pageSize,
            width,
            height,
            position,
            pageCursor,
           } = widgetGroup;


          widgetEditInfoRef.current = {
            basePdf,
            pageSize,
            pageCursor,
            width,
            height,
            position,
            schemas: [],
          };

          setWidgetGroup(widgetGroup);
          setWidgets(widgets);

          pageCursorToUpdateRef.current = pageCursor;

          if (designer.current) {
            const template = designer.current.getTemplate();

            if (basePdf) {
              template.basePdf = basePdf;
            }

            const padding = pageCursor === 0 
              ? getTemplatePadding(pageSize.width, pageSize.height, width, height, position) 
              : getTemplatePadding(pageSize.width, pageSize.height, 0, 0, { x: 0, y: 0 });
            template.editWidgetInfo!.padding = padding;
            template.editWidgetInfo!.pageCursor = pageCursor;

            designer.current.updateTemplate(template);
          }
        }
      }
    } catch {
      localStorage.removeItem("widgets");
    }
  }

  const onSaveWidget = () => {

    if (designer.current) {
      let widgetGroups: WidgetGroup[] = [];

      try {
        const widgetGroupsFromLocal = localStorage.getItem("widgetGroups");

        if (widgetGroupsFromLocal) {
          widgetGroups = JSON.parse(widgetGroupsFromLocal);
        }
      } catch (e) {
        // do nothing here
      }
      const { pageCursor } = widgetEditInfoRef.current;
      const widgetGroupIndex = widgetGroups.findIndex(w => w.id === widgetGroupIdRef.current);
      const widgetGroup = widgetGroups[widgetGroupIndex];
      const widgets = widgetGroup.widgets;

      const { position } = widgetGroup;
      const template: Template = cloneDeep(designer.current.getTemplate());
    

      const id: string = selectedWidgetId || uuid();
      const schemas = template?.schemas[pageCursor].map((schema) => {
        const name = schema.name.indexOf(id) === -1
          ? `${id}_${schema.name}`
          : schema.name; 

        const newSchema = Object.assign(cloneDeep(schema), {
          name,
          position: {
            x: schema.position.x - position.x,
            y: schema.position.y - position.y,
          },
        });

        return newSchema;
      });

      const widget = {
        id,
        name: widgetName,
        schemas,
      };


      const existWidgetIdx = widgets.findIndex((v) => v.id === id);

      if (existWidgetIdx !== -1) {
        widgets[existWidgetIdx] = widget;
      } else {
        widgets.push(widget);
        setSelectedWidgetId(id);
        setAction('update');
      }

      localStorage.setItem(
        "widgetGroups",
        JSON.stringify(widgetGroups)
      );

      setWidgets(widgets);
    }
  };

  const onViewWidgetData = () => {
    displayJSONDataFromLocalStorage('widgetGroups');
  };


  const onChangeTemplate = useCallback(async (template?: Template | undefined) => {
    const { pageCursor } = widgetEditInfoRef.current;

    const pageCursorSchemas = template?.schemas[pageCursor] ?? [];

    // Check if any schema exceeds the widget boundaries.
    const hasAnySchemas = !!pageCursorSchemas.length
    const hasAnyOutOfBoundsSchemas = pageCursorSchemas.some((schema) => {
      return isRectangleBOutOfBounds(widgetEditInfoRef.current, schema);
    }) || false;

    const isDisabled = !hasAnySchemas || hasAnyOutOfBoundsSchemas;
    setIsDisabledSaveBtn(isDisabled);
  }, []);

  const onChangePageCursor = useCallback((pageCursor: number) => {
    const { pageCursor: currentPageCursor, width, height, position } = widgetEditInfoRef.current;
    const pageSize = widgetEditInfoRef.current.pageSize;


    if (designer.current) {

      /* 
        The padding for the page needs to be updated 
        because each page of the same PDF file may have different size.
      */
      const template = designer.current.getTemplate();
      const padding = pageCursor !== currentPageCursor
        ? getTemplatePadding(pageSize.width, pageSize.height, 0, 0, { x: 0, y: 0 })
        : getTemplatePadding(pageSize.width, pageSize.height, width, height, position);

      template.editWidgetInfo!.padding = padding;
      designer.current.updateTemplate(template);
    }
  }, [])

  
  const onChangePageSizes = useCallback((pageSizes: Size[]) => {
    if (pageCursorToUpdateRef.current) {
      const pageCursor = pageCursorToUpdateRef.current;
      pageCursorToUpdateRef.current = null;

      setTimeout(() => {
        if (designer.current) {
          designer.current.setPageCursor(pageCursor);
        }
      }, 1000);
    }
    
    /*
    if (!pageSizes.length) {
      return;
    }

    const { pageCursor, pageSize: currentPageSize, position } = widgetEditInfoRef.current;
    const pageSize = pageSizes[widgetEditInfoRef.current.pageCursor];


    widgetEditInfoRef.current.pageSize = pageSize;

    if (pageSize && currentPageSize && currentPageSize.width === pageSize.width && currentPageSize.height === pageSize.height) {
      return;
    }

    if (designer.current) {
      const template = cloneDeep(designer.current.getTemplate());
      const editWidgetInfo = template.editWidgetInfo as EditWidgetInfo;
      const padding = getTemplatePadding(pageSize.width, pageSize.height, editWidgetInfo.width, editWidgetInfo.height, position);
      template.editWidgetInfo!.padding = padding;
      template.editWidgetInfo!.pageCursor = pageCursor;
      designer.current.updateTemplate(template);
    }
    */
  }, [])
  



  const onChangeWidgetSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const id = event.target.value;
    const selectedWidget = cloneDeep(widgets.find(widget => widget.id === id));

    if (selectedWidget && widgetGroup) {
      const { width, height } = widgetGroup;
      const { pageCursor, position, basePdf, pageSize } = widgetGroup;

      const { name, schemas } = selectedWidget;
      const padding = getTemplatePadding(pageSize.width, pageSize.height, width, height, position);
      const template: Template = getBlankTemplate();

      template.editWidgetInfo = {
        width,
        height,
        padding,
        pageCursor,
      }

      widgetEditInfoRef.current = {
        width,
        height,
        position,
        schemas,
        pageCursor,
        pageSize,
        basePdf,
      };
      setSelectedWidgetId(id);
      setWidgetName(name);

      const newSchemas: Schema[][] = new Array(pageCursor + 1).fill([]).map(() => []);
      const newWidgetSchemas = schemas.map((schema) => {
        schema.position.x += position.x;
        schema.position.y += position.y;
        return schema;
      });
      
      newSchemas[pageCursor] = newWidgetSchemas;
      template.schemas = newSchemas;
      
      if (basePdf) {
        template.basePdf = basePdf;

        /* 
          Temporarily store the pageCursor so that 
          it can be used to scroll to the page in onChangePageSizes.

          The reason for doing this is to ensure that the PDF 
          is loaded before scrolling the page.
        */
        pageCursorToUpdateRef.current = pageCursor;
      } 

      if (designer.current) {
        designer.current.updateTemplate(template);
      }
    }
  };


  const onChangeActionRadio = (event: React.ChangeEvent<HTMLInputElement>) => {
    const action = event.target.value;

    setWidgetName('');
    setSelectedWidgetId('');
    setAction(action);


    if (action === 'new') {
      //widgetEditInfoRef.current = getDefaultWidgetEditInfo();

      if (designer.current) {
        const template: Template = designer.current.getTemplate();

        template.schemas = template.schemas.map(() => {
          return [];
        })

        designer.current.updateTemplate(template);
      }
    }
  };

  useEffect(() => {
    if (designerRef.current) {
      buildDesigner();
    }
    return () => {
      if (designer.current) {
        designer.current.destroy();
      }
    }
  }, [designerRef, buildDesigner]);

  useEffect(() => {
    if (designer.current) {
      designer.current.onChangeTemplate(onChangeTemplate);
    }
  }, [onChangeTemplate]);

  useEffect(() => {
    if (designer.current) {
      designer.current.onChangePageCursor(onChangePageCursor);
    }
  }, [onChangePageCursor]);

  
  useEffect(() => {
    if (designer.current) {
      designer.current.onChangePageSizes(onChangePageSizes);
    }
  }, [onChangePageSizes]);
  

  

  const navItems: NavItem[] = [
    {
      label: "Action",
      content: (
        <div style={{ marginTop: '10px' }}>
          <label>
            <input type="radio" id="new" name="action" value="new"
              checked={action === 'new'}
              onChange={onChangeActionRadio} />
            <span style={{ marginLeft: '5px' }}>New Widget</span>
          </label>

          <label style={{ marginLeft: '10px' }}>
            <input type="radio" id="update" name="action" value="update"
              checked={action === 'update'}
              onChange={onChangeActionRadio} />
            <span style={{ marginLeft: '5px' }}>Update Widget</span>
          </label>
        </div>
      ),
    },
    {
      label: "Widget List",
      content: (
        <>
          <select
            className="w-full border rounded px-2 py-1"
            style={{ width: '200px' }}
            value={selectedWidgetId || ''}
            disabled={action !== 'update'}
            onChange={onChangeWidgetSelect}
          >
            <option value="" disabled>Please select widget...</option>
            {widgets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          {/*
          <button
            className="px-2 py-1 border rounded hover:bg-gray-100 disabled:bg-gray-500"
            style={{ marginLeft: '10px' }}
            disabled={action !== 'update'}
            onClick={onResetDefaultWidgets}
          >
            Reset to Defaults
          </button>
          <button
            className="px-2 py-1 border rounded hover:bg-gray-100 disabled:bg-gray-500"
            style={{ marginLeft: '10px' }}
            disabled={!selectedWidgetId}
            onClick={onCloneWidget}
          >
            Clone Widget
          </button>
          */}
        </>
      ),
    },
    {
      label: "",
      content: (
        <>
          <div style={{ display: 'inline-block' }}>
            <div style={{ float: "right", marginBottom: "10px" }}>Id:&nbsp;
              <input type="text" readOnly value={selectedWidgetId} style={{ 
                paddingLeft: 3, 
                width: "150px", 
                border: "1px solid black" 
              }} />
            </div>
            <div>Name:&nbsp;
              <input type="text" value={widgetName} style={{
                paddingLeft: 3,
                width: "150px",
                border: "1px solid black",
              }}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setWidgetName(e.target.value); }}
              />
            </div>
          </div>
        </>
      ),
    },
  ];


  return (
    <>
      <div style={{ fontWeight: 'bold', paddingLeft: 5 }} >Widget Group: {widgetGroup?.name}</div>
      <NavBar items={navItems} />
      {/* <NavBar items={navItems2} /> */}
      <div ref={designerRef} className="flex-1 w-full" />

      <div style={{
        position: 'absolute',
        right: '30px',
        top: '60px',
        fontSize: '14px',
      }}>
        <button
          type="button"
          className="px-2 py-1 border rounded hover:bg-gray-100 active:bg-sky-700 disabled:bg-gray-500"
          disabled={finalIsDisabledSaveBtn}
          onClick={() => onSaveWidget()}
        >
          Save Widget
        </button>
        <button
          type="button"
          style={{ marginLeft: '10px' }}
          className="px-2 py-1 border rounded hover:bg-gray-100 active:bg-sky-700"
          onClick={() => onViewWidgetData()}
        >
          View Widget Data
        </button>
      </div>
    </>
  );
}

export default DesignerApp;
