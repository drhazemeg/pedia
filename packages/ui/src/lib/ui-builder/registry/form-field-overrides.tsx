import { Badge } from "@pedia/ui/components/badge";
import { Button } from "@pedia/ui/components/button";
import { Card, CardContent } from "@pedia/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@pedia/ui/components/dropdown-menu";
import {
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
} from "@pedia/ui/components/form";
import { Input } from "@pedia/ui/components/input";
import { Label } from "@pedia/ui/components/label";
import { MinimalTiptapEditor } from "@pedia/ui/components/minimal-tiptap/minimal-tiptap";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@pedia/ui/components/select";
import { Textarea } from "@pedia/ui/components/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@pedia/ui/components/tooltip";
import { ChildrenSearchableSelect } from "@pedia/ui/components/ui-builder/internal/form-fields/children-searchable-select";
import BreakpointClassNameControl from "@pedia/ui/components/ui-builder/internal/form-fields/classname-control";
import { EMAIL_CLASSNAME_CONTROL_PROFILE } from "@pedia/ui/components/ui-builder/internal/form-fields/classname-control/config";
import IconNameField from "@pedia/ui/components/ui-builder/internal/form-fields/iconname-field";
import type {
  AutoFormInputComponentProps,
  ComponentLayer,
  FieldConfigFunction,
  Variable,
} from "@pedia/ui/components/ui-builder/types";
import { useEditorStore } from "@pedia/ui/lib/ui-builder/store/editor-store";
import { useLayerStore } from "@pedia/ui/lib/ui-builder/store/layer-store";
import { isVariableReference } from "@pedia/ui/lib/ui-builder/utils/variable-resolver";
import { Link, LockKeyhole, Unlink } from "lucide-react";
import React from "react";

// ─── Narrowing helpers ────────────────────────────────────────────────────────

const asString = (v: unknown): string | undefined =>
  typeof v === "string" ? v : undefined;

const asRequiredString = (v: unknown): string =>
  typeof v === "string" ? v : "";

// ─── Class name overrides ─────────────────────────────────────────────────────

export const classNameFieldOverrides: FieldConfigFunction = () => {
  return {
    fieldType: ({
      label,
      isRequired,
      field,
      fieldConfigItem,
    }: AutoFormInputComponentProps) => (
      <FormFieldWrapper
        fieldConfigItem={fieldConfigItem}
        isRequired={isRequired}
        label={label}
      >
        <BreakpointClassNameControl
          onChange={field.handleChange}
          value={asString(field.state.value)}
        />
      </FormFieldWrapper>
    ),
  };
};

export const emailClassNameFieldOverrides: FieldConfigFunction = () => {
  return {
    fieldType: ({
      label,
      isRequired,
      field,
      fieldConfigItem,
    }: AutoFormInputComponentProps) => (
      <FormFieldWrapper
        fieldConfigItem={fieldConfigItem}
        isRequired={isRequired}
        label={label}
      >
        <BreakpointClassNameControl
          classProfile={EMAIL_CLASSNAME_CONTROL_PROFILE}
          onChange={field.handleChange}
          value={asString(field.state.value)}
        />
      </FormFieldWrapper>
    ),
  };
};

// ─── Children overrides ───────────────────────────────────────────────────────

export const childrenFieldOverrides = (
  layer: ComponentLayer,
  allowVariableBinding = true
) => {
  return {
    renderParent: allowVariableBinding
      ? ({ children }: { children: React.ReactNode }) => (
          <ChildrenVariableBindingWrapper>
            {children}
          </ChildrenVariableBindingWrapper>
        )
      : undefined,
    fieldType: ({
      label,
      isRequired,
      fieldConfigItem,
      field,
      fieldProps,
    }: AutoFormInputComponentProps) => (
      <FormFieldWrapper
        fieldConfigItem={fieldConfigItem}
        isRequired={isRequired}
        label={label}
      >
        <ChildrenSearchableSelect
          layer={layer}
          onChange={field.handleChange}
          {...fieldProps}
        />
      </FormFieldWrapper>
    ),
  };
};

