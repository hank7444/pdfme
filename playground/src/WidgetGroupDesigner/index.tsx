import { useRef, useState, useEffect, useCallback } from "react";
import { cloneDeep, Template, Schema, EditWidgetInfo, Size } from "@pdfme/common";
import { Designer } from "@pdfme/ui";
import {
  getFontsData,
  uuid,
  readFile,
  displayJSONDataFromLocalStorage,
} from "../helper";
import { NavBar, NavItem } from "../NavBar";
import widgetGroup from '../plugins/widgetGroup';

import { WidgetGroup, WidgetEditInfo } from './types';
import {
  getBlankTemplate,
  getDefaultWidgetGroup,
  getDefaultWidgetEditInfo,
  getTemplatePadding,
} from './helper';


function DesignerApp() {
  const designerRef = useRef<HTMLDivElement | null>(null);
  const designer = useRef<Designer | null>(null);
  const widgetEditInfoRef = useRef<WidgetEditInfo>(getDefaultWidgetEditInfo());
  const pageCursorToUpdateRef = useRef<number | null>(null);

  const [widgetName, setWidgetName] = useState<string>('');

  const finalIsDisabledSaveBtn = !widgetName;

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
        plugins: {
          widgetGroup: widgetGroup,
        },
        isEditWidgetGroupMode: true,
        isWidgetDesigner: true,
      });
    } catch {
      //localStorage.removeItem("template");
    }
  }, []);

  const onSaveWidget = () => {

    if (designer.current) {
      const widgetEditInfo = widgetEditInfoRef.current;
      const template: Template = cloneDeep(designer.current.getTemplate());
      let widgetGroups: WidgetGroup[] = [];

      try {
        const widgetGroupsFromLocal = localStorage.getItem("widgetGroups");

        if (widgetGroupsFromLocal) {
          widgetGroups = JSON.parse(widgetGroupsFromLocal);
        }
      } catch (e) {
        // do nothing here
      }

      const { pageCursor, pageSize, basePdf } = widgetEditInfo;
      const schemas = template.schemas[pageCursor];
      const editWidgetRec = schemas.find(s => s.name === 'editWidgetGroup');

      const id: string = uuid();
      const widgetGroup: WidgetGroup = {
        id,
        name: widgetName,
        width: editWidgetRec!.width,
        height: editWidgetRec!.height,
        position: editWidgetRec!.position,
        pageCursor,
        pageSize: pageSize,
        basePdf,
        widgets: [],
      };

      widgetGroups.push(widgetGroup);
  
      localStorage.setItem(
        'widgetGroups',
        JSON.stringify(widgetGroups)
      );
    }
  };

  const onViewWidgetData = () => {
    displayJSONDataFromLocalStorage('widgetGroups');
  };

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
      const currSchemas = cloneDeep(template.schemas);
      const newSchemas: Schema[][] = new Array(pageSizes.length).fill([]).map(() => []);
      const schema = cloneDeep(currSchemas[currentPageCursor]);

      newSchemas[currentPageCursor] = [];
      newSchemas[pageCursor] = schema;

      if (!pageSize) {
        return;
      }

      /* 
        The padding for the page needs to be updated 
        because each page of the same PDF file may have different size.
      */
      const padding = getTemplatePadding(pageSize.width, pageSize.height, width, height, position);
      template.editWidgetInfo!.padding = padding;
      template.editWidgetInfo!.pageCursor = pageCursor;
      template.schemas = newSchemas;
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
      });
    }
    
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


  const onClickChooseFile = () => {
    const pdfFileInput = document.getElementById('pdfFileInput');
    pdfFileInput?.click();
  };

  const onChangeBasePDF = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pdfFileName = document.getElementById('pdfFileName');

    if (e.target && e.target.files) {
      pdfFileName!.textContent = e.target.files[0].name;
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
      designer.current.onChangePageCursor(onChangePageCursor);
    }
  }, [onChangePageCursor]);

  useEffect(() => {
    if (designer.current) {
      designer.current.onChangePageSizes(onChangePageSizes);
    }
  }, [onChangePageSizes]);

  useEffect(() => {
    if (designer.current) {
      const template = designer.current.getTemplate();
      //const templateEditWidgetInfo = template.editWidgetInfo as EditWidgetInfo;
      const { position, width, height, pageCursor } = widgetEditInfoRef.current;
      const schemas = template.schemas[pageCursor];

     
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
        ...getDefaultWidgetGroup(),
        position,
        width,
        height,
      }];

      designer.current.updateTemplate(template);
  

    }
  }, []);

  const navItems: NavItem[] = [
    {
      label: "",
      content: (
        <>
          <div style={{ display: 'inline-block' }}>
            <div style={{ float: "right", marginBottom: "10px" }}>Id:&nbsp;
              <input type="text" readOnly value={""} style={{ 
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
    {
      label: "Change BasePDF",
      content: (
        <>
          <input
            id="pdfFileInput"
            type="file"
            accept="application/pdf"
            className="w-full text-sm border"
            style={{ display: 'none' }}
            onChange={onChangeBasePDF}
          />
          <button
            id="fileSelectButton"
            className="px-2 py-1 border rounded hover:bg-gray-100 active:bg-sky-700"
            onClick={onClickChooseFile}
          >
            Choose File
          </button>
          <span id="pdfFileName" style={{ marginLeft: 5 }}></span>
        </>
      ),
    },
  ];

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
          type="button"
          className="px-2 py-1 border rounded hover:bg-gray-100 active:bg-sky-700 disabled:bg-gray-500"
          disabled={finalIsDisabledSaveBtn}
          onClick={() => onSaveWidget()}
        >
          Save Widget Group
        </button>
        <button
          type="button"
          style={{ marginLeft: '10px' }}
          className="px-2 py-1 border rounded hover:bg-gray-100 active:bg-sky-700"
          onClick={() => onViewWidgetData()}
        >
          View Widget Group Data
        </button>
      </div>
    </>
  );
}

export default DesignerApp;
