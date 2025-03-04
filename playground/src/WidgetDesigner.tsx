import { useRef, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { cloneDeep, Template, checkTemplate, Lang } from "@pdfme/common";
import { Designer } from "@pdfme/ui";
import {
  getFontsData,
  getTemplateById,
  getTemplatePadding,
  getBlankTemplate,
  readFile,
  getPlugins,
  handleLoadTemplate,
  generatePDF,
  downloadJsonFile,
  translations,
} from "./helper";
import { NavBar, NavItem } from "./NavBar";

function DesignerApp() {
  const [searchParams, setSearchParams] = useSearchParams();
  const designerRef = useRef<HTMLDivElement | null>(null);
  const designer = useRef<Designer | null>(null);
  const [lang, setLang] = useState<Lang>("en");

  const [widgetWidth, setWidgetWidth] = useState<number>(100);
  const [widgetHeight, setWidgetHeight] = useState<number>(60);
  const [IsDisabledSaveBtn, setIsDisabledSaveBtn] = useState<boolean>(true);

  const [action, setAction] = useState('new');
  const [widgets, setWidgets] = useState<any>([]);
  
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
          lang,
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
      designer.current.onSaveTemplate(onSaveTemplate);
      
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

  const onResizeWidget = () => {

    console.log('***** onresize: widgetWidth: ', widgetWidth);

    if (designer.current) {
      const template: Template = getBlankTemplate(widgetWidth, widgetHeight);
      const newTemplate =  Object.assign(cloneDeep(designer.current.getTemplate()), {
        basePdf: template.basePdf,
      });
      designer.current.updateTemplate(newTemplate);
      
      onChangeTemplate(newTemplate);
    }
  };

  const onDownloadTemplate = () => {
    if (designer.current) {
      downloadJsonFile(designer.current.getTemplate(), "template");
      console.log(designer.current.getTemplate());
    }
  };

  const onSaveTemplate = (template?: Template | undefined) => {

    console.log('save !!!!!')

    /*Y
    if (designer.current) {
      localStorage.setItem(
        "template",
        JSON.stringify(template || designer.current.getTemplate())
      );
      alert("Saved!");
    }
    */
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
          return true;  // 矩形 B 超出矩形 A 的邊界
      }
    
      return false;  // 矩形 B 沒有超出矩形 A 的邊界
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
      }
     
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

  const handleActionRadioOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAction(event.target.value);
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

  const widgetNavItem = {
    label: "Widget List",
    content: (
      <select
        className="w-full border rounded px-2 py-1"
        onChange={(e) => {
          /*
          setLang(e.target.value as Lang);
          designer.current?.updateOptions({ lang: e.target.value as Lang });
          */
        }}
        value={lang}
      >
        {widgets.map((t) => (
          <option key={t.id} value={t.name}>
            {t.name}
          </option>
        ))}
      </select>
    ),
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
          <span style={{ marginRight: "10px"  }}>Width: 
            <input type="number" min={20} max={210} value={widgetWidth} style={{ width: "80px", border: "1px solid black" }} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setWidgetWidth(+e.target.value);}}
            />
          </span>
          <span>Height: 
            <input type="number" min={20} max={297} value={widgetHeight} style={{ width: "80px", border: "1px solid black" }}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setWidgetHeight(+e.target.value);}}
            />
          </span>
          <button
            className="px-2 py-1 border rounded hover:bg-gray-100"
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
        <button
          className="px-2 py-1 border rounded hover:bg-gray-100"
          style={{
            backgroundColor: IsDisabledSaveBtn ? 'grey' : 'inherit',
            color: IsDisabledSaveBtn ? 'lightgrey' : 'inherit',
            cursor: IsDisabledSaveBtn ? 'not-allowed' : 'pointer',
          }}
          disabled={IsDisabledSaveBtn}
          onClick={() => onSaveTemplate()}
        >
          Save Widget
        </button>
      ),
    },
 
    /*
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
      label: "Load Template",
      content: (
        <input
          type="file"
          accept="application/json"
          className="w-full text-sm border"
          onChange={(e) => handleLoadTemplate(e, designer.current)}
        />
      ),
    },
    {
      label: "",
      content: (
        <button
          className="px-2 py-1 border rounded hover:bg-gray-100"
          onClick={onDownloadTemplate}
        >
          DL Template
        </button>
      ),
    },
    {
      label: "",
      content: (
        <button
          className="px-2 py-1 border rounded hover:bg-gray-100"
          onClick={() => onSaveTemplate()}
        >
          Save Local
        </button>
      ),
    },
    {
      label: "",
      content: (
        <button
          className="px-2 py-1 border rounded hover:bg-gray-100"
          onClick={() => {
            localStorage.removeItem("template");
            if (designer.current) {
              designer.current.updateTemplate(getBlankTemplate());
            }
          }}
        >
          Reset
        </button>
      ),
    },
    {
      label: "",
      content: (
        <button
          className="px-2 py-1 border rounded hover:bg-gray-100"
          onClick={() => generatePDF(designer.current)}
        >
          Generate PDF
        </button>
      ),
    },
    */
  ];

  if (action === 'update') {
    navItems.splice(1, 0, widgetNavItem);
  }

  return (
    <>
      <NavBar items={navItems} />
      <div ref={designerRef} className="flex-1 w-full" />
    </>
  );
}

export default DesignerApp;
