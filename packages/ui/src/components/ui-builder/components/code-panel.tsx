import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@pedia/ui/components/tabs";
import { CodeBlock } from "@pedia/ui/components/ui-builder/components/codeblock";
import { pageLayerToCode } from "@pedia/ui/components/ui-builder/internal/utils/templates";
import { useEditorStore } from "@pedia/ui/lib/ui-builder/store/editor-store";
import { useLayerStore } from "@pedia/ui/lib/ui-builder/store/layer-store";
import { cn } from "@pedia/ui/lib/utils";
import { useMemo } from "react";

import { Label } from "../../label";

export function CodePanel({ className }: { className?: string }) {
  const componentRegistry = useEditorStore((state) => state.registry);
  const functionRegistry = useEditorStore((state) => state.functionRegistry);
  const getPageTypeCodeGenerator = useEditorStore(
    (state) => state.getPageTypeCodeGenerator
  );
  const selectedPageId = useLayerStore((state) => state.selectedPageId);
  const findLayerById = useLayerStore((state) => state.findLayerById);
  const variables = useLayerStore((state) => state.variables);

  const page = findLayerById(selectedPageId);

  // Use a custom code generator if one is registered for this page type
  const customCodeGenerator = page?.pageType
    ? getPageTypeCodeGenerator(page.pageType)
    : undefined;

  const codeBlocks = useMemo(() => {
    // Create separate serialized data for variables and layers
    const serializedVariables = variables.map((v) => {
      return {
        id: v.id,
        name: v.name,
        type: v.type,
        defaultValue: v.defaultValue,
      };
    });

    const primaryCode = customCodeGenerator
      ? page
        ? customCodeGenerator.generateCode(page, componentRegistry)
        : ""
      : page
        ? pageLayerToCode(page, componentRegistry, variables, functionRegistry)
        : "";

    return {
      primary: primaryCode,
      primaryLabel: customCodeGenerator?.label ?? "React",
      variables: JSON.stringify(
        serializedVariables,
        (_key, value) => (typeof value === "function" ? undefined : value),
        2
      ),
      layers: JSON.stringify(
        page,
        (_key, value) => (typeof value === "function" ? undefined : value),
        2
      ),
    };
  }, [
    page,
    componentRegistry,
    variables,
    functionRegistry,
    customCodeGenerator,
  ]);

  return <CodeContent className={className} codeBlocks={codeBlocks} />;
}

function CodeContent({
  codeBlocks,
  className,
}: {
  codeBlocks: {
    primary: string;
    primaryLabel: string;
    variables: string;
    layers: string;
  };
  className?: string;
}) {
  return (
    <Tabs
      className={cn("w-full overflow-hidden", className)}
      defaultValue="primary"
    >
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="primary">{codeBlocks.primaryLabel}</TabsTrigger>
        <TabsTrigger value="serialized">Serialized</TabsTrigger>
      </TabsList>
      <TabsContent value="primary">
        <div className="relative">
          <div className="max-h-[400px] w-full overflow-auto">
            <CodeBlock language="tsx" value={codeBlocks.primary} />
          </div>
        </div>
      </TabsContent>
      <TabsContent value="serialized">
        <div className="space-y-4">
          {codeBlocks.variables !== "[]" && (
            <div className="relative">
              <Label>Variables</Label>
              <div className="max-h-[200px] w-full overflow-auto">
                <CodeBlock language="json" value={codeBlocks.variables} />
              </div>
            </div>
          )}
          <div className="relative">
            <Label>Layers</Label>
            <div className="max-h-[200px] w-full overflow-auto">
              <CodeBlock language="json" value={codeBlocks.layers} />
            </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
