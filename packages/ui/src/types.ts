import React from 'react';
import Selecto from 'Selecto';
import type { SchemaForUI, Size, ChangeSchemas, CommitSchemas, RemoveSchemas } from '@pdfme/common';

export type SidebarProps = {
  height: number;
  hoveringSchemaId: string | null;
  onChangeHoveringSchemaId: (id: string | null) => void;
  size: Size;
  pageSize: Size;
  activeElements: HTMLElement[];
  schemas: SchemaForUI[];
  schemasList: SchemaForUI[][];
  onSortEnd: (sortedSchemas: SchemaForUI[]) => void;
  onEdit: (ids: string[]) => void;
  onEditEnd: () => void;
  changeSchemas: ChangeSchemas;
  commitSchemas: CommitSchemas;
  removeSchemas: RemoveSchemas;
  deselectSchema: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (sidebarOpen: boolean) => void;
  onEditFunc: (targets: HTMLElement[]) => void;
  //selecttoRef: React.MutableRefObject<Selecto>;
  [key: string]: any
};
