type MessageContent = {
  text?: { body?: string };
  template?: string;
  button?: { text?: string };
  interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } };
};

export function messagePreview(content: unknown, type?: string) {
  const value = (content ?? {}) as MessageContent;
  return value.text?.body
    || value.button?.text
    || value.interactive?.button_reply?.title
    || value.interactive?.list_reply?.title
    || (value.template ? `Template: ${value.template}` : type);
}
