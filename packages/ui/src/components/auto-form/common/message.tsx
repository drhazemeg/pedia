import { FormMessage as BaseFormMessage } from "@pedia/ui/components/form";

type AutoFormMessageProps = {
  className?: string;
  children?: React.ReactNode;
};

export default function AutoFormMessage({
  className,
  children,
}: AutoFormMessageProps) {
  return <BaseFormMessage className={className}>{children}</BaseFormMessage>;
}
