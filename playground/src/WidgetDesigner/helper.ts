import { Template } from '@pdfme/common';
import { TEMPLATE_WIDTH, TEMPLATE_HEIGHT } from '../helper';
import { Rect, Position } from './types';

export const DEFAULT_WIDGET_EDIT_REC_SIZE = {
  width: 100,
  height: 60,
};

export const DEFAULT_PADDING = [
  0, 
  TEMPLATE_WIDTH - DEFAULT_WIDGET_EDIT_REC_SIZE.width, 
  TEMPLATE_HEIGHT - DEFAULT_WIDGET_EDIT_REC_SIZE.height, 
  0,
];

export const getBlankTemplate = () => {
  return ({
    schemas: [{}],
    basePdf: {
      width: TEMPLATE_WIDTH,
      height: TEMPLATE_HEIGHT,
      padding: [0, 0, 0, 0],
    },
    editWidgetInfo: {
      width: 100,
      height: 60,
      padding: DEFAULT_PADDING,
    },
  } as Template);
};

export const getTemplatePadding = (width: number, height: number, position: Position): [number, number, number, number] => {
  const top = position.y;
  const right = TEMPLATE_WIDTH - position.x - width;
  const bottom = TEMPLATE_HEIGHT - position.y - height;
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
}
