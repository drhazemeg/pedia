"use client";

import { Button } from "@pedia/ui/components/button";
import { useCopyToClipboard } from "@pedia/ui/hooks/use-copy-to-clipboard";
import { CheckIcon, CopyIcon } from "lucide-react";
import { memo, useCallback, useMemo } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { coldarkDark } from "react-syntax-highlighter/dist/cjs/styles/prism";

interface CodeBlockProps {
  language: string;
  value: string;
}

type languageMap = Record<string, string | undefined>;

export const programmingLanguages: languageMap = {
  javascript: ".js",
  python: ".py",
  java: ".java",
  c: ".c",
  cpp: ".cpp",
  "c++": ".cpp",
  "c#": ".cs",
  ruby: ".rb",
  php: ".php",
  swift: ".swift",
  "objective-c": ".m",
  kotlin: ".kt",
  typescript: ".ts",
  go: ".go",
  perl: ".pl",
  rust: ".rs",
  scala: ".scala",
  haskell: ".hs",
  lua: ".lua",
  shell: ".sh",
  sql: ".sql",
  html: ".html",
  css: ".css",
  tsx: ".tsx",
  // add more file extensions here
};

export const CodeBlock = memo(({ language, value }: CodeBlockProps) => {
  const { isCopied, copyToClipboard } = useCopyToClipboard({ timeout: 2000 });

  const onCopy = useCallback(() => {
    if (isCopied) return;
    void copyToClipboard(value);
  }, [isCopied, copyToClipboard, value]);

  const customStyle = useMemo(() => {
    return {
      margin: 0,
      width: "100%",
      background: "transparent",
      padding: "1.5rem 1rem",
    };
  }, []);

  const codeTagProps = useMemo(() => {
    return {
      style: {
        fontSize: "0.9rem",
        fontFamily: "var(--font-mono)",
      },
    };
  }, []);

  const highlighted = useMemo(
    () => (
      <SyntaxHighlighter
        codeTagProps={codeTagProps}
        customStyle={customStyle}
        language={language}
        PreTag="div"
        showLineNumbers
        style={coldarkDark}
      >
        {value}
      </SyntaxHighlighter>
    ),
    [language, value, customStyle, codeTagProps]
  );

  return (
    <div
      className="codeblock border-border relative w-full rounded-md border font-sans"
      data-testid={`codeblock-${language}`}
    >
      <div className="border-border bg-background text-foreground flex w-full items-center justify-between rounded-t-sm border-b px-6 py-2 pe-4">
        <span className="text-md font-semibold uppercase">{language}</span>
        <div className="flex items-center space-x-1 rtl:space-x-reverse">
          <Button onClick={onCopy} size="icon" variant="ghost">
            {isCopied ? <CheckIcon /> : <CopyIcon />}
            <span className="sr-only">Copy code</span>
          </Button>
        </div>
      </div>
      {highlighted}
    </div>
  );
});
CodeBlock.displayName = "CodeBlock";
