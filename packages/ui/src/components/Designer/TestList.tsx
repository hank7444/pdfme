import React, { FC, useContext, useState, useEffect } from 'react';
import { theme, Button } from 'antd';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from "@dnd-kit/utilities";



interface DraggableItemProps {
  id: string;
  name: string;
  path: string;
  type: string;
  onMouseDown: () => void
}


export const DraggableItem = ({ id, name, path, type, onMouseDown }: DraggableItemProps) => {

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id,
    data: { name, path, type, itemType: 'listItem' },
  });


  const style = {
    color: 'black',
    backgroundColor: 'pink',
    transform: CSS.Translate.toString(transform)
  };

  return (
    <li ref={setNodeRef} style={style} onMouseDown={onMouseDown} {...attributes} {...listeners}>
      {path}
    </li>
  );
}

const TestList = () => {
  const { token } = theme.useToken();
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const onMouseDown = () => {
    setIsDragging(true)
  }

  return <div
    style={{
      left: 50,
      right: 0,
      position: 'absolute',
      zIndex: 1,
      height: 100,
      width: 200,
      background: token.colorBgLayout,
      textAlign: 'center',
      overflow: isDragging ? 'visible' : 'auto',
    }}
  >
    <ul>
      <DraggableItem id='var-item1' name='item1' path='store.name' type='var' onMouseDown={onMouseDown} />
      <DraggableItem id='var-item2' name='item2' path='store.address' type='var' onMouseDown={onMouseDown} />
      <DraggableItem id='var-item3' name='item3' path='store.zip' type='expression' onMouseDown={onMouseDown} />
    </ul>
  </div>
}

export default TestList