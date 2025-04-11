import { IconNode } from 'lucide';
import { Schema, SchemaForUI } from '@pdfme/common';

export const createSvgStr = (icon: IconNode, attrs?: Record<string, string>): string => {
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

export const uuid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
  const r = (Math.random() * 16) | 0;
  const v = c == 'x' ? r : (r & 0x3) | 0x8;
  return v.toString(16);
});


export const createAddSchema = (defaultSchema: Schema, schemasList: Schema[][]): SchemaForUI => {
  const newSchemaName = (prefix: string) => {
    let index = schemasList.reduce((acc, page) => acc + page.length, 1);
    let newName = prefix + index;
    while (schemasList.some(page => page.find((s) => s.name === newName))) {
      index++;
      newName = prefix + index;
    }
    return newName;
  };

  return {
    id: uuid(),
    ...defaultSchema,
    name: newSchemaName('field'),
  };
};