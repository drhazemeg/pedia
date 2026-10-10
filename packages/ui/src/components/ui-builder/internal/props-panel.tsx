import AutoForm from "@pedia/ui/components/auto-form";
import { getBaseType } from "@pedia/ui/components/auto-form/helpers";
import { Button } from "@pedia/ui/components/button";
import type {
  ComponentLayer,
  ComponentRegistry,
} from "@pedia/ui/components/ui-builder/types";
import { useEditorStore } from "@pedia/ui/lib/ui-builder/store/editor-store";
import { generateFieldOverrides } from "@pedia/ui/lib/ui-builder/store/editor-utils";
import { useLayerStore } from "@pedia/ui/lib/ui-builder/store/layer-store";
import { addDefaultValues } from "@pedia/ui/lib/ui-builder/store/schema-utils";
import {
  isVariableReference,
  resolveVariableReferences,
} from "@pedia/ui/lib/ui-builder/utils/variable-resolver";
import React, { useCallback, useMemo } from "react";
import { z } from "zod";

interface PropsPanelProps {
  className?: string;
}

const PropsPanel: React.FC<PropsPanelProps> = React.memo(({ className }) => {
  const selectedLayerId = useLayerStore((state) => state.selectedLayerId);
  const findLayerById = useLayerStore((state) => state.findLayerById);
  const removeLayer = useLayerStore((state) => state.removeLayer);
  const duplicateLayer = useLayerStore((state) => state.duplicateLayer);
  const updateLayer = useLayerStore((state) => state.updateLayer);
  const addComponentLayer = useLayerStore((state) => state.addComponentLayer);
  const componentRegistry = useEditorStore((state) => state.registry);
  const selectedLayer = findLayerById(selectedLayerId);

  const handleAddComponentLayer = useCallback(
    (layerType: string, parentLayerId: string, addPosition?: number) => {
      addComponentLayer(layerType, parentLayerId, addPosition);
    },
    [addComponentLayer]
  );

  const handleDeleteLayer = useCallback(
    (layerId: string) => {
      removeLayer(layerId);
    },
    [removeLayer]
  );

  const handleDuplicateLayer = useCallback(() => {
    if (selectedLayer) {
      duplicateLayer(selectedLayer.id);
    }
  }, [selectedLayer, duplicateLayer]);

  const handleUpdateLayer = useCallback(
    (
      id: string,
      props: Record<string, any>,
      rest?: Partial<Omit<ComponentLayer, "props">>
    ) => {
      updateLayer(id, props, rest);
    },
    [updateLayer]
  );

  //first check if selectedLayer.type is a valid key in componentRegistry
  if (selectedLayer && !componentRegistry[selectedLayer.type]) {
    return null;
  }

  return (
    <div className={className}>
      {selectedLayer && (
        <>
          <Title />
          <h3 className="mb-4 text-base font-medium">
            Type: {selectedLayer.type.replaceAll("_", "")}
          </h3>
        </>
      )}

      {!selectedLayer && (
        <>
          <h2 className="mb-2 text-xl font-semibold">Component Properties</h2>
          <p>No component selected</p>
        </>
      )}
      {selectedLayer && (
        <ComponentPropsAutoForm
          addComponentLayer={handleAddComponentLayer}
          componentRegistry={componentRegistry}
          duplicateLayer={handleDuplicateLayer}
          key={selectedLayer.id}
          removeLayer={handleDeleteLayer}
          selectedLayerId={selectedLayer.id}
          updateLayer={handleUpdateLayer}
        />
      )}
    </div>
  );
});
PropsPanel.displayName = "PropsPanel";
export default PropsPanel;

interface ComponentPropsAutoFormProps {
  selectedLayerId: string;
  componentRegistry: ComponentRegistry;
  removeLayer: (id: string) => void;
  duplicateLayer: (id: string) => void;
  updateLayer: (
    id: string,
    props: Record<string, any>,
    rest?: Partial<Omit<ComponentLayer, "props">>
  ) => void;
  addComponentLayer: (
    layerType: string,
    parentLayerId: string,
    addPosition?: number
  ) => void;
}

const EMPTY_ZOD_SCHEMA = z.object({});
const EMPTY_FORM_VALUES = {};

