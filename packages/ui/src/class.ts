import ReactDOM from 'react-dom';
import { DESTROYED_ERR_MSG, DEFAULT_LANG } from './constants.js';
import { debounce, flattenTemplateSchema } from './helper.js';
import {
  cloneDeep,
  Template,
  Size,
  Lang,
  Font,
  Plugins,
  UIProps,
  UIOptions,
  PreviewProps,
  getDefaultFont,
  checkUIProps,
  checkTemplate,
  checkInputs,
  checkUIOptions,
  checkPreviewProps,
  Schema,
} from '@pdfme/common';
import { builtInPlugins } from '@pdfme/schemas';

export abstract class BaseUIClass {
  protected domContainer!: HTMLElement | null;

  protected template!: Template;

  protected size!: Size;

  private lang: Lang = DEFAULT_LANG;

  private font: Font = getDefaultFont();

  private pluginsRegistry: Plugins = builtInPlugins;

  private options: UIOptions = {};

  private readonly setSize = debounce(() => {
    if (!this.domContainer) throw Error(DESTROYED_ERR_MSG);
    this.size = {
      height: this.domContainer.clientHeight || window.innerHeight,
      width: this.domContainer.clientWidth || window.innerWidth,
    };
    this.render();
  }, 100);

  resizeObserver = new ResizeObserver(this.setSize);

  constructor(props: UIProps) {
    checkUIProps(props);

    const { domContainer, template, options = {}, plugins = {} } = props;
    this.domContainer = domContainer as HTMLElement;
    this.template = flattenTemplateSchema(template);
    this.options = options;
    this.size = {
      height: this.domContainer.clientHeight || window.innerHeight,
      width: this.domContainer.clientWidth || window.innerWidth,
    };
    this.resizeObserver.observe(this.domContainer);

    const { lang, font } = options;
    if (lang) {
      this.lang = lang;
    }
    if (font) {
      this.font = font;
    }

    if (Object.values(plugins).length > 0) {
      this.pluginsRegistry = plugins;
    }
  }

  protected getLang() {
    return this.lang;
  }

  protected getFont() {
    return this.font;
  }

  protected getPluginsRegistry() {
    return this.pluginsRegistry;
  }

  public getOptions() {
    return this.options;
  }

  public getTemplate() {
    if (!this.domContainer) throw Error(DESTROYED_ERR_MSG);

    const template = cloneDeep(this.template);
    const schemasAry = template.schemas

    schemasAry.forEach((schemas: Schema[], idx: number) => {

      // Create a hash of child schemas for the widget group.
      const widgetGroupChildsHash = schemas.reduce((accu, schema_: Schema) => {

        const schema = cloneDeep(schema_);

        if (schema.widgetGroupType === 'child') {
          const widgetGroupId = schema.widgetGroupId;
    
          if (!accu[widgetGroupId]) {
            accu[widgetGroupId] = [];
          }

          delete schema.widgetGroupType;
          delete schema.widgetGroupCompId;
          delete schema.widgetGroupId;

          accu[widgetGroupId].push(schema); 
        }
        return accu;
      }, {} as { [key: string]: Schema[] });

      // Map the widgetGroup schemas and add child schemas, while retaining the widgetGroupId.
      const newSchemas = schemas.filter((schema: Schema) => {
        return  schema.type === 'widgetGroup' || !schema.widgetGroupType;
      }).map ((schema_: Schema) => {
        const schema = cloneDeep(schema_);

        if (schema.type === 'widgetGroup') {
          schema.widgetGroupChilds = widgetGroupChildsHash[schema.widgetGroupId] || [];
          delete schema.widgetGroupType;
          delete schema.widgetGroupCompId;
        }
        return schema;
      });
      schemasAry[idx] = newSchemas;
    })

    template.schemas = schemasAry;

    return template;
  }

  public updateTemplate(template: Template) {
    checkTemplate(template);
    if (!this.domContainer) throw Error(DESTROYED_ERR_MSG);
    this.template = flattenTemplateSchema(template);
    this.render();
  }

  public updateOptions(options: UIOptions) {
    checkUIOptions(options);
    const { lang, font } = options || {};

    if (lang) {
      this.lang = lang;
    }
    if (font) {
      this.font = font;
    }
    this.options = Object.assign(this.options, options);
    this.render();
  }

  public destroy() {
    if (!this.domContainer) throw Error(DESTROYED_ERR_MSG);
    ReactDOM.unmountComponentAtNode(this.domContainer);

    this.resizeObserver.unobserve(this.domContainer);
    this.domContainer = null;
  }

  protected abstract render(): void;
}
export abstract class PreviewUI extends BaseUIClass {
  protected inputs!: { [key: string]: string }[];

  constructor(props: PreviewProps) {
    super(props);
    checkPreviewProps(props);
    this.inputs = convertToStingObjectArray(cloneDeep(props.inputs));
  }

  public getInputs() {
    if (!this.domContainer) throw Error(DESTROYED_ERR_MSG);

    return this.inputs;
  }

  public setInputs(inputs: { [key: string]: string }[]) {
    if (!this.domContainer) throw Error(DESTROYED_ERR_MSG);
    checkInputs(inputs);

    this.inputs = convertToStingObjectArray(inputs);
    this.render();
  }

  protected abstract render(): void;
}

type DataItem = {
  [key: string]: string | string[][];
};

type StringifiedDataItem = {
  [key: string]: string;
};

function convertToStingObjectArray(data: DataItem[]): StringifiedDataItem[] {
  return data.map((item) => {
    const stringifiedItem: StringifiedDataItem = {};
    Object.keys(item).forEach((key) => {
      const value = item[key];
      if (Array.isArray(value)) {
        stringifiedItem[key] = JSON.stringify(value);
      } else {
        stringifiedItem[key] = value;
      }
    });
    return stringifiedItem;
  });
}
