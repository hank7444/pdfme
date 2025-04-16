import React from 'react';
import ReactDOM from 'react-dom';
import {
  cloneDeep,
  Template,
  DesignerProps,
  checkDesignerProps,
  checkTemplate,
  PDFME_VERSION,
  Size,
} from '@pdfme/common';
import { BaseUIClass } from './class';
import { DESTROYED_ERR_MSG } from './constants.js';
import DesignerComponent, { TemplateEditorHandle } from './components/Designer/index';
import AppContextProvider from './components/AppContextProvider';

class Designer extends BaseUIClass {
  private onSaveTemplateCallback?: (template: Template) => void;
  private onChangeTemplateCallback?: (template: Template) => void;
  private onChangePageCursorCallback?: (pageCursor: number) => void;
  private onPageSizesChangeCallback?: (pageSizes: Size[]) => void;
  private pageCursor: number = 0;
  private isEditWidgetGroupMode: boolean = false;
  private isWidgetDesigner: boolean = false;
  private designerRef: React.RefObject<TemplateEditorHandle> = React.createRef();

  constructor(props: DesignerProps) {
    super(props);
    checkDesignerProps(props);

    this.isEditWidgetGroupMode = props.isEditWidgetGroupMode || false;
    this.isWidgetDesigner = props.isWidgetDesigner || false;
    this.designerRef = React.createRef();
  }

  public saveTemplate() {
    if (!this.domContainer) throw Error(DESTROYED_ERR_MSG);
    if (this.onSaveTemplateCallback) {
      this.onSaveTemplateCallback(this.template);
    }
  }

  public updateTemplate(template: Template) {
    super.updateTemplate(template)

    if (this.onChangeTemplateCallback) {
      this.onChangeTemplateCallback(template);
    }
  }

  public onSaveTemplate(cb: (template: Template) => void) {
    this.onSaveTemplateCallback = cb;
  }

  public onChangeTemplate(cb: (template: Template) => void) {
    this.onChangeTemplateCallback = cb;
  }

  public onChangePageCursor(cb: (pageCursor: number) => void) {
    this.onChangePageCursorCallback = cb;
  }

  public onChangePageSizes(cb: (pageSizes: Size[]) => void) {
    this.onPageSizesChangeCallback = cb;
  }
  
  public getPageCursor() {
    return this.pageCursor
  }

  public setPageCursor(pageCursor: number) {
    if (this.designerRef.current) {
      this.designerRef.current.setPageCursor(pageCursor);
    }
  }

  public setIsEditWidgetGroupMode(isEditWidgetGroupMode: boolean) {
    this.isEditWidgetGroupMode = isEditWidgetGroupMode;
    this.render();
  }

  protected render() {
    if (!this.domContainer) throw Error(DESTROYED_ERR_MSG);
    ReactDOM.render(
      <AppContextProvider
        lang={this.getLang()}
        font={this.getFont()}
        plugins={this.getPluginsRegistry()}
        options={this.getOptions()}
      >
        <DesignerComponent
          ref={this.designerRef}
          template={this.template}
          onSaveTemplate={(template) => {
            this.template = template;
            this.template.pdfmeVersion = PDFME_VERSION;
            if (this.onSaveTemplateCallback) {
              this.onSaveTemplateCallback(template);
            }
          }}
          onChangeTemplate={(template) => {
            this.template = template;
            this.template.pdfmeVersion = PDFME_VERSION;
            if (this.onChangeTemplateCallback) {
              this.onChangeTemplateCallback(template);
            }
          }}
          onPageCursorChange={(newPageCursor: number) => {
            if (this.onChangePageCursorCallback) {
              this.onChangePageCursorCallback(newPageCursor);
            }

            this.pageCursor = newPageCursor
          }}
          onPageSizesChange={(pageSizes: Size[]) => { 
            if (this.onPageSizesChangeCallback) {
              this.onPageSizesChangeCallback(pageSizes);
            }
          }}
          size={this.size}
          isEditWidgetGroupMode={this.isEditWidgetGroupMode}
          isWidgetDesigner={this.isWidgetDesigner}
        />
      </AppContextProvider>,
      this.domContainer
    );
  }
}

export default Designer;
