import { Schema } from '@pdfme/common';

export interface Widget {
    id: string;
    name: string;
    width: number;
    height: number;
    schemas: Schema[];
}