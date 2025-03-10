import { useRef, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { cloneDeep, Template, checkTemplate, Lang } from "@pdfme/common";
import { Designer } from "@pdfme/ui";
import { useDebounce } from './hooks';
import { Widget } from './types';
import {
  getFontsData,
  getTemplateById,
  getTemplatePadding,
  getBlankTemplate,
  getPlugins,
  uuid,
  DEFAULT_WIDGET_WIDTH,
  DEFAULT_WIDGET_HEIGHT,
} from "./helper";
import { NavBar, NavItem } from "./NavBar";


function DesignerApp() {
  const [searchParams, setSearchParams] = useSearchParams();
  const designerRef = useRef<HTMLDivElement | null>(null);
  const designer = useRef<Designer | null>(null);

  const [selectedWidgetId, setSelectedWidgetId] = useState<string>('');
  const [widgetWidth, setWidgetWidth] = useState<number>(DEFAULT_WIDGET_WIDTH);
  const [widgetHeight, setWidgetHeight] = useState<number>(DEFAULT_WIDGET_HEIGHT);
  const [widgetName, setWidgetName] = useState<string>('');
  const [widgetNameErr, setWidgetNameErr] = useState<string>('');
  const [isDisabledSaveBtn, setIsDisabledSaveBtn] = useState<boolean>(true);
  const [action, setAction] = useState('new');
  const [widgets, setWidgets] = useState<Widget[]>([]);

  const debouncedWidgetName = useDebounce(widgetName, 300);

  const finalIsDisabledSaveBtn = isDisabledSaveBtn || !widgetName || !!widgetNameErr;

  const buildDesigner = useCallback(async () => {
    if (!designerRef.current) return;
    try {
      let template: Template = getBlankTemplate(widgetWidth, widgetHeight);

      const templateIdFromQuery = searchParams.get("template");
      searchParams.delete("template");
      setSearchParams(searchParams, { replace: true });
      const templateFromLocal = localStorage.getItem("template");

      if (templateIdFromQuery) {
        const templateJson = await getTemplateById(templateIdFromQuery);
        checkTemplate(templateJson);
        template = templateJson;

        if (!templateFromLocal || window.confirm("Would you like to overwrite the locally saved template?")) {
          localStorage.setItem("template", JSON.stringify(templateJson));
        }
      } else if (templateFromLocal) {
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
      });
      setIsDisabledSaveBtn(!template.schemas[0].length);
    } catch {
      localStorage.removeItem("template");
    }


    // init widget dropdown
    try {
      const widgetsFromLocal = localStorage.getItem("widgets");

      if (widgetsFromLocal) {
        const widgets = JSON.parse(widgetsFromLocal);
        setWidgets(widgets);
      }
    } catch {
      localStorage.removeItem("widgets");
    }

  }, []);

  const onResizeWidget = () => {
    if (designer.current) {
      const template: Template = getBlankTemplate(widgetWidth, widgetHeight);
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
      const { widthPadding, heightPadding } = getTemplatePadding(widgetWidth, widgetHeight);
      const schemas = template?.schemas[0].map((schema) => {
        const name = schema.name.indexOf(id) === -1
          ? `${id}_${schema.name}`
          : schema.name; localStorage.setItem("widgets", JSON.stringify(widgets));

        const newSchema = Object.assign(cloneDeep(schema), {
          name,
          position: {
            x: schema.position.x - widthPadding,
            y: schema.position.y - heightPadding,
          },
        });

        return newSchema;
      });

      const widget = {
        id,
        name: widgetName,
        width: widgetWidth,
        height: widgetHeight,
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
        
        // 如果是数组，则遍历数组
        if (Array.isArray(data)) {
          data.forEach((item, index) => {
            htmlContent += `<li><span class="key">[${index}]:</span> ${formatJSONToHTML(item)}</li>`;
          });
        } else {
          // 如果是对象，则遍历对象的键值对
          Object.keys(data).forEach((key) => {
            htmlContent += `<li><span class="key">"${key}":</span> ${formatJSONToHTML(data[key])}</li>`;
          });
        }
        
        htmlContent += "</ul>";
        return htmlContent;
      } else if (typeof data === "string") {
        // 对字符串值加上 .string 样式
        return `<span class="string">"${data}"</span>`;
      } else if (typeof data === "number") {
        // 对数字值加上 .number 样式
        return `<span class="number">${data}</span>`;
      } else if (typeof data === "boolean") {
        // 对布尔值加上 .boolean 样式
        return `<span class="boolean">${data}</span>`;
      } else {
        return `<span class="null">null</span>`; // 对 null 值加上 .null 样式
      }
    };

    try {

      const newTab = window.open("", "_blank");
      if (newTab) {
        // 等待新标签页加载完成后传递数据
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
        
        // 读取 localStorage 数据并格式化为 JSON
        const storedData = localStorage.getItem("widgets");
        const parsedData = storedData ? JSON.parse(storedData) : null;
    
        // 将格式化后的 JSON 数据显示在新标签页
        if (parsedData) {
          newTab.document.write("<pre>" + formatJSONToHTML(parsedData) + "</pre>");
        } else {
          newTab.document.write("<p>No data found in localStorage.</p>");
        }
    
        // 关闭 HTML 标签
        newTab.document.write("</body></html>");
        newTab.document.close();  // 完成写入并关闭文档流
      } else {
        console.error("Failed to open new tab.");
      }
    } catch {
      //
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
    const { widthPadding, heightPadding } = getTemplatePadding(widgetWidth, widgetHeight);
    const hasAnySchemas = !!template?.schemas[0].length
    const hasAnyOutOfBoundsSchemas = template?.schemas[0].some((schema) => {
      const layoutRect = {
        x: widthPadding,
        y: heightPadding,
        width: widgetWidth,
        height: widgetHeight,
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
  }, [widgetWidth, widgetHeight]);

  const handleWidgetSelectOnChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const id = event.target.value;
    const selectedWidget = cloneDeep(widgets.find(widget => widget.id === id));

    if (selectedWidget) {
      const { width, height, name, schemas } = selectedWidget;
      const { widthPadding, heightPadding } = getTemplatePadding(width, height);

      setSelectedWidgetId(id);
      setWidgetName(name);
      setWidgetWidth(width);
      setWidgetHeight(height);

      // Delay calling updateTemplate() to ensure that the width and height states have been updated already."
      setTimeout(() => {
        const newSchemas = schemas.map((schema) => {
          schema.position.x += widthPadding;
          schema.position.y += heightPadding;
          return schema;
        });

        if (designer.current) {
          const template: Template = getBlankTemplate(width, height);
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
      setWidgetWidth(DEFAULT_WIDGET_WIDTH);
      setWidgetHeight(DEFAULT_WIDGET_HEIGHT);

      if (designer.current) {
        const template: Template = getBlankTemplate(DEFAULT_WIDGET_WIDTH, DEFAULT_WIDGET_HEIGHT);
        designer.current.updateTemplate(template);
      }
    }

    setSelectedWidgetId('');
    setAction(action);
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
    if (widgets.some((widget) => widget.name.toUpperCase() === widgetName.toUpperCase())) {
      setWidgetNameErr('Duplicate widget name detected!');
    } else {
      setWidgetNameErr('');
    }
  }, [debouncedWidgetName])

  const widgetNavItem = {
    label: "Widget List",
    content: (
      <select
        className="w-full border rounded px-2 py-1"
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
    ),
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 检查是否按下的是 Enter 键
    if (e.key === 'Enter') {
      // 检查当前聚焦的元素是否是 height 输入框
      if (document.activeElement === e.target) {
        onResizeWidget();
      }
    }
  };

  const navItems: NavItem[] = [
    {
      label: "Action",
      content: (
        <>
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
        </>
      ),
    },
    {
      label: "Widget Size",
      content: (
        <>
          <span style={{ marginRight: "10px" }}>Width:&nbsp;
            <input type="text" min={20} max={210} value={widgetWidth || ''} style={{ width: "80px", border: "1px solid black", padding: "0 3px" }}
              onFocus={(e: React.FocusEvent<HTMLInputElement>) => { e.target.select(); }}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setWidgetWidth(+e.target.value); }}
              onKeyUp={handleKeyDown}
            />
          </span>
          <span>Height:&nbsp;
            <input type="text" min={20} max={297} value={widgetHeight || ''} style={{ width: "80px", border: "1px solid black", padding: "0 3px" }}
              onFocus={(e: React.FocusEvent<HTMLInputElement>) => { e.target.select(); }}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setWidgetHeight(+e.target.value); }}
              onKeyUp={handleKeyDown}
            />
          </span>
          <button
            className="px-2 py-1 border rounded hover:bg-gray-100"
            style={{ marginLeft: '10px' }}
            onClick={onResizeWidget}
          >
            Resize Widget
          </button>
        </>
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
              {!!widgetNameErr && <span style={{ position: 'absolute', marginLeft: '10px', color: 'red' }}>{widgetNameErr}</span>}
            </div>
          </div>
        </>
      ),
    },
  ];

  if (action === 'update') {
    navItems.splice(1, 0, widgetNavItem);
  }

  return (
    <>
      <NavBar items={navItems} />
      <div ref={designerRef} className="flex-1 w-full" />

      <div style={{
        position: 'absolute',
        right: '30px',
        top: '60px',
        fontSize: '14px',
      }}>
        <button
          className="px-2 py-1 border rounded hover:bg-gray-100"
          style={{
            backgroundColor: finalIsDisabledSaveBtn ? 'grey' : 'inherit',
            color: finalIsDisabledSaveBtn ? 'lightgrey' : 'inherit',
            cursor: finalIsDisabledSaveBtn ? 'not-allowed' : 'pointer',
          }}
          disabled={finalIsDisabledSaveBtn}
          onClick={() => onSaveWidget()}
        >
          Save Widget
        </button>
        <button
          style={{ marginLeft: '10px' }}
          className="px-2 py-1 border rounded hover:bg-gray-100"
          onClick={() => onViewWidgetData()}
        >
          View Widget Data
        </button>
      </div>
    </>
  );
}

export default DesignerApp;
