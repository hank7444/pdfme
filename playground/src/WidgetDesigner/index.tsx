import { useRef, useState, useEffect, useCallback } from "react";
import { cloneDeep, Template, checkTemplate, Lang, Schema, EditWidgetInfo, Size } from "@pdfme/common";
import { Designer } from "@pdfme/ui";
import {
  getFontsData,
  getPlugins,
  uuid,
  readFile,
  DEFAULT_TEMPLATE_WIDTH,
  DEFAULT_TEMPLATE_HEIGHT,
} from "../helper";
import { NavBar, NavItem } from "./NavBarForWidgetDesigner";
import { Widget, BasePdf, WidgetEditInfo } from './types';
import { 
  DEFAULT_WIDGET_EDIT_REC_SIZE,
  getBlankTemplate,
  getTemplatePadding, 
  isRectangleBOutOfBounds,
} from './helper';
import defaultWidgets from "./defaultWidgets";


function DesignerApp() {
  const designerRef = useRef<HTMLDivElement | null>(null);
  const designer = useRef<Designer | null>(null);
  const widgetEditInfoRef = useRef<WidgetEditInfo>({
    schemas: [],
    position: { x: 0, y: 0 },
    ...DEFAULT_WIDGET_EDIT_REC_SIZE,
    pageCursor: 0,
    pageSizes: [{ width: DEFAULT_TEMPLATE_WIDTH, height: DEFAULT_TEMPLATE_HEIGHT }],
    pageSize: { width: DEFAULT_TEMPLATE_WIDTH, height: DEFAULT_TEMPLATE_HEIGHT },
    basePdf: '',
  });

  const [selectedWidgetId, setSelectedWidgetId] = useState<string>('');
  const [widgetName, setWidgetName] = useState<string>('');
  const [action, setAction] = useState('new');
  const [isDisabledSaveBtn, setIsDisabledSaveBtn] = useState<boolean>(true);
  const [isEditWidgetMode, setIsEditWidgetMode] = useState<boolean>(false);
  const [widgets, setWidgets] = useState<Widget[]>([]);


  const finalIsDisabledSaveBtn = isDisabledSaveBtn || !widgetName;


  const buildDesigner = useCallback(() => {
    if (!designerRef.current) return;
    try {
      let template: Template = getBlankTemplate();
      const templateFromLocal = localStorage.getItem("template");
      const { pageCursor } = widgetEditInfoRef.current;

      if (templateFromLocal) {
        const templateJson = JSON.parse(templateFromLocal) as Template;
        checkTemplate(templateJson);
        template = templateJson;
      }

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
        isEditWidgetMode: false,
        isWidgetDesigner: true,
      });
      setIsDisabledSaveBtn(!template.schemas[pageCursor].length);

      setTimeout(() => {
        if (designer.current) {
          designer.current.setPageCursor(1);
        }
      }, 3000);
    } catch {
      localStorage.removeItem("template");
    }


    // init widget dropdown
    getWidgetsFromLocalStorage();
  }, []);

  const getWidgetsFromLocalStorage = () => {
    try {
      const widgetsFromLocal = localStorage.getItem("widgets");

      if (widgetsFromLocal) {
        const widgets = JSON.parse(widgetsFromLocal);
        setWidgets(widgets);
      }
    } catch {
      localStorage.removeItem("widgets");
    }
  }



  const onSaveWidget = () => {

    if (designer.current) {
      const widgetEditInfo = widgetEditInfoRef.current;
      const template: Template = cloneDeep(designer.current.getTemplate());
      let widgets: Widget[] = [];

      try {
        const widgetsFromLocal = localStorage.getItem("widgets");

        if (widgetsFromLocal) {
          widgets = JSON.parse(widgetsFromLocal);
          //setWidgets(widgets);
        }
      } catch (e) {
        // do nothing here
      }
      
      const id: string = selectedWidgetId || uuid();
      const schemas = template?.schemas[widgetEditInfo.pageCursor].map((schema) => {
        const name = schema.name.indexOf(id) === -1
          ? `${id}_${schema.name}`
          : schema.name; localStorage.setItem("widgets", JSON.stringify(widgets));

        const newSchema = Object.assign(cloneDeep(schema), {
          name,
          position: {
            x: schema.position.x - widgetEditInfo.position.x,
            y: schema.position.y - widgetEditInfo.position.y,
          },
        });

        return newSchema;
      });

      const widget = {
        id,
        name: widgetName,
        width: widgetEditInfo.width,
        height: widgetEditInfo.height,
        editInfo: {
          position: widgetEditInfo.position,
          pageCursor: widgetEditInfo.pageCursor,
          pageSizes: widgetEditInfo.pageSizes,
          basePdf: widgetEditInfo.basePdf,
        },
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
        "widgets",
        JSON.stringify(widgets)
      );

      setWidgets(widgets);
    }
  };

  const onViewWidgetData = () => {
    const formatJSONToHTML = (data: any): string => {
      if (typeof data === "object" && data !== null) {
        let htmlContent = "<ul>";
        
        if (Array.isArray(data)) {
          data.forEach((item, index) => {
            htmlContent += `<li><span class="key">[${index}]:</span> ${formatJSONToHTML(item)}</li>`;
          });
        } else {
          Object.keys(data).forEach((key) => {
            htmlContent += `<li><span class="key">"${key}":</span> ${formatJSONToHTML(data[key])}</li>`;
          });
        }
        
        htmlContent += "</ul>";
        return htmlContent;
      } else if (typeof data === "string") {
        return `<span class="string">"${data}"</span>`;
      } else if (typeof data === "number") {
        return `<span class="number">${data}</span>`;
      } else if (typeof data === "boolean") {
        return `<span class="boolean">${data}</span>`;
      } else {
        return `<span class="null">null</span>`;
      }
    };

    try {

      const newTab = window.open("", "_blank");
      if (newTab) {
        newTab.document.write("<html><head><title>Widget Data</title></head><body>");
        newTab.document.write("<h1>Widget Data</h1>");
        newTab.document.write(`
          <style>
            body {
              font-family: 'Consolas', 'Monaco', monospace;
              background-color: #1e1e1e;
              color: #dcdcdc;
              margin: 0;
              padding: 20px;
            }
            pre {
              background-color: #252526;
              padding: 10px;
              border-radius: 5px;
              overflow-x: auto;
              color: #dcdcdc;
            }
            .key {
              color: #569cd6; /* VS Code key color */
              font-weight: bold;
            }
            .string {
              color: #dcdcaa; /* VS Code string color */
            }
            .number {
              color: #b5cea8; /* VS Code number color */
            }
            .boolean {
              color: #ce9178; /* VS Code boolean color */
            }
            .null {
              color: #808080; /* VS Code null color */
            }
            ul {
              list-style-type: none;
            }
          </style>
        `);
        
        const storedData = localStorage.getItem("widgets");
        const parsedData = storedData ? JSON.parse(storedData) : null;
    
        if (parsedData) {
          newTab.document.write("<pre>" + formatJSONToHTML(parsedData) + "</pre>");
        } else {
          newTab.document.write("<p>No data found in localStorage.</p>");
        }
    
        newTab.document.write("</body></html>");
        newTab.document.close();
      } else {
        console.error("Failed to open new tab.");
      }
    } catch {
      //
    }
  };

  const onResetDefaultWidgets = () => {
    localStorage.setItem("widgets", JSON.stringify(defaultWidgets));
    getWidgetsFromLocalStorage();
    setSelectedWidgetId('');

    if (designer.current) {
      const template: Template = getBlankTemplate();
      template.schemas = [[]];
      designer.current.updateTemplate(template);
    }
  };



  const onChangeTemplate = useCallback(async (template?: Template | undefined) => {
    const { pageCursor } = widgetEditInfoRef.current;

    // Check if any schema exceeds the widget boundaries.
    const hasAnySchemas = !!template?.schemas[pageCursor].length
    const hasAnyOutOfBoundsSchemas = template?.schemas[pageCursor].some((schema) => {
      return isRectangleBOutOfBounds(widgetEditInfoRef.current, schema);
    }) || false;

    const isDisabled = !hasAnySchemas || hasAnyOutOfBoundsSchemas;    
    setIsDisabledSaveBtn(isDisabled);
  }, []);

  const onChangePageCursor = useCallback((pageCursor: number) => {
    const { pageCursor: currentPageCursor, pageSizes, width, height, position } = widgetEditInfoRef.current;
    widgetEditInfoRef.current.pageCursor = pageCursor;
    let pageSize = widgetEditInfoRef.current.pageSize;

    if (pageSizes.length) {
      pageSize = pageSizes[pageCursor];
      widgetEditInfoRef.current.pageSize = pageSize;
    }

    if (designer.current) {
      const template = designer.current.getTemplate();
      const schemas = template.schemas;

      // move schemas
      for (let i = 0; i <= pageCursor; i++) {
        if (!Array.isArray(schemas[i])) {
          schemas[i] = [];
        }
      }

      const schema = cloneDeep(schemas[currentPageCursor]);
      schemas[currentPageCursor] = [];
      schemas[pageCursor] = schema;

      if (!pageSize) {
        return;
      }

      // update padding for the page
      const padding = getTemplatePadding(pageSize.width, pageSize.height, width, height, position);
      template.editWidgetInfo!.padding = padding;
      template.editWidgetInfo!.pageCursor = pageCursor;
      designer.current.updateTemplate(template);
    }
  }, [])

  const onChangePageSizes = useCallback((pageSizes: Size[]) => {

    if (!pageSizes.length) {
      return;
    }
    
    const { pageCursor, pageSize: currentPageSize, position } = widgetEditInfoRef.current;
    const pageSize = pageSizes[widgetEditInfoRef.current.pageCursor];

    widgetEditInfoRef.current.pageSizes = pageSizes;
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
  }, [])

  const OnChangeWidgetSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const id = event.target.value;
    const selectedWidget = cloneDeep(widgets.find(widget => widget.id === id));

    console.log('@@@ selectedWidget', selectedWidget);

    if (selectedWidget) {
      const { width, height, name, schemas, editInfo: { basePdf, position, pageCursor, pageSizes } } = selectedWidget;
      const pageSize = pageSizes[pageCursor];
      const padding = getTemplatePadding(pageSize.width, pageSize.height, width, height, position);

      widgetEditInfoRef.current = {
        width,
        height,
        position,
        schemas,
        pageCursor,
        pageSize,
        pageSizes,
        basePdf,
      };
      setSelectedWidgetId(id);
      setWidgetName(name);

      // Delay calling updateTemplate() to ensure that the width and height states have been updated already."
      setTimeout(() => {
        const newWidgetSchemas = schemas.map((schema) => {
          schema.position.x += position.x;
          schema.position.y += position.y;
          return schema;
        });

        if (designer.current) {
          const template: Template = getBlankTemplate();
          const newSchemas: Schema[][] = new Array(3).fill([]).map(() => []);

          newSchemas[pageCursor] = newWidgetSchemas;
          template.schemas = newSchemas;
          template.editWidgetInfo!.padding = padding;
          template.editWidgetInfo!.pageCursor = pageCursor;
          template.basePdf = basePdf;

          designer.current.updateTemplate(template);
        }
      }, 0);
    }
  };

  const OnChangeActionRadio = (event: React.ChangeEvent<HTMLInputElement>) => {
    const action = event.target.value;

    if (action === 'new') {
      setSelectedWidgetId('');
      setWidgetName('');

      if (designer.current) {
        const template: Template = getBlankTemplate();
        designer.current.updateTemplate(template);
      }
    }

    setSelectedWidgetId('');
    setAction(action);
  };


  const onChangeBasePDF = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target && e.target.files) {
      readFile(e.target.files[0], "dataURL").then(async (basePdf) => {
        if (designer.current) {
          widgetEditInfoRef.current.basePdf = basePdf as string;
          designer.current.updateTemplate(
            Object.assign(cloneDeep(designer.current.getTemplate()), {
              basePdf,
            })
          );
        }
      });
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
  }, [onChangeTemplate])

  useEffect(() => {
    if (designer.current) {
      designer.current.onChangePageCursor(onChangePageCursor);
    }
  }, [onChangePageCursor])

  useEffect(() => {
    if (designer.current) {
      designer.current.onChangePageSizes(onChangePageSizes);
    }
  }, [onChangePageSizes])

  useEffect(() => {
    if (designer.current) {
      const template = designer.current.getTemplate();
      const templateEditWidgetInfo = template.editWidgetInfo as EditWidgetInfo;
      const { position, width, height, pageCursor } = widgetEditInfoRef.current;
      const schemas = template.schemas[pageCursor];

      if (isEditWidgetMode) {
        if (schemas.length) {
          // Update the position of each schema based on editWidgetRec.position.
          widgetEditInfoRef.current.schemas = cloneDeep(schemas).map((schema) => {
            schema.position = {
              x: schema.position.x - position.x,
              y: schema.position.y - position.y,
            };
            return schema;
          });          
        }

        // if schemas is empty array, add an default rectangle to the schemas array.
        template.schemas[pageCursor] = [{
          name: 'editWidgetRec',
          type: 'rectangle',
          position,
          width,
          height,
          rotate: 0,
          opacity: 1,
          borderWidth: 1,
          borderColor: '#00BFFF',
          color: '',
          readOnly: true,
          required: false,
          content: '',
        }];

        designer.current.updateTemplate(template);
      } else {
        const editWidgetRec = schemas.find(s => s.name === 'editWidgetRec');

        // caculcate padding
        if (editWidgetRec) {
          const { schemas: editSchemas, pageSizes, pageCursor } = widgetEditInfoRef.current;
          const { width, height, position } = editWidgetRec;
          const pageSize = pageSizes[pageCursor];

          widgetEditInfoRef.current = {
            ...widgetEditInfoRef.current,
            position,
            width,
            height,
          };
          templateEditWidgetInfo.padding = getTemplatePadding(pageSize.width, pageSize.height, width, height, position);
          templateEditWidgetInfo.pageCursor = pageCursor;
          
          // Update the position of each schema based on editWidgetRec.position.
          if (editSchemas.length) {
            editSchemas.map((schema) => {
              schema.position = {
                x: schema.position.x + position.x,
                y: schema.position.y + position.y,
              };
              return schema;
            });
          }
          template.schemas[pageCursor] = editSchemas.length ? editSchemas : [];
          designer.current.updateTemplate(template);
        }
      }
      designer.current.setEditWidgetMode(isEditWidgetMode);  
    }
  }, [isEditWidgetMode])


  const widgetNavItem = {
    label: "Widget List",
    content: (
      <>
        <select
          className="w-full border rounded px-2 py-1"
          style={{ width: '200px' }}
          value={selectedWidgetId || ''}
          onChange={OnChangeWidgetSelect}
        >
          <option value="" disabled>Please select widget...</option>
          {widgets.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <button
          className="px-2 py-1 border rounded hover:bg-gray-100"
          style={{ marginLeft: '10px' }}
          onClick={onResetDefaultWidgets}
        >
          Reset to Defaults
        </button>
      </>
    ),
  };

  const navItems: NavItem[] = [
    {
      label: "Action",
      content: (
        <div style={{ marginTop: '10px' }}>
          <label>
            <input type="radio" id="new" name="action" value="new"
              checked={action === 'new'}
              onChange={OnChangeActionRadio} />
            <span style={{ marginLeft: '5px' }}>New Widget</span>
          </label>

          <label style={{ marginLeft: '10px' }}>
            <input type="radio" id="update" name="action" value="update"
              checked={action === 'update'}
              onChange={OnChangeActionRadio} />
            <span style={{ marginLeft: '5px' }}>Update Widget</span>
          </label>
        </div>
      ),
    },
    {
      label: "",
      content: (
        <>
          <div style={{ display: 'inline-block' }}>
            <div style={{ float: "right", marginBottom: "10px" }}>Id:&nbsp;
              <input type="text" readOnly value={selectedWidgetId} style={{ width: "150px", border: "1px solid black" }} />
            </div>
            <div>Name:&nbsp;
              <input type="text" value={widgetName} style={{ 
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

  const navItems2: NavItem[] = [
    {
      label: "Change BasePDF",
      content: (
        <input
          type="file"
          accept="application/pdf"
          className="w-full text-sm border"
          onChange={onChangeBasePDF}
        />
      ),
    },
    {
      label: "",
      content: (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <input 
            type="checkbox" 
            id="isEditWidgetMode"
            name="isEditWidgetMode" 
            checked={isEditWidgetMode} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => { 
              setIsEditWidgetMode(e.target.checked);
            }}
          />
          <label htmlFor="isEditWidgetMode" style={{ marginLeft: 5 }}>Enter Widget Size and Position Edit Mode</label>
        </div>
      ),
    },
  ];
  

  if (action === 'update') {
    navItems.splice(1, 0, widgetNavItem);
  }

  return (
    <>
      <NavBar items={navItems} />
      <NavBar items={navItems2} />
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
