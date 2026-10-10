import LogoSvg from "@pedia/ui/assets/svg/logo";
// Util Imports
import { cn } from "@pedia/ui/lib/utils";

function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoSvg className="size-8.5" />
      <span className="text-xl font-bold">shadcn/studio</span>
    </div>
  );
}

export default Logo;
