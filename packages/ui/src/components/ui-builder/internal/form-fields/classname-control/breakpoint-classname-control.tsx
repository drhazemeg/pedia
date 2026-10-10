import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@pedia/ui/components/accordion";
import { Badge } from "@pedia/ui/components/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@pedia/ui/components/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@pedia/ui/components/tooltip";
import { ClassNameItemControl } from "@pedia/ui/components/ui-builder/internal/form-fields/classname-control/classname-item-control";
import ClassNameMultiselect from "@pedia/ui/components/ui-builder/internal/form-fields/classname-control/classname-multiselect";
import type { ClassNameControlProfile } from "@pedia/ui/components/ui-builder/internal/form-fields/classname-control/config";
import { useCallback, useState } from "react";

interface BreakpointClassNameControlProps {
  onChange?: (classes: string) => void;
  value?: string;
  classProfile?: ClassNameControlProfile;
}

interface ParsedClassString {
  base: string;
  md: string;
  rest: string;
}

function parseClassString(str: string): ParsedClassString {
  const tokens = str.trim().split(/\s+/);
  const base: string[] = [];
  const md: string[] = [];
  const rest: string[] = [];

  for (const token of tokens) {
    if (token.startsWith("md:")) {
      md.push(token.slice(3));
    } else if (token.includes(":")) {
      rest.push(token);
    } else if (token) {
      base.push(token);
    }
  }

  return {
    base: base.join(" "),
    md: md.join(" "),
    rest: rest.join(" "),
  };
}

function serializeClassString(parts: Array<string | undefined>): string {
  return parts
    .filter((part): part is string => Boolean(part))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function BreakpointClassNameControl({
  onChange,
  value = "",
  classProfile,
}: BreakpointClassNameControlProps) {
  const [tab, setTab] = useState<"base" | "md">("base");

  // `value` is the single source of truth — no local mirror state.
  const { base, md, rest } = parseClassString(value);

  const handleBaseChange = useCallback(
    (newBase: string) => {
      const mdPrefixed = md
        .split(" ")
        .filter(Boolean)
        .map((cls) => `md:${cls}`)
        .join(" ");
      onChange?.(serializeClassString([newBase, mdPrefixed, rest]));
    },
    [md, rest, onChange]
  );

  const handleMdChange = useCallback(
    (newMd: string) => {
      const mdPrefixed = newMd
        .split(" ")
        .filter(Boolean)
        .map((cls) => `md:${cls}`)
        .join(" ");
      onChange?.(serializeClassString([base, mdPrefixed, rest]));
    },
    [base, rest, onChange]
  );

  const handleMultiselectChange = useCallback(
    (newClassString: string) => {
      onChange?.(newClassString);
    },
    [onChange]
  );

  const handleTabChange = useCallback(
    (val: string) => setTab(val as "base" | "md"),
    []
  );

  return (
    <div
      className="w-full rounded-lg border"
      data-testid="breakpoint-classname-control"
    >
      <Tabs
        className="w-full"
        data-testid="breakpoint-tabs"
        onValueChange={handleTabChange}
        value={tab}
      >
        <TabsList
          className="grid w-full grid-cols-2"
          data-testid="breakpoint-tabs-list"
        >
          <TabsTrigger data-testid="base-tab-trigger" value="base">
            <Tooltip>
              <TooltipTrigger render={<div className="flex items-center" />}>
                <span>Base</span>
                {base && (
                  <Badge className="ms-1 h-[18px] min-w-[18px] justify-center px-[3px] text-center !text-[10px]">
                    {base.split(" ").filter(Boolean).length}
                  </Badge>
                )}
              </TooltipTrigger>
              <TooltipContent>Base styles for all screen sizes</TooltipContent>
            </Tooltip>
          </TabsTrigger>
          <TabsTrigger data-testid="md-tab-trigger" value="md">
            <Tooltip>
              <TooltipTrigger render={<div className="flex items-center" />}>
                <span className="overflow-hidden text-nowrap text-ellipsis whitespace-nowrap">
                  Tablet &amp; Desktop
                </span>
                {md && (
                  <Badge className="ms-1 h-[18px] min-w-[18px] justify-center px-[3px] text-center !text-[10px]">
                    {md.split(" ").filter(Boolean).length}
                  </Badge>
                )}
              </TooltipTrigger>
              <TooltipContent>
                Overrides for screens larger than 768px (md:*)
              </TooltipContent>
            </Tooltip>
          </TabsTrigger>
        </TabsList>
        <TabsContent
          className="mt-0"
          data-testid="base-tab-content"
          value="base"
        >
          <ClassNameItemControl
            classProfile={classProfile}
            onChange={handleBaseChange}
            value={base}
          />
        </TabsContent>
        <TabsContent className="mt-0" data-testid="md-tab-content" value="md">
          <ClassNameItemControl
            classProfile={classProfile}
            onChange={handleMdChange}
            value={md}
          />
        </TabsContent>
      </Tabs>
      <Accordion data-testid="classes-accordion" defaultValue={undefined}>
        <AccordionItem
          className="border-t border-b-0 px-4 [&_#accordion-content[data-state=closed]]:overflow-hidden [&_#accordion-content[data-state=open]]:overflow-visible"
          data-testid="classes-accordion-item"
          value="classes"
        >
          <AccordionTrigger
            className="text-sm"
            data-testid="classes-accordion-trigger"
          >
            Edit All Classes
          </AccordionTrigger>
          <AccordionContent
            data-testid="classes-accordion-content"
            id="accordion-content"
          >
            <ClassNameMultiselect
              classProfile={classProfile}
              onChange={handleMultiselectChange}
              value={value}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
