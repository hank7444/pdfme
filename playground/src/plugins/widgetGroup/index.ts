import { Plugin, Schema } from '@pdfme/common';
import { Square } from 'lucide'

import { createSvgStr } from '../utils';

export interface widgetGroupSchema extends Schema {}

const widgetGroup: Plugin<widgetGroupSchema> = {
  ui: (arg) => {
    const { rootElement } = arg;
    const div = document.createElement('div');
    div.style.width = '100%';
    div.style.height = '100%';
    div.style.boxSizing = 'border-box';
    div.style.borderWidth = '1px';
    div.style.borderStyle = 'solid';
    div.style.borderColor = '#00BFFF';
    div.style.backgroundColor = 'transparent';

    rootElement.appendChild(div);
  },
  pdf: () => { },
  propPanel: {
    schema: () => ({
      editable: { 
        hidden: true,
      },
      required: { 
        hidden: true,
      },
    }),
    defaultSchema: {
      name: '',
      type: 'widgetGroup',
      position: { x: 0, y: 0 },
      width: 62.5,
      height: 37.5,
      editable: undefined,
      rotate: undefined,
      opacity: undefined,
    },
  },
  icon: createSvgStr(Square),
};

export default widgetGroup;