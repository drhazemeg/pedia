"use client";

import { CodeBlock } from "@pedia/ui/components/ui-builder/components/codeblock";
import { cn } from "@pedia/ui/lib/utils";
import type { FC } from "react";
import { memo, useMemo } from "react";
import type { Components, Options } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

interface MarkdownProps {
  className?: string;
  children: string;
}

function MarkdownLink({
  children,
  href,
  className,
}: React.ComponentProps<"a">) {
  return (
    <a
      className={cn(className, "text-blue-500 hover:text-blue-600")}
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      {children}
    </a>
  );
}

function MarkdownImage({ src, alt, className }: React.ComponentProps<"img">) {
  return <img alt={alt} className={cn(className, "h-auto w-full")} src={src} />;
}

function MarkdownCode({
  className,
  children,
  ...props
}: React.ComponentProps<"code">) {
  const match = /language-(\w+)/.exec(className || "");

  if (match) {
    return (
      <CodeBlock
        language={match[1] ?? ""}
        value={JSON.stringify(children).replace(/\n$/, "")}
        {...props}
      />
    );
  }

  return (
    <code className={cn(className, "whitespace-pre-wrap")} {...props}>
      {children}
    </code>
  );
}

export function Markdown({
  children: markdown,
  className: outerClassName,
}: MarkdownProps) {
  const components = useMemo<Components>(
    () => ({
      a: MarkdownLink,
      img: MarkdownImage,
      code: MarkdownCode,
    }),
    []
  );

  const remarkPlugins = useMemo(() => [remarkGfm, remarkMath], []);

  return (
    <MemoizedReactMarkdown
      className={cn(
        "prose prose-pre:m-1 prose-li:my-0 prose-ol:my-1 prose-p:my-1 prose-ul:my-1 prose-code:prose-headings:bg-secondary prose-pre:p-0 prose-li:py-0 prose-p:font-normal prose-blockquote:text-secondary-foreground prose-headings:text-secondary-foreground prose-p:text-base prose-strong:text-secondary-foreground text-secondary-foreground prose-p:leading-relaxed max-w-none break-words",
        outerClassName
      )}
      components={components}
      remarkPlugins={remarkPlugins}
    >
      {markdown}
    </MemoizedReactMarkdown>
  );
}

interface MemoizedReactMarkdownProps extends Options {
  className?: string;
  children: string;
}

const MemoizedReactMarkdown: FC<MemoizedReactMarkdownProps> = memo(
  ({ className, ...props }) => {
    return (
      <div className={className}>
        <ReactMarkdown {...props} />
      </div>
    );
  },
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    prevProps.className === nextProps.className &&
    prevProps.components === nextProps.components &&
    prevProps.remarkPlugins === nextProps.remarkPlugins
);
MemoizedReactMarkdown.displayName = "MemoizedReactMarkdown";
