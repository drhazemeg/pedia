import * as React from "react";

import { useContainerSize } from "../hooks/use-container-size";

const EMPTY_STYLE: React.CSSProperties = {};

interface MeasuredContainerProps<T extends React.ElementType> {
  as: T;
  name: string;
  children?: React.ReactNode;
}

export function MeasuredContainer<T extends React.ElementType>({
  as: Component,
  name,
  children,
  style = EMPTY_STYLE,
  ...props
}: MeasuredContainerProps<T> & React.ComponentProps<T>) {
  const innerRef = React.useRef<HTMLElement>(null);
  const rect = useContainerSize(innerRef.current);

  const customStyle = {
    [`--${name}-width`]: `${rect.width}px`,
    [`--${name}-height`]: `${rect.height}px`,
  };

  return (
    <Component {...props} ref={innerRef} style={{ ...customStyle, ...style }}>
      {children}
    </Component>
  );
}

MeasuredContainer.displayName = "MeasuredContainer";
