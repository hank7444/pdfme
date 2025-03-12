import { TEMPLATE_WIDTH, TEMPLATE_HEIGHT } from '../helper';

interface Position {
    x: number;
    y: number;
}

export const getTemplatePadding = (width: number, height: number, position: Position): [number, number, number, number] => {

  const top = position.y;
  const right = TEMPLATE_WIDTH - position.x - width;
  const bottom = TEMPLATE_HEIGHT - position.y - height;
  const left = position.x;

  return [top, right, bottom, left];
};