export const childrenAsTextareaFieldOverrides = (
  layer: ComponentLayer,
  allowVariableBinding = true
) => {
  return {
    renderParent: allowVariableBinding
      ? ({ children }: { children: React.ReactNode }) => (
          <ChildrenVariableBindingWrapper>
            {children}
          </ChildrenVariableBindingWrapper>
        )
      : undefined,
    fieldType: ({
      label,
      isRequired,
      fieldConfigItem,
      field,
      fieldProps,
    }: AutoFormInputComponentProps) => (
      <FormFieldWrapper
        fieldConfigItem={fieldConfigItem}
        isRequired={isRequired}
        label={label}
      >
        <Textarea
          onChange={field.handleChange}
          value={asRequiredString(layer.children)}
          {...fieldProps}
        />
      </FormFieldWrapper>
    ),
  };
};

export const childrenAsTipTapFieldOverrides = (
  layer: ComponentLayer,
  allowVariableBinding = true
) => {
  return {
    renderParent: allowVariableBinding
      ? ({ children }: { children: React.ReactNode }) => (
          <ChildrenVariableBindingWrapper>
            {children}
          </ChildrenVariableBindingWrapper>
        )
      : undefined,
    fieldType: ({
      label,
      isRequired,
      fieldConfigItem,
      field,
      fieldProps,
    }: AutoFormInputComponentProps) => (
      <FormFieldWrapper
        fieldConfigItem={fieldConfigItem}
        isRequired={isRequired}
        label={label}
      >
        <MinimalTiptapEditor
          editable
          editorClassName="focus:outline-none px-4 py-2 h-full"
          immediatelyRender={false}
          onChange={(content) => {
            if (typeof content === "string") {
              field.handleChange(content);
              return;
            }
            console.warn("Tiptap content is not a string");
          }}
          output="markdown"
          value={asRequiredString(layer.children)}
          {...fieldProps}
        />
      </FormFieldWrapper>
    ),
  };
};

// ─── Icon name override ───────────────────────────────────────────────────────

export const iconNameFieldOverrides: FieldConfigFunction = (layer) => {
  return {
    fieldType: ({
      label,
      isRequired,
      field,
      fieldProps,
    }: AutoFormInputComponentProps) => (
      <IconNameField
        isRequired={isRequired}
        label={label}
        onChange={field.handleChange}
        value={asRequiredString(layer.props.iconName)}
        {...fieldProps}
      />
    ),
  };
};

// ─── Text input override ──────────────────────────────────────────────────────

export const textInputFieldOverrides = (
  _layer: ComponentLayer,
  allowVariableBinding: boolean,
  propName: string
) => {
  return {
    renderParent: allowVariableBinding
      ? ({ children }: { children: React.ReactNode }) => (
          <VariableBindingWrapper propName={propName}>
            {children}
          </VariableBindingWrapper>
        )
      : undefined,
    fieldType: ({
      label,
      isRequired,
      fieldConfigItem,
      field,
      fieldProps,
    }: AutoFormInputComponentProps) => (
      <FormFieldWrapper
        fieldConfigItem={fieldConfigItem}
        isRequired={isRequired}
        label={label}
      >
        <Input
          onChange={(e) => field.handleChange(e.target.value)}
          value={asRequiredString(field.state.value)}
          {...fieldProps}
        />
      </FormFieldWrapper>
    ),
  };
};

// ─── Common overrides ─────────────────────────────────────────────────────────

const memoizedCommonFieldOverrides = new Map<
  boolean,
  Record<string, (layer: ComponentLayer) => ReturnType<FieldConfigFunction>>
>();

export const commonFieldOverrides = (allowBinding = true) => {
  const cached = memoizedCommonFieldOverrides.get(allowBinding);
  if (cached) return cached;

  const overrides = {
    className: (layer: ComponentLayer) => classNameFieldOverrides(layer),
    children: (layer: ComponentLayer) =>
      childrenFieldOverrides(layer, allowBinding),
  };

  memoizedCommonFieldOverrides.set(allowBinding, overrides);
  return overrides;
};

export const commonVariableRenderParentOverrides = (propName: string) => {
  return {
    renderParent: ({ children }: { children: React.ReactNode }) => (
      <VariableBindingWrapper propName={propName}>
        {children}
      </VariableBindingWrapper>
    ),
  };
};

// ─── Function prop field ──────────────────────────────────────────────────────

interface FunctionPropFieldProps {
  propName: string;
  label: string;
  isRequired?: boolean;
  fieldConfigItem?: { description?: React.ReactNode };
}

