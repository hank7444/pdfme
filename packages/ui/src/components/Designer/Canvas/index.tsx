import React, {
  Ref,
  useMemo,
  useContext,
  MutableRefObject,
  useRef,
  useState,
  useEffect,
  forwardRef,
  useCallback,
} from 'react';
import { theme, Button } from 'antd';
import { OnDrag, OnResize, OnClick, onClickGroup, OnRotate } from 'react-moveable';
import { ZOOM, SchemaForUI, Size, ChangeSchemas, BasePdf, isBlankPdf, EditWidgetInfo, replacePlaceholders } from '@pdfme/common';
import { PluginsRegistry } from '../../../contexts';
import { X } from 'lucide-react';
import { RULER_HEIGHT, RIGHT_SIDEBAR_WIDTH } from '../../../constants';
import { usePrevious } from '../../../hooks';
import { uuid, round, flatten, getWidgetGroupHTMLElemType } from '../../../helper';
import Paper from '../../Paper';
import Renderer from '../../Renderer';
import Selecto from './Selecto';
import Moveable from './Moveable';
import Guides from './Guides';
import Mask from './Mask';
import Padding from './Padding';
import StaticSchema from '../../StaticSchema';


const mm2px = (mm: number) => mm * 3.7795275591;


const DELETE_BTN_ID = uuid();
const fmt4Num = (prop: string) => Number(prop.replace('px', ''));
const fmt = (prop: string) => round(fmt4Num(prop) / ZOOM, 2);
const isTopLeftResize = (d: string) => d === '-1,-1' || d === '-1,0' || d === '0,-1';
const normalizeRotate = (angle: number) => ((angle % 360) + 360) % 360;

const DeleteButton = ({ activeElements: aes }: { activeElements: HTMLElement[] }) => {
  const { token } = theme.useToken();

  const size = 26;
  const top = Math.min(...aes.map(({ style }) => fmt4Num(style.top)));
  const left = Math.max(...aes.map(({ style }) => fmt4Num(style.left) + fmt4Num(style.width))) + 10;

  return (
    <Button
      id={DELETE_BTN_ID}
      style={{
        position: 'absolute',
        zIndex: 1,
        top,
        left,
        width: size,
        height: size,
        padding: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: token.borderRadius,
        color: token.colorWhite,
        background: token.colorPrimary,
      }}
    >
      <X style={{ pointerEvents: 'none' }} />
    </Button>
  );
};

interface GuidesInterface {
  getGuides(): number[];
  scroll(pos: number): void;
  scrollGuides(pos: number): void;
  loadGuides(guides: number[]): void;
  resize(): void;
}

interface Props {
  basePdf: BasePdf;
  editWidgetInfo?: EditWidgetInfo; 
  height: number;
  hoveringSchemaId: string | null;
  onChangeHoveringSchemaId: (id: string | null) => void;
  pageCursor: number;
  schemasList: SchemaForUI[][];
  scale: number;
  backgrounds: string[];
  pageSizes: Size[];
  size: Size;
  activeElements: HTMLElement[];
  onEdit: (targets: HTMLElement[]) => void;
  changeSchemas: ChangeSchemas;
  removeSchemas: (ids: string[]) => void;
  paperRefs: MutableRefObject<HTMLDivElement[]>;
  selectoRef: MutableRefObject<Selecto>;
  sidebarOpen: boolean;
  isEditWidgetMode: boolean;
  isWidgetDesigner: boolean;
}

