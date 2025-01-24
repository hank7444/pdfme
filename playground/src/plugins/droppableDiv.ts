
 import { PDFRenderProps, Plugin, Schema } from '@pdfme/common';
import { IconNode, Circle, Square } from 'lucide';
import { VariableMapItem } from '../types';

const createSvgStr = (icon: IconNode, attrs?: Record<string, string>): string => {
  const createElementString = (node: IconNode): string => {
    const [tag, attributes, children = []] = node;

    const mergedAttributes = tag === 'svg' ? { ...attributes, ...attrs } : attributes;

    const attrString = Object.entries(mergedAttributes)
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ');

    const childrenString = children
      .map((child) => createElementString(child))
      .join('');

    return `<${tag} ${attrString}>${childrenString}</${tag}>`;
  };

  return createElementString(icon);
};



interface DroppableDivSchema extends Schema {
 
}
 

const PLUGIN_DEFAULT_STYLES = {
  text: {
    backgroundColor: 'pink',
  },
}

 
export const droppableDiv: Plugin<DroppableDivSchema> = {
  // Used in @pdfme/ui, it includes code for rendering schemas into the DOM
  ui: async (arg) => {
    const { schema, value, onChange, rootElement, mode, i18n } = arg;
    const id = schema.id as string;
    const variableMap = schema?.variableMap as VariableMapItem;

    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.boxSizing = 'border-box';
    container.id = id;

    let svgStr = '';
    let defaultBackgroundColor = '';

    if (schema.originalType === 'radioGroup') {
      svgStr = createSvgStr(Circle);
    } else if (schema.originalType === 'checkbox') {
      svgStr = createSvgStr(Square);
    } else if (schema.originalType === 'text') {
      container.style.backgroundColor = PLUGIN_DEFAULT_STYLES.text.backgroundColor;
      defaultBackgroundColor = container.style.backgroundColor;
    }

    if (svgStr) {
      container.innerHTML = svgStr;
      const svgElement = container.childNodes[0];

      if (svgElement instanceof SVGElement) {
        svgElement.setAttribute('width', '100%');
        svgElement.setAttribute('height', '100%');
      }
    }

    rootElement.appendChild(container);

    // If variableMap exists, create a new div to display variableValue
    if (variableMap) {
      const variableValueDiv = document.createElement('div');
      variableValueDiv.style.marginTop = '10px';
      variableValueDiv.style.fontSize = '14px';
      variableValueDiv.style.color = '#333';

      // Assuming variableMap contains a value field you want to display
      const variableValue = variableMap?.value || '';
      variableValueDiv.textContent = `Variable Value: ${variableValue}`;

      // Create a button element
      const button = document.createElement('button');
      button.textContent = 'X';  // You can change the button text
      button.style.width = '20px';
      button.style.height = '20px';
      button.style.background = 'green';
      button.style.marginLeft = '10px';  // Optional: add space between the text and the button
      button.style.cursor = 'pointer';  // Make it look clickable

      // Add button click event listener
      button.addEventListener('click', () => {
        const customEvent = new CustomEvent('variableRemoveEvent', {
          detail: { name: schema.name } 
        });
        window.dispatchEvent(customEvent);
      });

      // Append the button to variableValueDiv
      variableValueDiv.appendChild(button);
      container.appendChild(variableValueDiv);  // Append this div to the container
    }
      
    container.addEventListener('dragover', (event) => {
      event.preventDefault();
      container.style.backgroundColor = 'lightgreen'; 
    });

    container.addEventListener('dragleave', () => {
      container.style.backgroundColor = defaultBackgroundColor; 
    });

    container.addEventListener('drop', (event) => {
      event.preventDefault(); 
      const data = event.dataTransfer;

      if (data) {
        const data = event.dataTransfer.getData('application/json');
        const parsedData = JSON.parse(data);
        const customEvent = new CustomEvent('variableDropEvent', {
          detail: { ...parsedData, name: schema.name }  // 使用 detail 属性传递数据
        });
        window.dispatchEvent(customEvent); 
      }
    });
  },
  pdf: async () => {},
  propPanel: {
    schema: {},
    defaultSchema: {
      name: '',
      type: 'droppableDiv',
      content: '',
      position: { x: 0, y: 0 },
      width: 0,
      height: 0,
    },
  },
};