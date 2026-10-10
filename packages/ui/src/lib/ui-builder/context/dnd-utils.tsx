export const getIframeElements = () => {
  const iframe = document.querySelector<HTMLIFrameElement>(
    '[data-testid="auto-frame"]'
  );
  if (!iframe) return null;

  const iframeWindow = iframe.contentWindow;
  const iframeDocument = iframe.contentDocument;

  if (!iframeWindow || !iframeDocument) return null;

  return {
    iframe,
    window: iframeWindow,
    document: iframeDocument,
    body: iframeDocument.body,
  };
};
