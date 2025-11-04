import React from 'react';
import ReactDOM from 'react-dom';
import { PreviewProps } from '@pdfme/common';
import { PreviewUI } from './class';
import { DESTROYED_ERR_MSG } from './constants.js';
import Preview, { PreviewHandle } from './components/Preview';
import AppContextProvider from './components/AppContextProvider';

class Viewer extends PreviewUI {
  private viewerRef: React.RefObject<PreviewHandle> = React.createRef();

  constructor(props: PreviewProps) {
    super(props);
    this.viewerRef = React.createRef();
  }

  public setPageCursor(pageCursor: number) {
    if (this.viewerRef.current) {
      this.viewerRef.current.setPageCursor(pageCursor);
    }
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
        <Preview ref={this.viewerRef} template={this.template} size={this.size} inputs={this.inputs} />
      </AppContextProvider>,
      this.domContainer
    );
  }
}

export default Viewer;
