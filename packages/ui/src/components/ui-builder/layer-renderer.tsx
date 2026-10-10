import { DevProfiler } from "@pedia/ui/components/ui-builder/internal/components/dev-profiler";
import type { EditorConfig } from "@pedia/ui/components/ui-builder/internal/utils/render-utils";
import { RenderLayer } from "@pedia/ui/components/ui-builder/internal/utils/render-utils";
import type {
  ComponentLayer,
  ComponentRegistry,
  FunctionRegistry,
  PropValue,
  Variable,
} from "@pedia/ui/components/ui-builder/types";
import React from "react";

interface LayerRendererProps<
  TRegistry extends ComponentRegistry = ComponentRegistry,
> {
  className?: string;
  page: ComponentLayer;
  editorConfig?: EditorConfig;
  componentRegistry: TRegistry;
  /** Optional variable definitions */
  variables?: Variable[];
  /** Optional variable values to override defaults */
  variableValues?: Record<string, PropValue>;
  /** Optional function registry for resolving function-type variables */
  functionRegistry?: FunctionRegistry;
}

const LayerRenderer = React.memo<LayerRendererProps>(
  ({
    className,
    page,
    editorConfig,
    componentRegistry,
    variables,
    variableValues,
    functionRegistry,
  }) => {
    return (
      <DevProfiler id="LayerRenderer" threshold={30}>
        <div className={className}>
          <RenderLayer
            componentRegistry={componentRegistry}
            editorConfig={editorConfig}
            functionRegistry={functionRegistry}
            layer={page}
            variables={variables}
            variableValues={variableValues}
          />
        </div>
      </DevProfiler>
    );
  }
) as <TRegistry extends ComponentRegistry = ComponentRegistry>(
  props: LayerRendererProps<TRegistry>
) => React.JSX.Element;

export default LayerRenderer;
