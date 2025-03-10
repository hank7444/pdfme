import { Template } from '@pdfme/common';
import { DEFAULT_TEMPLATE_WIDTH, DEFAULT_TEMPLATE_HEIGHT } from '../helper';
import { Rect, Position } from './types';

export const DEFAULT_WIDGET_EDIT_REC_SIZE = {
  width: 100,
  height: 60,
};

export const DEFAULT_PADDING = [
  0, 
  DEFAULT_TEMPLATE_WIDTH - DEFAULT_WIDGET_EDIT_REC_SIZE.width, 
  DEFAULT_TEMPLATE_HEIGHT - DEFAULT_WIDGET_EDIT_REC_SIZE.height, 
  0,
];

export const getDefaultWidgetGroup = () => {
  return {
    name: 'widgetGroup',
    type: 'widgetGroup',
    position: { x: 0, y: 0 },
    ...DEFAULT_WIDGET_EDIT_REC_SIZE,
  };
};

export const getDefaultWidgetEditInfo = () => {
  return {
    schemas: [],
    position: { x: 0, y: 0 },
    ...DEFAULT_WIDGET_EDIT_REC_SIZE,
    pageCursor: 0,
    pageSizes: [{ width: DEFAULT_TEMPLATE_WIDTH, height: DEFAULT_TEMPLATE_HEIGHT }],
    pageSize: { width: DEFAULT_TEMPLATE_WIDTH, height: DEFAULT_TEMPLATE_HEIGHT },
    basePdf: '',
  };
};

export const getBlankTemplate = () => {
  return ({
    schemas: [{}],
    basePdf: {
      width: DEFAULT_TEMPLATE_WIDTH,
      height: DEFAULT_TEMPLATE_HEIGHT,
      padding: [0, 0, 0, 0],
    },
    editWidgetInfo: {
      width: 100,
      height: 60,
      padding: [...DEFAULT_PADDING],
      pageCursor: 0,
    },
  } as Template);
};

export const getTemplatePadding = (
  templateWidth: number | undefined = DEFAULT_TEMPLATE_WIDTH, 
  templateHeight: number | undefined = DEFAULT_TEMPLATE_HEIGHT,
  width: number, 
  height: number, 
  position: Position
): [number, number, number, number] => {
  const top = position.y;
  const right = templateWidth - position.x - width;
  const bottom = templateHeight - position.y - height;
  const left = position.x;

  return [top, right, bottom, left];
};

export const isRectangleBOutOfBounds = (rectA: Rect, rectB: Rect): boolean => {
  const { position: { x: xA, y: yA }, width: widthA, height: heightA } = rectA;
  const { position: { x: xB, y: yB }, width: widthB, height: heightB } = rectB;

  const rightA = xA + widthA;
  const bottomA = yA + heightA;
  const rightB = xB + widthB;
  const bottomB = yB + heightB;

  return xB < xA || rightB > rightA || yB < yA || bottomB > bottomA;
};