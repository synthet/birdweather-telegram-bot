const HTML_ESCAPE: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
};

export function escapeTelegramHtml(text: string): string {
  return text.replace(/[&<>]/g, (ch) => HTML_ESCAPE[ch] ?? ch);
}

export function telegramHtmlLink(label: string, url: string): string {
  return `<a href="${url.replace(/"/g, '%22')}">${escapeTelegramHtml(label)}</a>`;
}