function FunctionPropField({
  propName,
  label,
  isRequired,
  fieldConfigItem,
}: FunctionPropFieldProps) {
  const selectedLayerId = useLayerStore((state) => state.selectedLayerId);
  const findLayerById = useLayerStore((state) => state.findLayerById);
  const updateLayer = useLayerStore((state) => state.updateLayer);
  const incrementRevision = useEditorStore((state) => state.incrementRevision);
  const functionRegistry = useEditorStore((state) => state.functionRegistry);
  const unbindPropFromVariable = useLayerStore(
    (state) => state.unbindPropFromVariable
  );

  const selectedLayer = findLayerById(selectedLayerId);

  if (!selectedLayer || !functionRegistry) {
    return (
      <FormFieldWrapper
        fieldConfigItem={fieldConfigItem}
        isRequired={isRequired}
        label={label}
      >
        <Select disabled>
          <SelectTrigger>
            <SelectValue placeholder="No function registry available" />
          </SelectTrigger>
        </Select>
      </FormFieldWrapper>
    );
  }

  const functionEntries = Object.entries(functionRegistry);
  const bindingKey = `__function_${propName}`;
  const directFuncId = selectedLayer.props[bindingKey];
  const currentFunctionId =
    typeof directFuncId === "string" ? directFuncId : "";

  const handleValueChange = (value: string | null) => {
    if (!value) return;

    if (value === "__none__") {
      unbindPropFromVariable(selectedLayer.id, propName);
      updateLayer(selectedLayer.id, {
        [bindingKey]: undefined,
        [propName]: undefined,
      });
      incrementRevision();
      return;
    }

    const funcDef = functionRegistry[value];
    if (!funcDef) return;

    unbindPropFromVariable(selectedLayer.id, propName);
    updateLayer(selectedLayer.id, {
      [propName]: funcDef.fn,
      [bindingKey]: value,
    });
    incrementRevision();
  };

  const displayText = currentFunctionId
    ? (functionRegistry[currentFunctionId]?.name ?? currentFunctionId)
    : "Select a function...";

  return (
    <FormFieldWrapper
      fieldConfigItem={fieldConfigItem}
      isRequired={isRequired}
      label={label}
    >
      <Select onValueChange={handleValueChange} value={currentFunctionId}>
        <SelectTrigger className="mb-0 w-full">
          <SelectValue placeholder="Select a function...">
            {displayText}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">
            <span className="text-muted-foreground">None (clear)</span>
          </SelectItem>
          {functionEntries.map(([id, funcDef]) => (
            <SelectItem key={id} value={id}>
              <div className="flex flex-col">
                <span>{funcDef.name}</span>
                {funcDef.description && (
                  <span className="text-muted-foreground text-xs">
                    {funcDef.description}
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormFieldWrapper>
  );
}

export const functionPropFieldOverrides = (
  propName: string
): ReturnType<FieldConfigFunction> => {
  return {
    renderParent: ({ children }: { children: React.ReactNode }) => (
      <VariableBindingWrapper isFunctionProp propName={propName}>
        {children}
      </VariableBindingWrapper>
    ),
    fieldType: (props: AutoFormInputComponentProps) => (
      <FunctionPropField propName={propName} {...props} />
    ),
  };
};

// ─── Variable binding wrapper ─────────────────────────────────────────────────

interface VariableBindingWrapperProps {
  propName: string;
  children: React.ReactNode;
  /** Set to true when binding to function props (onClick, onSubmit, etc.) */
  isFunctionProp?: boolean;
}

export function VariableBindingWrapper({
  propName,
  children,
  isFunctionProp = false,
}: VariableBindingWrapperProps) {
  const variables = useLayerStore((state) => state.variables);
  const selectedLayerId = useLayerStore((state) => state.selectedLayerId);
  const findLayerById = useLayerStore((state) => state.findLayerById);
  const isBindingImmutable = useLayerStore((state) => state.isBindingImmutable);
  const incrementRevision = useEditorStore((state) => state.incrementRevision);
  const functionRegistry = useEditorStore((state) => state.functionRegistry);
  const unbindPropFromVariable = useLayerStore(
    (state) => state.unbindPropFromVariable
  );
  const bindPropToVariable = useLayerStore((state) => state.bindPropToVariable);

  const selectedLayer = findLayerById(selectedLayerId);
  if (!selectedLayer) return <>{children}</>;

  const filteredVariables = variables.filter((v) =>
    isFunctionProp ? v.type === "function" : v.type !== "function"
  );

  const currentValue = selectedLayer.props[propName];
  const isCurrentlyBound = isVariableReference(currentValue);
  const boundVariable = isCurrentlyBound
    ? (variables.find((v) => v.id === currentValue.__variableRef) ?? null)
    : null;
  const isImmutable = isBindingImmutable(selectedLayer.id, propName);

  const getVariableDisplayValue = (variable: Variable) => {
    if (variable.type === "function" && functionRegistry) {
      const funcId = String(variable.defaultValue);
      return functionRegistry[funcId]?.name ?? funcId;
    }
    return String(variable.defaultValue);
  };

  const handleBindToVariable = (variableId: string) => {
    bindPropToVariable(selectedLayer.id, propName, variableId);
    incrementRevision();
  };

  const handleUnbind = () => {
    unbindPropFromVariable(selectedLayer.id, propName);
    incrementRevision();
  };

  const emptyMessage = isFunctionProp
    ? "No function variables defined"
    : "No variables defined";
  const bindLabel = isFunctionProp
    ? "Bind to Function Variable"
    : "Bind to Variable";
  const tooltipLabel = isFunctionProp ? "Bind Function" : "Bind Variable";

  if (isCurrentlyBound && boundVariable) {
    return (
      <div className="flex w-full items-end gap-2">
        <div className="flex w-full flex-col gap-2">
          <Label>{propName.charAt(0).toUpperCase() + propName.slice(1)}</Label>
          <div className="flex w-full items-end gap-2">
            <Card className="w-full min-w-0 overflow-hidden">
              <CardContent className="px-4 py-1">
                <div className="flex w-full items-center gap-2">
                  <Link className="h-4 w-4 flex-shrink-0" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex w-full items-center gap-2">
                      <span className="font-medium">{boundVariable.name}</span>
                      <span className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                        {boundVariable.type}
                      </span>
                      {isImmutable && (
                        <Badge
                          className="rounded"
                          data-testid="immutable-badge"
                        >
                          <LockKeyhole className="h-3 w-3" strokeWidth={3} />
                        </Badge>
                      )}
                    </div>
                    <span className="text-muted-foreground truncate text-xs">
                      {getVariableDisplayValue(boundVariable)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            {!isImmutable && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      className="h-10 px-3"
                      data-testid="unbind-variable-button"
                      onClick={handleUnbind}
                      variant="outline"
                    />
                  }
                >
                  <Unlink className="h-4 w-4" />
                </TooltipTrigger>
                <TooltipContent>Unbind Variable</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full items-end gap-2">
      <div className="flex-1">{children}</div>
      <div className="flex justify-end">
        <DropdownMenu>
          <Tooltip>
            <DropdownMenuTrigger
              render={
                <TooltipTrigger
                  render={
                    <Button
                      className="h-10 px-3"
                      data-testid="bind-variable-button"
                      size="sm"
                      variant="outline"
                    />
                  }
                />
              }
            >
              <Link className="my-1 h-4 w-4" />
            </DropdownMenuTrigger>
            <TooltipContent>{tooltipLabel}</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="w-56">
            <div className="text-muted-foreground border-b px-2 py-1.5 text-xs font-medium">
              {bindLabel}
            </div>
            {filteredVariables.length > 0 ? (
              filteredVariables.map((variable) => (
                <DropdownMenuItem
                  className="flex flex-col items-start p-3"
                  key={variable.id}
                  onClick={() => handleBindToVariable(variable.id)}
                >
                  <div className="flex w-full items-center gap-2">
                    <Link className="h-4 w-4 flex-shrink-0" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{variable.name}</span>
                        <span className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                          {variable.type}
                        </span>
                      </div>
                      <span className="text-muted-foreground truncate text-xs">
                        {getVariableDisplayValue(variable)}
                      </span>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))
            ) : (
              <div className="text-muted-foreground px-3 py-2 text-xs">
                {emptyMessage}
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ─── Children variable binding wrapper ────────────────────────────────────────

interface ChildrenVariableBindingWrapperProps {
  children: React.ReactNode;
}

export function ChildrenVariableBindingWrapper({
  children,
}: ChildrenVariableBindingWrapperProps) {
  const variables = useLayerStore((state) => state.variables);
  const selectedLayerId = useLayerStore((state) => state.selectedLayerId);
  const findLayerById = useLayerStore((state) => state.findLayerById);
  const isChildrenBindingImmutable = useLayerStore(
    (state) => state.isChildrenBindingImmutable
  );
  const incrementRevision = useEditorStore((state) => state.incrementRevision);
  const unbindChildrenFromVariable = useLayerStore(
    (state) => state.unbindChildrenFromVariable
  );
  const bindChildrenToVariable = useLayerStore(
    (state) => state.bindChildrenToVariable
  );

  const selectedLayer = findLayerById(selectedLayerId);
  if (!selectedLayer) return <>{children}</>;

  const currentValue = selectedLayer.children;
  const isCurrentlyBound = isVariableReference(currentValue);
  const boundVariable = isCurrentlyBound
    ? (variables.find((v) => v.id === currentValue.__variableRef) ?? null)
    : null;
  const isImmutable = isChildrenBindingImmutable(selectedLayer.id);

  const handleBindToVariable = (variableId: string) => {
    bindChildrenToVariable(selectedLayer.id, variableId);
    incrementRevision();
  };

  const handleUnbind = () => {
    unbindChildrenFromVariable(selectedLayer.id);
    incrementRevision();
  };

  const stringVariables = variables.filter((v) => v.type === "string");

  if (isCurrentlyBound && boundVariable) {
    return (
      <div className="flex w-full items-end gap-2">
        <div className="flex w-full flex-col gap-2">
          <Label>Children</Label>
          <div className="flex w-full items-end gap-2">
            <Card className="w-full min-w-0 overflow-hidden">
              <CardContent className="px-4 py-1">
                <div className="flex w-full items-center gap-2">
                  <Link className="h-4 w-4 flex-shrink-0" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex w-full items-center gap-2">
                      <span className="font-medium">{boundVariable.name}</span>
                      <span className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                        {boundVariable.type}
                      </span>
                      {isImmutable && (
                        <Badge
                          className="rounded"
                          data-testid="immutable-children-badge"
                        >
                          <LockKeyhole className="h-3 w-3" strokeWidth={3} />
                        </Badge>
                      )}
                    </div>
                    <span className="text-muted-foreground truncate text-xs">
                      {String(boundVariable.defaultValue)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            {!isImmutable && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      className="h-10 px-3"
                      data-testid="unbind-children-button"
                      onClick={handleUnbind}
                      variant="outline"
                    />
                  }
                >
                  <Unlink className="h-4 w-4" />
                </TooltipTrigger>
                <TooltipContent>Unbind Variable</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full items-end gap-2">
      <div className="flex-1">{children}</div>
      <div className="flex justify-end">
        <DropdownMenu>
          <Tooltip>
            <DropdownMenuTrigger
              render={
                <TooltipTrigger
                  render={
                    <Button
                      className="h-10 px-3"
                      data-testid="bind-children-button"
                      size="sm"
                      variant="outline"
                    />
                  }
                />
              }
            >
              <Link className="my-1 h-4 w-4" />
            </DropdownMenuTrigger>
            <TooltipContent>Bind Children to Variable</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="w-56">
            <div className="text-muted-foreground border-b px-2 py-1.5 text-xs font-medium">
              Bind Children to Variable
            </div>
            {stringVariables.length > 0 ? (
              stringVariables.map((variable) => (
                <DropdownMenuItem
                  className="flex flex-col items-start p-3"
                  key={variable.id}
                  onClick={() => handleBindToVariable(variable.id)}
                >
                  <div className="flex w-full items-center gap-2">
                    <Link className="h-4 w-4 flex-shrink-0" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{variable.name}</span>
                        <span className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                          {variable.type}
                        </span>
                      </div>
                      <span className="text-muted-foreground truncate text-xs">
                        {String(variable.defaultValue)}
                      </span>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))
            ) : (
              <div className="text-muted-foreground px-3 py-2 text-xs">
                No string variables defined
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ─── Form field wrapper ───────────────────────────────────────────────────────

interface FormFieldWrapperProps {
  label: string;
  isRequired?: boolean;
  fieldConfigItem?: { description?: React.ReactNode };
  children: React.ReactNode;
}

export function FormFieldWrapper({
  label,
  isRequired,
  fieldConfigItem,
  children,
}: FormFieldWrapperProps) {
  const controlledChild = React.isValidElement(children) ? (
    children
  ) : (
    // biome-ignore lint/complexity/noUselessFragments: <ok>
    <>{children}</> // wrap non-elements in a fragment
  );
  return (
    <FormItem className="flex flex-col">
      <FormLabel>
        {label}
        {isRequired && <span className="text-destructive"> *</span>}
      </FormLabel>
      <FormControl>{controlledChild}</FormControl>
      {fieldConfigItem?.description && (
        <FormDescription>{fieldConfigItem.description}</FormDescription>
      )}
    </FormItem>
  );
}