const ComponentPropsAutoForm: React.FC<ComponentPropsAutoFormProps> = ({
  selectedLayerId,
  componentRegistry,
  removeLayer,
  duplicateLayer,
  updateLayer,
  addComponentLayer,
}) => {
  const findLayerById = useLayerStore((state) => state.findLayerById);
  const revisionCounter = useEditorStore((state) => state.revisionCounter);
  const selectedLayer = findLayerById(selectedLayerId);
  const isPage = useLayerStore((state) => state.isLayerAPage(selectedLayerId));
  const allowPagesCreation = useEditorStore(
    (state) => state.allowPagesCreation
  );
  const allowPagesDeletion = useEditorStore(
    (state) => state.allowPagesDeletion
  );

  // Retrieve the appropriate schema from componentRegistry
  const { schema } = useMemo(() => {
    if (selectedLayer && componentRegistry[selectedLayer.type]) {
      const registryEntry = componentRegistry[selectedLayer.type];
      if (registryEntry) {
        return registryEntry;
      }
    }
    return { schema: EMPTY_ZOD_SCHEMA }; // Fallback schema
  }, [selectedLayer, componentRegistry]);

  const handleDeleteLayer = useCallback(() => {
    removeLayer(selectedLayerId);
  }, [removeLayer, selectedLayerId]);

  const handleDuplicateLayer = useCallback(() => {
    duplicateLayer(selectedLayerId);
  }, [duplicateLayer, selectedLayerId]);

  // Memoize variables to avoid accessing store state on every render
  const variables = useLayerStore((state) => state.variables);

  const onParsedValuesChange = useCallback(
    (
      parsedValues: Record<string, unknown> & {
        children?: string | { layerType: string; addPosition: number };
      }
    ) => {
      const { children, ...dataProps } = parsedValues;

      // Preserve variable references by merging with original props
      const preservedProps: Record<string, unknown> = {};
      if (selectedLayer) {
        // Start with all original props to preserve any that aren't in the form update
        Object.assign(preservedProps, selectedLayer.props);

        // Then update only the props that came from the form, preserving variable references
        Object.keys(dataProps).forEach((key) => {
          const originalValue = selectedLayer.props[key];
          const newValue = dataProps[key];

          const shape = (schema as unknown as { shape?: Record<string, any> })
            .shape;
          const fieldDef = shape ? shape[key] : undefined;
          const baseType = fieldDef ? getBaseType(fieldDef) : undefined;

          // If the original value was a variable reference and the variable still exists, preserve it
          // If the variable no longer exists, allow the user's new value to be saved
          if (isVariableReference(originalValue)) {
            const variableExists = variables.some(
              (v) => v.id === originalValue.__variableRef
            );
            if (variableExists) {
              // Keep the variable reference - the form should not override variable bindings
              preservedProps[key] = originalValue;
            } else {
              // Variable was deleted - use the new value from the form
              preservedProps[key] = newValue;
            }
          } else if (baseType === "ZodDate" && newValue instanceof Date) {
            // Handle date serialization
            preservedProps[key] = newValue.toISOString();
          } else {
            preservedProps[key] = newValue;
          }
        });
      }

      // Preserve children variable references only if the referenced variable still exists
      const originalChildren = selectedLayer?.children;
      const shouldPreserveChildrenBinding =
        isVariableReference(originalChildren) &&
        variables.some((v) => v.id === originalChildren.__variableRef);

      if (shouldPreserveChildrenBinding) {
        // Keep the variable reference - the form should not override children variable bindings
        updateLayer(selectedLayerId, preservedProps);
      } else if (typeof children === "string") {
        updateLayer(selectedLayerId, preservedProps, { children });
      } else if (
        children !== null &&
        typeof children === "object" &&
        "layerType" in children
      ) {
        updateLayer(selectedLayerId, preservedProps, {
          children: selectedLayer?.children,
        });
        addComponentLayer(
          children.layerType,
          selectedLayerId,
          children.addPosition
        );
      } else {
        updateLayer(selectedLayerId, preservedProps);
      }
    },
    [
      updateLayer,
      selectedLayerId,
      selectedLayer,
      addComponentLayer,
      schema,
      variables,
    ]
  );

  // Prepare values for AutoForm, converting enum values to strings as select elements only accept string values
  const formValues = useMemo(() => {
    if (!selectedLayer) return EMPTY_FORM_VALUES;

    // First resolve variable references to get display values
    const resolvedProps = resolveVariableReferences(
      selectedLayer.props,
      variables
    );

    const transformedProps: Record<string, any> = {};
    const schemaShape =
      "shape" in schema && schema.shape
        ? (schema.shape as z.ZodRawShape)
        : undefined; // Get shape from the memoized schema

    if (schemaShape) {
      for (const [key, value] of Object.entries(resolvedProps)) {
        const fieldDef = schemaShape[key];
        if (fieldDef) {
          const baseType = getBaseType(fieldDef as z.ZodAny);
          if (baseType === "ZodEnum") {
            // Convert enum value to string if it's not already a string
            transformedProps[key] =
              typeof value === "string" ? value : JSON.stringify(value);
          } else if (baseType === "ZodDate") {
            // Convert string to Date if necessary
            if (value instanceof Date) {
              transformedProps[key] = value;
            } else if (typeof value === "string" || typeof value === "number") {
              const date = new Date(value);
              transformedProps[key] = Number.isNaN(date.getTime())
                ? undefined
                : date;
            } else {
              transformedProps[key] = undefined;
            }
          } else {
            transformedProps[key] = value;
          }
        } else {
          transformedProps[key] = value;
        }
      }
    } else {
      // Fallback if schema shape isn't available: copy resolved props as is
      Object.assign(transformedProps, resolvedProps);
    }

    return { ...transformedProps, children: selectedLayer.children };
  }, [selectedLayer, schema, variables]); // Include revisionCounter to detect undo/redo changes

  const autoFormSchema = useMemo(() => {
    // Only pass ZodObject schemas to addDefaultValues, otherwise return the original schema
    if ("shape" in schema && typeof schema.shape === "object") {
      try {
        return addDefaultValues(schema as any, formValues);
      } catch (error) {
        console.warn("Failed to add default values to schema:", error);
        return schema;
      }
    }
    return schema;
  }, [schema, formValues]);

  const autoFormFieldConfig = useMemo(() => {
    if (!selectedLayer) return; // Or a default config if appropriate
    return generateFieldOverrides(componentRegistry, selectedLayer);
  }, [componentRegistry, selectedLayer]);

  // Create a unique key that changes when we need to force re-render the form
  // This includes selectedLayerId and revisionCounter to handle both layer changes and undo/redo
  const formKey = useMemo(
    () => `${selectedLayerId}-${revisionCounter}`,
    [selectedLayerId, revisionCounter]
  );

  if (!selectedLayer || !componentRegistry[selectedLayer.type]) {
    return null;
  }

  return (
    <AutoForm
      className="mt-4 space-y-4"
      fieldConfig={autoFormFieldConfig}
      formSchema={autoFormSchema}
      key={formKey} // Force re-render when layer changes or undo/redo occurs
      onParsedValuesChange={onParsedValuesChange}
      values={formValues} // Use the memoized and transformed values
    >
      {(!isPage || allowPagesCreation) && (
        <Button
          className="mt-4 w-full"
          data-testid={`button-Duplicate ,${isPage ? "Page" : "Component"}`}
          onClick={handleDuplicateLayer}
          type="button"
          variant="secondary"
        >
          Duplicate {isPage ? "Page" : "Component"}
        </Button>
      )}
      {(!isPage || allowPagesDeletion) && (
        <Button
          className="mt-4 w-full"
          data-testid={`button-Delete ,${isPage ? "Page" : "Component"}`}
          onClick={handleDeleteLayer}
          type="button"
          variant="destructive"
        >
          Delete {isPage ? "Page" : "Component"}
        </Button>
      )}
    </AutoForm>
  );
};

ComponentPropsAutoForm.displayName = "ComponentPropsAutoForm";

const nameForLayer = (layer: ComponentLayer) =>
  layer.name || layer.type.replaceAll("_", "");

const Title = React.memo(() => {
  const selectedLayer = useLayerStore((state) => {
    const selectedLayerId = state.selectedLayerId;
    return selectedLayerId ? state.findLayerById(selectedLayerId) : null;
  });

  return (
    <h2 className="mb-2 text-xl font-semibold">
      {selectedLayer ? nameForLayer(selectedLayer) : ""} Properties
    </h2>
  );
});

Title.displayName = "Title";
