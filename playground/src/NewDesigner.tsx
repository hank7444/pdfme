import { useRef, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { cloneDeep, Template, checkTemplate, Lang, SchemaForUI } from "@pdfme/common";
import { Designer } from "@pdfme/ui";
import {
  getFontsData,
  getTemplateById,
  getBlankTemplate,
  readFile,
  getLittlePlugins,
  handleLoadTemplate,
  downloadJsonFile,
  translations,
  displayJSONDataFromLocalStorage,
} from "./helper";
import { NavBar, NavItem } from "./NavBar";
import { WidgetGroupWidgetOptions } from './plugins/widgetGroup2/types';

import { Widget } from './WidgetGroupDesigner/types';
import { uuid, createAddSchema } from './plugins/utils';
import { WidgetGroupSchema } from './plugins/widgetGroup2/types';



interface WidgetGroup {
  id: string;
  name: string;
  width: number;
  height: number;
  widgets: Widget[],
}

interface DraggableItemProps {
  id: string;
  name: string;
}

const DraggableItem = ({ id, name }: DraggableItemProps) => {

  const handleDragStart = (event: React.DragEvent<HTMLLIElement>) => {
    const dragData = { id };
    event.dataTransfer.setData('application/json', JSON.stringify(dragData));
  };

  return (
    <li 
      draggable="true"  
      data-widgetgroup-id={id} 
      className="h-[50px] flex items-center px-3 rounded bg-white hover:bg-gray-200 cursor-pointer"
      onDragStart={handleDragStart}
    >
      {name}
    </li>
  )
}


function DesignerApp() {
  const [searchParams, setSearchParams] = useSearchParams();
  const designerRef = useRef<HTMLDivElement | null>(null);
  const designer = useRef<Designer | null>(null);
  const [lang, setLang] = useState<Lang>("en");

  const widgetGroupsRef = useRef<WidgetGroup[]>([]);
  const [widgetGroups, setWidgetGroups] = useState<WidgetGroup[]>([]);

  useEffect(() => {
    try {
      const widgetGroups = localStorage.getItem("widgetGroups");
      let widgetGroupJSON: WidgetGroup[] = []; 

      if (widgetGroups) {
        widgetGroupJSON = JSON.parse(widgetGroups);
      }
      setWidgetGroups(widgetGroupJSON)
      widgetGroupsRef.current = widgetGroupJSON;
    } catch {
      console.error("An error occurred while process widgetGroup data from the local storage.");
    }

  }, []);

  useEffect(() => {
    let pdfmeCanvasDiv: HTMLDivElement;

    const onDropEvent = (e: DragEvent) => {
      e.preventDefault(); 

      const data = e.dataTransfer;

      console.log('#### e: ', e);

      if (data) {
        const data = e.dataTransfer.getData('application/json');
        const parsedData = JSON.parse(data);
        const widgetGroup = widgetGroupsRef.current.find(wg => wg.id === parsedData.id);

        if (designer.current && widgetGroup) {
          const template = designer.current.getTemplate();
          const pageCursor = designer.current.getPageCursor();
          const newSchema: WidgetGroupSchema = {
            name: '',
            type: 'widgetGroup',
            width: widgetGroup!.width,
            height: widgetGroup!.height,
            position: {
              x: 50 + Math.floor(Math.random() * 11) - 10,
              y: 100 + Math.floor(Math.random() * 11) - 10,
            },
            widgetGroupSchemaId: uuid(),
            widgetGroupId: widgetGroup.id,
            widgetGroupName: widgetGroup.name,
            widgetGroupType: 'parent',
            widgetGroupSection: {
              widgetGroupId: widgetGroup.id,
              widgetId: null,
            },
          };

          const widgetGroupSchema = createAddSchema(newSchema, template.schemas) as WidgetGroupSchema;
          let widgetGroupChildSchemas: SchemaForUI[] = [];

          // generate the schemas of the first widget of the widgetGroup by default
          if (widgetGroup.widgets.length) {
            const widget = widgetGroup.widgets[0];

            widgetGroupSchema.widgetGroupSection!.widgetId = widget.id;
            widgetGroupChildSchemas = widget.schemas.map((widget, idx) => {
              return {
                ...widget,
                name: `${widgetGroupSchema.widgetGroupSchemaId}_${idx}`,
                widgetGroupSchemaId: widgetGroupSchema.widgetGroupSchemaId,
                widgetGroupId: widgetGroup.id,
                widgetId: widget.id,
                widgetGroupType: 'child',
                relPosition: {
                  x: widget.position.x,
                  y: widget.position.y
                },
                position: {
                  x: widget.position.x + widgetGroupSchema.position.x,
                  y: widget.position.y + widgetGroupSchema.position.y,
                },
              };
           });
          }

           template.schemas[pageCursor] = [
            ...template.schemas[pageCursor],
            widgetGroupSchema,
            ...widgetGroupChildSchemas
          ];
          designer.current.updateTemplate(template);
        }
      }
    };

    const hideWidgetGroupButtonsAndSetDropEvents = (): void  => {

      if (!designer.current) {
        setTimeout(() => {
          hideWidgetGroupButtonsAndSetDropEvents();
        }, 200);
        return;
      }

      // Hide the "WidgetGroup Plugin" button from the right-side toolbar in pdfme
      const widgetDivs = document.querySelectorAll('div[title="WidgetGroup"]');
      widgetDivs.forEach(div => {
        const parentButton = div.closest('[role="button"]') as HTMLDivElement;
        
        if (parentButton) {
          parentButton.style.display = 'none';
        }
      });

      // Add a drop event listener to the pdfme canvas
      const selectoElement = document.querySelector('.pdfme-selecto');

      if (selectoElement) {
        const nextDiv = selectoElement.nextElementSibling;

        if (nextDiv && nextDiv.tagName === 'DIV') {
          pdfmeCanvasDiv = nextDiv.firstElementChild as HTMLDivElement;
          pdfmeCanvasDiv.addEventListener('dragover', (e) => {
            e.preventDefault();
          });
          pdfmeCanvasDiv.addEventListener('drop', onDropEvent);
        }
      }
    };

    hideWidgetGroupButtonsAndSetDropEvents();

    return () => {
      if (pdfmeCanvasDiv) {
        pdfmeCanvasDiv.removeEventListener('dragover', (e) => e.preventDefault());
        pdfmeCanvasDiv.removeEventListener('drop', onDropEvent);
      }
    };
  }, [])



  const buildDesigner = useCallback(async () => {
    if (!designerRef.current) return;
    try {
      let template: Template = getBlankTemplate();
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

      // Get widget group data from localStroage
      const widgetGroupsLocal = localStorage.getItem('widgetGroups') || '';
      const widgetGroups = JSON.parse(widgetGroupsLocal);

      const widgetGroupWidgetOptions: WidgetGroupWidgetOptions = widgetGroups.reduce((accu, wg) => {
        if (!wg.id) {
          accu[wg.id] = [];
        }

        accu[wg.id] = wg.widgets.map((widget: Widget) => {
          return {
            label: widget.name,
            value: widget.id,
            schemas: widget.schemas,
          };
        });

        return accu;
      }, {});

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
          data: {
            widgetGroupWidgetOptions,
          },
        },
        plugins: getLittlePlugins(),
      });
      designer.current.onSaveTemplate(onSaveTemplate);

    } catch {
      localStorage.removeItem("template");
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

  const onDownloadTemplate = () => {
    if (designer.current) {
      downloadJsonFile(designer.current.getTemplate(), "template");
      console.log(designer.current.getTemplate());
    }
  };

  const onSaveTemplate = (template?: Template | undefined) => {
    if (designer.current) {
      localStorage.setItem(
        "template",
        JSON.stringify(template || designer.current.getTemplate())
      );
      alert("Saved!");
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

  const navItems: NavItem[] = [
    {
      label: "Lang",
      content: (
        <select
          className="w-full border rounded px-2 py-1"
          onChange={(e) => {
            setLang(e.target.value as Lang);
            designer.current?.updateOptions({ lang: e.target.value as Lang });
          }}
          value={lang}
        >
          {translations.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      ),
    },

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
          onClick={() => {
            displayJSONDataFromLocalStorage('template');
          }}
        >
          View Template Data
        </button>
      ),
    },
    /*
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

  return (
    <div className="h-screen">
      <NavBar items={navItems} />
      <div className="flex w-full h-full ">
        <div className="w-1/5 bg-gray-100 p-4">
          <h2 className="text-lg font-semibold mb-4">Widget Group</h2>
          <ul className="space-y-2">
            {widgetGroups.map((item, index) => (
              <DraggableItem 
                key={`widgetGroup_${index}`}
                id={item.id}
                name={item.name}
              />
            ))}
          </ul>
        </div>

        <div ref={designerRef} className="w-4/5 flex-1 bg-white" />
      </div>
    </div>
  );
}

export default DesignerApp;