const Canvas = (props: Props, ref: Ref<HTMLDivElement>) => {
  const {
    basePdf,
    editWidgetInfo,
    pageCursor,
    scale,
    backgrounds,
    pageSizes,
    size,
    activeElements,
    schemasList,
    hoveringSchemaId,
    onEdit,
    changeSchemas,
    removeSchemas,
    onChangeHoveringSchemaId,
    paperRefs,
    selectoRef,
    sidebarOpen,
    isEditWidgetMode,
    isWidgetDesigner,
  } = props;
  const { token } = theme.useToken();
  const pluginsRegistry = useContext(PluginsRegistry);
  const verticalGuides = useRef<GuidesInterface[]>([]);
  const horizontalGuides = useRef<GuidesInterface[]>([]);
  const moveable = useRef<any>(null);

  const [isPressShiftKey, setIsPressShiftKey] = useState(false);
  const [editing, setEditing] = useState(false);

  const prevSchemas = usePrevious(schemasList[pageCursor]);


  const onKeydown = (e: KeyboardEvent) => {
    if (e.shiftKey) setIsPressShiftKey(true);
  };
  const onKeyup = (e: KeyboardEvent) => {
    if (e.key === 'Shift' || !e.shiftKey) setIsPressShiftKey(false);
    if (e.key === 'Escape' || e.key === 'Esc') setEditing(false);
  };

  const initEvents = useCallback(() => {
    window.addEventListener('keydown', onKeydown);
    window.addEventListener('keyup', onKeyup);
  }, []);

  const destroyEvents = useCallback(() => {
    window.removeEventListener('keydown', onKeydown);
    window.removeEventListener('keyup', onKeyup);
  }, []);

  useEffect(() => {
    initEvents();

    return destroyEvents;
  }, [initEvents, destroyEvents]);

  useEffect(() => {
    moveable.current?.updateRect();
    if (!prevSchemas) {
      return;
    }

    const prevSchemaKeys = JSON.stringify(prevSchemas[pageCursor] || {});
    const schemaKeys = JSON.stringify(schemasList[pageCursor] || {});

    if (prevSchemaKeys === schemaKeys) {
      moveable.current?.updateRect();
    }
  }, [pageCursor, schemasList, prevSchemas]);

  const onDrag = ({ target, top, left, ...restProps }: OnDrag) => {
    const { width: _width, height: _height } = target.style;
    const targetWidth = fmt(_width);
    const targetHeight = fmt(_height);
    const actualTop = top / ZOOM;
    const actualLeft = left / ZOOM;
    const { width: pageWidth, height: pageHeight } = pageSizes[pageCursor];
    let topPadding = 0;
    let rightPadding = 0;
    let bottomPadding = 0;
    let leftPadding = 0;
    let padding;

    if (isWidgetDesigner) {
      padding = isEditWidgetMode ? [0, 0, 0, 0] : editWidgetInfo.padding;
    } else if (isBlankPdf(basePdf)) {
      padding = basePdf.padding;
    }

    const [t, r, b, l] = padding || [0, 0, 0, 0];

    topPadding = t * ZOOM;
    rightPadding = r;
    bottomPadding = b;
    leftPadding = l * ZOOM;

    if (actualTop + targetHeight > pageHeight - bottomPadding) {
      target.style.top = `${(pageHeight - targetHeight - bottomPadding) * ZOOM}px`;
    } else {
      target.style.top = `${top < topPadding ? topPadding : top}px`;
    }
  
    if (actualLeft + targetWidth > pageWidth - rightPadding) {
      target.style.left = `${(pageWidth - targetWidth - rightPadding) * ZOOM}px`;
    } else {
      target.style.left = `${left < leftPadding ? leftPadding : left}px`;
    }
  };

  const onDragEnd = ({ target }: { target: HTMLElement | SVGElement }) => {
    const { top, left } = target.style;

    changeSchemas([
      { key: 'position.y', value: fmt(top), schemaId: target.id },
      { key: 'position.x', value: fmt(left), schemaId: target.id },
    ]);
  };

  const onDragEnds = ({ targets }: { targets: (HTMLElement | SVGElement)[] }) => {
    const widgetParantsPos = targets.reduce((accu, target) => {
      const { style: { top, left } } = target;
      const { widgetGroupId, widgetGroupType } = getWidgetGroupHTMLElemType(target)

      if (widgetGroupType === 'parent' && !accu[widgetGroupId]) {
        accu[widgetGroupId] = {
          top: fmt4Num(top),
          left: fmt4Num(left),
        };
      }
      return accu;
    }, {} as { [key: string]: { top: number, left: number } });

    targets.forEach((target) => {
      const { 
        widgetGroupId, 
        widgetGroupType,
        relPositionX,
        relPositionY,
      } = getWidgetGroupHTMLElemType(target);

      // If targets is child comps of a groupWidget, it should keep the relative coordinates with it parant comp
      if (widgetGroupType === 'child' && !!widgetParantsPos[widgetGroupId]) {
        const { top: parantTop, left: parantLeft } = widgetParantsPos[widgetGroupId]; 

        target.style.top = `${parantTop + relPositionY * ZOOM}px`;
        target.style.left = `${parantLeft + relPositionX * ZOOM}px`;
      }
    });
    
    const arg = targets.map(({ style: { top, left }, id }) => [
      { key: 'position.y', value: fmt(top), schemaId: id },
      { key: 'position.x', value: fmt(left), schemaId: id },
    ]);

    changeSchemas(flatten(arg));
  };

  const onRotate = ({ target, rotate }: OnRotate) => {
    target.style.transform = `rotate(${rotate}deg)`;
  };

  const onRotateEnd = ({ target }: { target: HTMLElement | SVGElement }) => {
    const { transform } = target.style;
    const rotate = Number(transform.replace('rotate(', '').replace('deg)', ''));
    const normalizedRotate = normalizeRotate(rotate);
    changeSchemas([{ key: 'rotate', value: normalizedRotate, schemaId: target.id }]);
  };

  const onRotateEnds = ({ targets }: { targets: (HTMLElement | SVGElement)[] }) => {
    const arg = targets.map(({ style: { transform }, id }) => {
      const rotate = Number(transform.replace('rotate(', '').replace('deg)', ''));
      const normalizedRotate = normalizeRotate(rotate);
      return [{ key: 'rotate', value: normalizedRotate, schemaId: id }];
    });
    changeSchemas(flatten(arg));
  };

  const onResizeEnd = ({ target }: { target: HTMLElement | SVGElement }) => {
    const { id, style } = target;
    const { width, height, top, left } = style;
    changeSchemas([
      { key: 'position.x', value: fmt(left), schemaId: id },
      { key: 'position.y', value: fmt(top), schemaId: id },
      { key: 'width', value: fmt(width), schemaId: id },
      { key: 'height', value: fmt(height), schemaId: id },
    ]);

    const targetSchema = schemasList[pageCursor].find((schema) => schema.id === id);

    if (!targetSchema) return;

    targetSchema.position.x = fmt(left);
    targetSchema.position.y = fmt(top);
    targetSchema.width = fmt(width);
    targetSchema.height = fmt(height);
  };

  const onResizeEnds = ({ targets }: { targets: (HTMLElement | SVGElement)[] }) => {
    const arg = targets.map(({ style: { width, height, top, left }, id }) => [
      { key: 'width', value: fmt(width), schemaId: id },
      { key: 'height', value: fmt(height), schemaId: id },
      { key: 'position.y', value: fmt(top), schemaId: id },
      { key: 'position.x', value: fmt(left), schemaId: id },
    ]);
    changeSchemas(flatten(arg));
  };

  const onResize = ({ target, width, height, direction }: OnResize) => {
    if (!target) return;
    let topPadding = 0;
    let rightPadding = 0;
    let bottomPadding = 0;
    let leftPadding = 0;
    let padding;

    if (isWidgetDesigner) {
      padding = isEditWidgetMode ? [0, 0, 0, 0] : editWidgetInfo!.padding;
    } else if (isBlankPdf(basePdf)) {
      padding = basePdf.padding;
    }
    
    const [t, r, b, l] = padding || [0, 0, 0, 0];
    
    topPadding = t * ZOOM;
    rightPadding = mm2px(r);
    bottomPadding = mm2px(b);
    leftPadding = l * ZOOM;

    const pageWidth = mm2px(pageSizes[pageCursor].width);
    const pageHeight = mm2px(pageSizes[pageCursor].height);

    const obj: { top?: string; left?: string; width: string; height: string } = {
      width: `${width}px`,
      height: `${height}px`,
    };

    const s = target.style;
    let newLeft = fmt4Num(s.left) + (fmt4Num(s.width) - width);
    let newTop = fmt4Num(s.top) + (fmt4Num(s.height) - height);
    if (newLeft < leftPadding) {
      newLeft = leftPadding;
    }
    if (newTop < topPadding) {
      newTop = topPadding;
    }
    if (newLeft + width > pageWidth - rightPadding) {
      obj.width = `${pageWidth - rightPadding - newLeft}px`;
    }
    if (newTop + height > pageHeight - bottomPadding) {
      obj.height = `${pageHeight - bottomPadding - newTop}px`;
    }

    const d = direction.toString();
    if (isTopLeftResize(d)) {
      obj.top = `${newTop}px`;
      obj.left = `${newLeft}px`;
    } else if (d === '1,-1') {
      obj.top = `${newTop}px`;
    } else if (d === '-1,1') {
      obj.left = `${newLeft}px`;
    }
    Object.assign(s, obj);
  };

  const getGuideLines = (guides: GuidesInterface[], index: number) =>
    guides[index] && guides[index].getGuides().map((g) => g * ZOOM);

  const onClickMoveable = (e: OnClick) => {
    e.inputEvent.stopPropagation();
    setEditing(true);
  };

  const onGroupClickMoveable = (e: onClickGroup) => {
    /*
    console.log('#### onGroupClickMoveable!!!!', e);
    e.inputEvent.stopPropagation();
    setEditing(true);
    */

    e.inputEvent.stopPropagation();
  };


  const [rotatable, resizable] = useMemo(() => {
    const selectedSchemas = (schemasList[pageCursor] || []).filter((s) =>
      activeElements.map((ae) => ae.id).includes(s.id)
    );
    const schemaTypes = selectedSchemas.map((s) => s.type);
    const uniqueSchemaTypes = [...new Set(schemaTypes)];
    const defaultSchemas = Object.values(pluginsRegistry).map(
      (plugin) => plugin?.propPanel.defaultSchema
    );

    const hasWidgetGroupComp = selectedSchemas.some((schema: SchemaForUI) => {
      return schema.type === 'widgetGroup' || schema.name.includes('widgetGroup_');
    });
    
    const rotatable = uniqueSchemaTypes.every(
      (type) => defaultSchemas.find((ds) => ds.type === type)?.rotate !== undefined
    ) && !hasWidgetGroupComp;

    return [rotatable, !hasWidgetGroupComp];
  }, [activeElements, pageCursor, schemasList, pluginsRegistry]);

  const isSelectedSingleWidgetGroupElem = 
    activeElements.length === 1 && 
    !!activeElements[0].getAttribute('data-widgetgroup-id') &&
    activeElements[0].getAttribute('data-widgetgroup-id') !== activeElements[0].id;

  return (
    <div
      style={{
        position: 'relative',
        overflow: 'auto',
        marginRight: sidebarOpen ? RIGHT_SIDEBAR_WIDTH : 0,
        ...size,
      }}
      ref={ref}
    >
      <Selecto
        selectoRef={selectoRef}
        container={paperRefs.current[pageCursor]}
        continueSelect={isPressShiftKey}
        onDragStart={(e) => {
          const { inputEvent } = e;

          const isMoveableElement = moveable.current?.isMoveableElement(inputEvent.target);
          if ((inputEvent.type === 'touchstart' && e.isTrusted) || isMoveableElement) {
            e.stop();
          }

          if (paperRefs.current[pageCursor] === inputEvent.target) {
            onEdit([]);
          }
          if (inputEvent.target?.id === DELETE_BTN_ID) {
            removeSchemas(activeElements.map((ae) => ae.id));
          }
        }}
        onSelect={({ added, removed, selected, inputEvent, isDragStartEnd }) => {
          const isClick = inputEvent.type === 'mousedown';
          let newActiveElements: HTMLElement[] = isClick ? (selected as HTMLElement[]) : [];

          if (!isClick && added.length > 0) {
            newActiveElements = activeElements.concat(added as HTMLElement[]);
          }
          if (!isClick && removed.length > 0) {
            newActiveElements = activeElements.filter((ae) => !removed.includes(ae));
          }
          
          /* TBD
          if (newActiveElements.length === 1 && getWidgetGroupHTMLElemType(newActiveElements[0]) === 'parent') {
            
            // Get all unique widgetGroup Ids
            const widgetGroupIds: string[] = [
              ...new Set(
                newActiveElements
                  .map(elem => elem.getAttribute('data-widgetgroup-id'))
                  .filter(id => id !== undefined && id !== null)
              )
            ];

            // Get all elements that contain these widgetGroup Ids.
            const widgetGroupElements: HTMLElement[] = selectoRef.current!.getSelectableElements()
              .filter((elem: HTMLElement) => widgetGroupIds.includes(elem.getAttribute('data-widgetgroup-id') || ''));


            newActiveElements = [
              ...new Map([
                ...newActiveElements,
                ...widgetGroupElements
              ].map((item) => [item.id, item]))
              .values()
            ];
          }
          */

          // select all group items
          
          // Get all unique widgetGroup Ids
          const widgetGroupIds: string[] = [
            ...new Set(
              newActiveElements
                .map(elem => getWidgetGroupHTMLElemType(elem).widgetGroupId)
                .filter(id => !!id)
            )
          ];

          if (widgetGroupIds.length) {
            // Get all elements that contain these widgetGroup Ids.
            const widgetGroupElements: HTMLElement[] = 
              selectoRef.current!.getSelectableElements()
                .filter((elem: HTMLElement) => widgetGroupIds.includes(getWidgetGroupHTMLElemType(elem).widgetGroupId) || '');

            /*
              Find the position of the first element in newActiveElements that matches the first widgetGroupId from widgetGroupIds.
              If a match is found, merge the widgetGroupElements into newActiveElements at that position. 
              Ensure no duplicates are included by using a Set to track seen elements, while preserving the original order of newActiveElements.
            */
            const insertIndex = newActiveElements.findIndex((elem) => 
              getWidgetGroupHTMLElemType(elem).widgetGroupId === widgetGroupIds[0]);

            if (insertIndex !== -1) {
              newActiveElements = [
                ...newActiveElements.slice(0, insertIndex + 1),
                ...widgetGroupElements,
                ...newActiveElements.slice(insertIndex + 1),
              ];
            }
            
            /*
              Iterate through newActiveElements and build a new array containing only unique items based on their ID.
              A Set is used to track seen IDs, ensuring duplicates are excluded while preserving the original order.
            */
            const seen = new Set();
            newActiveElements = newActiveElements.filter(item => {
              const id = item.id;
              if (!seen.has(id)) {
                seen.add(id);
                return true; 
              }
              return false; 
            });
          }

          onEdit(newActiveElements);

          if (newActiveElements != activeElements) {
            setEditing(false);
          }
          // For MacOS CMD+SHIFT+3/4 screenshots where the keydown event is never received, check mouse too
          if (!inputEvent.shiftKey) {
            setIsPressShiftKey(false);
          }
        }}
      />
      
      <Paper
        paperRefs={paperRefs}
        scale={scale}
        size={size}
        schemasList={schemasList}
        pageSizes={pageSizes}
        backgrounds={backgrounds}
        hasRulers={true}
        renderPaper={({ index, paperSize }) => (
          <>
            {!isEditWidgetMode && !isSelectedSingleWidgetGroupElem && !editing && activeElements.length > 0 && pageCursor === index && (
              <DeleteButton activeElements={activeElements} />
            )}
            
            {!isEditWidgetMode && 
              <Padding isWidgetDesigner={isWidgetDesigner} basePdf={basePdf} editWidgetInfo={editWidgetInfo} />
            }

            <StaticSchema
              template={{ schemas: schemasList, basePdf }}
              input={Object.fromEntries(
                schemasList.flat().map(({ name, content = '' }) => [name, content])
              )}
              scale={scale}
              totalPages={schemasList.length}
              currentPage={index + 1}
            />
            <Guides
              paperSize={paperSize}
              horizontalRef={(e) => {
                if (e) horizontalGuides.current[index] = e;
              }}
              verticalRef={(e) => {
                if (e) verticalGuides.current[index] = e;
              }}
            />
            {pageCursor !== index ? (
              <Mask
                width={paperSize.width + RULER_HEIGHT}
                height={paperSize.height + RULER_HEIGHT}
              />
            ) : (
              !editing && (
                <Moveable
                  ref={moveable}
                  target={activeElements}
                  bounds={{ left: 0, top: 0, bottom: paperSize.height, right: paperSize.width }}
                  horizontalGuidelines={getGuideLines(horizontalGuides.current, index)}
                  verticalGuidelines={getGuideLines(verticalGuides.current, index)}
                  keepRatio={isPressShiftKey}
                  resizable={resizable}
                  rotatable={rotatable}
                  onDrag={onDrag}
                  onDragEnd={onDragEnd}
                  onDragGroupEnd={onDragEnds}
                  onRotate={onRotate}
                  onRotateEnd={onRotateEnd}
                  onRotateGroupEnd={onRotateEnds}
                  onResize={onResize}
                  onResizeEnd={onResizeEnd}
                  onResizeGroupEnd={onResizeEnds}
                  onClick={onClickMoveable}
                  onClickGroup={onGroupClickMoveable}
                />
              )
            )}
          </>
        )}
        renderSchema={({ schema, index }) => {
          const mode =
            editing && activeElements.map((ae) => ae.id).includes(schema.id)
              ? 'designer'
              : 'viewer'

          const content = schema.content || '';
          let value = content;

          if (mode !== 'designer' && schema.readOnly) {
            const variables = {
              ...schemasList.flat().reduce((acc, currSchema) => {
                acc[currSchema.name] = currSchema.content || '';
                return acc;
              }, {} as Record<string, string>),
              totalPages: schemasList.length,
              currentPage: index + 1,
            };

            value = replacePlaceholders({ content, variables, schemas: schemasList });
          }

          return (
            <Renderer
              key={schema.id}
              schema={schema}
              basePdf={basePdf}
              value={value}
              onChangeHoveringSchemaId={onChangeHoveringSchemaId}
              mode={mode}
              onChange={(arg) => {
                const args = Array.isArray(arg) ? arg : [arg];
                changeSchemas(args.map(({ key, value }) => ({ key, value, schemaId: schema.id })));
              }}
              stopEditing={() => setEditing(false)}
              outline={`1px ${hoveringSchemaId === schema.id ? 'solid' : 'dashed'} ${schema.readOnly && hoveringSchemaId !== schema.id ? 'transparent' : token.colorPrimary
                }`}
              scale={scale}
            />
          )
        }}
      />
    </div>
  );
};
export default forwardRef<HTMLDivElement, Props>(Canvas);
