function AutoFormTooltip({
  fieldConfigItem,
}: {
  fieldConfigItem: { description?: React.ReactNode } | undefined;
}) {
  if (!fieldConfigItem?.description) return null;
  return (
    <p className="text-sm text-gray-500 dark:text-white">
      {fieldConfigItem.description}
    </p>
  );
}

export default AutoFormTooltip;
