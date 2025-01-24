import { useRef, useState, useEffect, useCallback } from "react";
import { cloneDeep, Template, checkTemplate, getInputFromTemplate } from "@pdfme/common";
import { Form, Viewer } from "@pdfme/ui";

import {
  getFontsData,
  getBlankTemplate,
  handleLoadTemplate,
  generatePDF,
  getPlugins,
  isJsonString,
} from "./helper";
import { NavItem, NavBar } from "./NavBar";
import { VariableMapItem } from './types';


type Mode = "form" | "viewer";

interface DraggableItemProps {
  id: string;
  value: string;
  onMouseDown: () => void
}

const VariableMapDraggableItem = ({ id, value, onMouseDown }: DraggableItemProps) => {
  const style = {
    marginBottom: 10, 
    background: 'red', 
    cursor: 'pointer',
  };

  const handleDragStart = (event: React.DragEvent<HTMLLIElement>) => {
    const dragData = { id, value };
    event.dataTransfer.setData('application/json', JSON.stringify(dragData));
  };

  return (
    <li draggable="true" style={style} onMouseDown={onMouseDown} onDragStart={handleDragStart}>
      {value}
    </li>
  )
}

const VariableMapList = () => {
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const style: React.CSSProperties  = {
    top: 200,
    left: 50,
    right: 0,
    position: 'absolute',
    zIndex: 1,
    height: 100,
    width: 200,
    background: 'pink',
    textAlign: 'center',
    overflow: isDragging ? 'visible' : 'auto',
  }

  const onMouseDown = () => {
    setIsDragging(true)
  }

  return (
    <div style={style}>
      <ul>
        <VariableMapDraggableItem id='Deal_Number_id' value='Deal_Number' onMouseDown={onMouseDown} />
        <VariableMapDraggableItem id='Deal_Date_id' value='Deal_Date' onMouseDown={onMouseDown} />
      </ul>
    </div>
  )
}

const initTemplate = () => {
  let template = getBlankTemplate();
  try {
    const templateString = localStorage.getItem("template");
    if (!templateString) {
      return template;
    }
    const templateJson = JSON.parse(templateString)
    checkTemplate(templateJson);
    template = templateJson as Template;
  } catch {
    localStorage.removeItem("template");
  }
  return template;
};

const template2ViewTemplate = (template: Template, variableMap: VariableMapItem[]): Template => {
  const newTemplate = cloneDeep(template);
      
  newTemplate.schemas = newTemplate.schemas.map((schemaAry) => {
    return schemaAry.map((schema) => {
      schema.originalType = schema.type as string;
      schema.type = 'droppableDiv';

      const variableMapItem = variableMap.find(v => v.name === schema.name);
      schema.variableMap = variableMapItem ?? null;
      return schema;
    });
  });
  return newTemplate;
}

const getVariableMap = (): VariableMapItem[] => {
  let variableMapJson: VariableMapItem[] = [];
  try {
    const variableMapString = localStorage.getItem('variableMap');
    if (!variableMapString) {
      return [];
    }
    variableMapJson = JSON.parse(variableMapString)
  } catch {
    localStorage.removeItem('variableMap');
  }
  return variableMapJson;
}

const extractVariableMap = (template: Template): VariableMapItem[] => {
  const variableMap: VariableMapItem[] = [];

  template.schemas.forEach((schemaAry) => {
    schemaAry.forEach((schema) => {
      if (schema.variableMap) {
        const variableMapItem = schema.variableMap as VariableMapItem;
        variableMap.push(variableMapItem);
      }
    });
  });
  return variableMap;
}




