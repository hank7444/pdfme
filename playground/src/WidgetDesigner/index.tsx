import { useRef, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { cloneDeep, Template, checkTemplate, Lang, Schema } from "@pdfme/common";
import { Designer } from "@pdfme/ui";
import { Widget, BasePdf, WidgetEditInfo } from './types';
import {
  getFontsData,
  getBlankTemplate,
  getPlugins,
  uuid,
  readFile,
  DEFAULT_WIDGET_WIDTH,
  DEFAULT_WIDGET_HEIGHT,
  TEMPLATE_HEIGHT,
} from "../helper";
import { NavBar, NavItem } from "./NavBarForWidgetDesigner";
import { getTemplatePadding } from './helper';
import defaultWidgets from "./defaultWidgets";


function DesignerApp() {
  const designerRef = useRef<HTMLDivElement | null>(null);
  const designer = useRef<Designer | null>(null);
  const widgetEditInfo = useRef<WidgetEditInfo>({
    schemas: [],
    position: { x: 0, y: 0 },
    width: 100,
    height: 60,
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
      let template: Template = getBlankTemplate({ isFullPadding: true });
      const templateFromLocal = localStorage.getItem("template");

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
      });
      setIsDisabledSaveBtn(!template.schemas[0].length);
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

  const onResizeWidget = () => {
    if (designer.current) {
      const template: Template = getBlankTemplate();
      const newTemplate = Object.assign(cloneDeep(designer.current.getTemplate()), {
        basePdf: template.basePdf,
      });
      designer.current.updateTemplate(newTemplate);

      onChangeTemplate(newTemplate);
    }
  };

  const onSaveWidget = () => {

    if (designer.current) {
      const template: Template = cloneDeep(designer.current.getTemplate());
      let widgets: Widget[] = [];

      try {
        const widgetsFromLocal = localStorage.getItem("widgets");

        if (widgetsFromLocal) {
          widgets = JSON.parse(widgetsFromLocal);
          setWidgets(widgets);
        }
      } catch (e) {
        // do nothing here
      }

      const id: string = selectedWidgetId || uuid();
      const paddings = getTemplatePadding(0, 0, { x: 0, y: 0 });
      const schemas = template?.schemas[0].map((schema) => {
        const name = schema.name.indexOf(id) === -1
          ? `${id}_${schema.name}`
          : schema.name; localStorage.setItem("widgets", JSON.stringify(widgets));

        const newSchema = Object.assign(cloneDeep(schema), {
          name,
          position: {
            x: schema.position.x - paddings[0],
            y: schema.position.y - paddings[1],
          },
        });

        return newSchema;
      });

      const widget = {
        id,
        name: widgetName,
        width: 0,
        height: 0,
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

  interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
  }


  const onChangeTemplate = useCallback(async (template?: Template | undefined) => {
    const isRectangleBOutOfBounds = (rectA: Rect, rectB: Rect): boolean => {
      const { x: xA, y: yA, width: widthA, height: heightA } = rectA;
      const { x: xB, y: yB, width: widthB, height: heightB } = rectB;

      const rightA = xA + widthA;
      const bottomA = yA + heightA;
      const rightB = xB + widthB;
      const bottomB = yB + heightB;

      if (xB < xA || rightB > rightA || yB < yA || bottomB > bottomA) {
        return true;
      }
      return false;
    }

    // Check if any schema exceeds the widget boundaries.
    const paddings = getTemplatePadding(0, 0, { x: 0, y: 0 });
    const hasAnySchemas = !!template?.schemas[0].length
    const hasAnyOutOfBoundsSchemas = template?.schemas[0].some((schema) => {
      const layoutRect = {
        x: paddings[0],
        y: paddings[1],
        width: 0,
        height: 0,
      };

      const schemaRect = {
        x: schema.position.x,
        y: schema.position.y,
        width: schema.width,
        height: schema.height,
      };

      return isRectangleBOutOfBounds(layoutRect, schemaRect);
    }) || false;

    const isDisabled = !hasAnySchemas || hasAnyOutOfBoundsSchemas;
    setIsDisabledSaveBtn(isDisabled);
  }, []);

  const handleWidgetSelectOnChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const id = event.target.value;
    const selectedWidget = cloneDeep(widgets.find(widget => widget.id === id));

    if (selectedWidget) {
      const { width, height, name, schemas } = selectedWidget;
      const paddings = getTemplatePadding(width, height, { x: 0, y: 0 });

      setSelectedWidgetId(id);
      setWidgetName(name);

      // Delay calling updateTemplate() to ensure that the width and height states have been updated already."
      setTimeout(() => {
        const newSchemas = schemas.map((schema) => {
          schema.position.x += paddings[0];
          schema.position.y += paddings[1];
          schema.isWidget=true;
          return schema;
        });

        if (designer.current) {
          const template: Template = getBlankTemplate();
          template.schemas = [[...newSchemas]];
          designer.current.updateTemplate(template);
        }
      }, 0);
    }
  };

  const handleActionRadioOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const action = event.target.value;

    if (action === 'new') {
      setSelectedWidgetId('');
      setWidgetName('');
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
      const template = designer.current.getTemplate();
      const basePdf = template.basePdf as BasePdf;
      let schemas = template.schemas[0];

      //const editWidgetRec = schemas.find(s => s.name === 'editWidgetRec');

      if (isEditWidgetMode) {

        
        
        const { schemas: editSchemas, position, width, height } = widgetEditInfo.current;

        
        // backup schemas first
        if (schemas.length) {
          widgetEditInfo.current.schemas = cloneDeep(schemas);
        }

        // if isEditWidgetMode = true, remove padding
        basePdf.padding = [0, 0, 0, 0];

        // if schemas is empty array, add an default rectangle to the schemas array.
        template.schemas[0] = [{
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

        console.log('template: ', template);
          
        designer.current.updateTemplate(template);
      } else {
        const editWidgetRec = schemas.find(s => s.name === 'editWidgetRec');

        
        // caculcate padding
        if (editWidgetRec) {
          const { schemas: editSchemas } = widgetEditInfo.current;
          const { width, height, position } = editWidgetRec;

          widgetEditInfo.current = {
            ...widgetEditInfo.current,
            position,
            width,
            height,
          };

          basePdf.padding = getTemplatePadding(width, height, position);
          template.schemas[0] = editSchemas.length ? editSchemas : [] 
          designer.current.updateTemplate(template);
        }
      }
    
      designer.current.setEditWidgetMode(isEditWidgetMode);  
    }
  }, [isEditWidgetMode])

  useEffect(() => {
    if (designer.current) {
      designer.current.onChangeTemplate(onChangeTemplate);
    }
  }, [onChangeTemplate])

  const widgetNavItem = {
    label: "Widget List",
    content: (
      <>
        <select
          className="w-full border rounded px-2 py-1"
          style={{ width: '200px' }}
          value={selectedWidgetId || ''}
          onChange={handleWidgetSelectOnChange}
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (document.activeElement === e.target) {
        onResizeWidget();
      }
    }
  };

  const navItems: NavItem[] = [
    {
      label: "Action",
      content: (
        <div style={{ marginTop: '10px' }}>
          <label>
            <input type="radio" id="new" name="action" value="new"
              checked={action === 'new'}
              onChange={handleActionRadioOnChange} />
            <span style={{ marginLeft: '5px' }}>New Widget</span>
          </label>

          <label style={{ marginLeft: '10px' }}>
            <input type="radio" id="update" name="action" value="update"
              checked={action === 'update'}
              onChange={handleActionRadioOnChange} />
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
