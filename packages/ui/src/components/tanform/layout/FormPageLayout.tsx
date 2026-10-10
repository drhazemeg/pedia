// components/ui/form-page-layout.tsx

import { Button } from "@pedia/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@pedia/ui/components/card";
import { cn } from "@pedia/ui/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback } from "react";

interface FormPageLayoutProps {
  actions?: ReactNode;
  backLabel?: string;
  backTo?: string;
  children: ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full";
  title: string;
}

const maxWidthClasses = {
  sm: "max-w-2xl",
  md: "max-w-3xl",
  lg: "max-w-4xl",
  xl: "max-w-5xl",
  full: "max-w-full",
};

export function FormPageLayout({
  title,
  children,
  backTo,
  backLabel = "Back",
  actions,
  className,
  maxWidth = "md",
}: FormPageLayoutProps) {
  const navigate = useNavigate();

  const handleBack = useCallback(() => {
    if (backTo) {
      void navigate({ to: backTo });
    }
  }, [navigate, backTo]);

  return (
    <div
      className={cn("mx-auto space-y-6", maxWidthClasses[maxWidth], className)}
    >
      {Boolean(backTo) && (
        <Button onClick={handleBack} variant="ghost">
          <ArrowLeft className="mr-2 size-4" />
          {backLabel}
        </Button>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{title}</CardTitle>
            {actions}
          </div>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}