function FormAndViewerApp() {
  const uiRef = useRef<HTMLDivElement | null>(null);
  const ui = useRef<Form | Viewer | null>(null);

  const [template, setTemplate] = useState<Template>(initTemplate());
  const [variableMap, setVariableMap] = useState<VariableMapItem[]>(getVariableMap);
  const [viewTemplate, setViewTemplate] = useState<Template>(template2ViewTemplate(template, variableMap))

  const [mode, setMode] = useState<Mode>(
    (localStorage.getItem("mode") as Mode) ?? "form"
  );

  const buildUi = useCallback((mode: Mode) => {
    //const template = initTemplate();
    //const variableMap = getVariableMap();
    let inputs = getInputFromTemplate(template);
    try {
      const inputsString = localStorage.getItem("inputs");
      if (inputsString) {
        const inputsJson = JSON.parse(inputsString);
        inputs = inputsJson;
      }
    } catch {
      localStorage.removeItem("inputs");
    }

    if (uiRef.current) {
      const isFormMode = false;

      ui.current = new (isFormMode ? Form : Viewer)({
        domContainer: uiRef.current,
        template: viewTemplate,
        inputs,
        options: {
          font: getFontsData(),
          lang: 'ja',
          labels: { 'clear': '消去' },
          theme: {
            token: {
              colorPrimary: '#25c2a0',
            },
          },
        },
        plugins: isFormMode ? getPlugins() : getPlugins(true),
      });
    }
  }, []);

  const onChangeMode = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value as Mode;
    setMode(value);
    localStorage.setItem("mode", value);
    buildUi(value);
  };

  const onSaveVariableMap = () => {
    localStorage.setItem('variableMap', JSON.stringify(variableMap));
    alert("Saved!");
  }

  const onGetVariableMap = () => {
    alert(JSON.stringify(variableMap, null, 2));
    console.log(variableMap);
  };

  const onGetInputs = () => {
    if (ui.current) {
      const inputs = ui.current.getInputs();
      alert(JSON.stringify(inputs, null, 2));
      alert("Dumped as console.log");
      console.log(inputs);
    }
  };

  const onSetInputs = () => {
    if (ui.current) {
      const prompt = window.prompt("Enter Inputs JSONString") || "";
      try {
        const json = isJsonString(prompt) ? JSON.parse(prompt) : [{}];
        ui.current.setInputs(json);
      } catch (e) {
        alert(e);
      }
    }
  };

  const onSaveInputs = () => {
    if (ui.current) {
      const inputs = ui.current.getInputs();
      localStorage.setItem("inputs", JSON.stringify(inputs));
      alert("Saved!");
    }
  };

  const onResetInputs = () => {
    localStorage.removeItem("inputs");
    if (ui.current) {
      const template = initTemplate();
      ui.current.setInputs(getInputFromTemplate(template));
    }
  };


  useEffect(() => {
    const updateTemplateSchema = (action: string, viewTemplate: Template, eventData): void => {
      viewTemplate.schemas = viewTemplate.schemas.map((schemaAry) => {
        return schemaAry.map((schema) => {
          if (schema.name === eventData.name) {
            if (action === 'addVariableMap') {
              schema.variableMap = eventData;
            } else if (action === 'removeVariableMap') {
              delete schema.variableMap;
            }
          }
          return schema;
        })
      });

      const variableMap = extractVariableMap(viewTemplate);
      setViewTemplate(viewTemplate);
      setVariableMap(variableMap);

      if (ui.current) {
        ui.current.updateTemplate(viewTemplate);
      }
    }

    const handleVariableDropEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      const eventData = customEvent.detail;

      updateTemplateSchema('addVariableMap', viewTemplate, eventData);
    };

    const handleVariableRemoveEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      const eventData = customEvent.detail;

      updateTemplateSchema('removeVariableMap', viewTemplate, eventData);
    }

    window.addEventListener('variableDropEvent', handleVariableDropEvent);
    window.addEventListener('variableRemoveEvent', handleVariableRemoveEvent);
    
    return () => {
      window.removeEventListener('variableDropEvent', handleVariableDropEvent);
      window.removeEventListener('variableRemoveEvent', handleVariableRemoveEvent);
    }
  }, [])

  useEffect(() => {
    buildUi(mode);
    return () => {
      if (ui.current) {
        ui.current.destroy();
      }
    };
  }, [mode, uiRef, buildUi]);

  const navItems: NavItem[] = [
    {
      label: "Mode",
      content: (
        <div className="mt-2">
          {/*
          <input
            type="radio"
            id="form"
            value="form"
            checked={mode === "form"}
            onChange={onChangeMode}
          />
          <label htmlFor="form" className="mr-2"> Form </label>
          <input
            type="radio"
            id="viewer"
            value="viewer"
            checked={mode === "viewer"}
            onChange={onChangeMode}
          />
          <label htmlFor="viewer"> Viewer </label>
          */}
          <label htmlFor="viewer"> Viewer </label>
        </div>
      ),
    },
    {
      label: "Load Template",
      content: (
        <input
          type="file"
          accept="application/json"
          onChange={(e) => handleLoadTemplate(e, ui.current)}
          className="w-full text-sm border"
        />
      ),
    },
    {
      label: "",
      content: (
        <button style={{ backgroundColor: 'orange' }} className="px-2 py-1 border" onClick={onSaveVariableMap}>
          Save VariableMap
        </button>
      ),
    },
    {
      label: "",
      content: (
        <button style={{ backgroundColor: 'orange' }} className="px-2 py-1 border" onClick={onGetVariableMap}>
          Get VariableMap
        </button>
      ),
    },
    {
      label: "",
      content: (
        <button className="px-2 py-1 border" onClick={onGetInputs}>
          Get Inputs
        </button>
      ),
    },
    {
      label: "",
      content: (
        <button className="px-2 py-1 border" onClick={onSetInputs}>
          Set Inputs
        </button>
      ),
    },
    {
      label: "",
      content: (
        <button className="px-2 py-1 border" onClick={onSaveInputs}>
          Save Inputs
        </button>
      ),
    },
    {
      label: "",
      content: (
        <button className="px-2 py-1 border" onClick={onResetInputs}>
          Reset Inputs
        </button>
      ),
    },
    {
      label: "",
      content: (
        <button
          className="px-2 py-1 border"
          onClick={() => generatePDF(ui.current)}
        >
          Generate PDF
        </button>
      ),
    },
  ];

  return (
    <>
      <NavBar items={navItems} />
      <VariableMapList />
      <div ref={uiRef} className="flex-1 w-full" />
    </>
  );
}

export default FormAndViewerApp;
