import { HTMLElement, Node, TextNode, parse } from 'node-html-parser';

export interface SanitizeHtmlOptions {
  allowedTags?: ReadonlySet<string>;
  allowedAttributes?: Readonly<Record<string, readonly string[]>>;
  allowDataAttributes?: boolean;
  enforceNoopener?: boolean;
}

const DEFAULT_ALLOWED_TAGS = new Set([
  'a',
  'abbr',
  'blockquote',
  'br',
  'code',
  'div',
  'em',
  'figure',
  'figcaption',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'img',
  'li',
  'mark',
  'ol',
  'p',
  'pre',
  'section',
  'small',
  'span',
  'strong',
  'sub',
  'sup',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'ul',
]);

const DEFAULT_ALLOWED_ATTRIBUTES: Readonly<Record<string, readonly string[]>> = {
  '*': ['class', 'aria-label', 'aria-hidden', 'role'],
  a: ['href', 'title', 'target', 'rel'],
  img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
  code: ['class'],
  pre: ['class'],
};

const VOID_ELEMENTS = new Set(['br', 'hr', 'img']);

const sanitizeUrl = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const decoded = decodeURIComponent(trimmed).trim();
    if (/^javascript:/i.test(decoded) || /^data:(?!image\/)/i.test(decoded)) {
      return null;
    }
  } catch {
    return null;
  }

  return trimmed;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const collectAllowedAttributes = (
  tag: string,
  options: SanitizeHtmlOptions,
): ReadonlySet<string> => {
  const attrs = new Set<string>();
  const base = options.allowedAttributes ?? DEFAULT_ALLOWED_ATTRIBUTES;
  for (const key of base['*'] ?? []) {
    attrs.add(key);
  }
  for (const key of base[tag] ?? []) {
    attrs.add(key);
  }

  return attrs;
};

const sanitizeAttributes = (
  element: HTMLElement,
  options: SanitizeHtmlOptions,
): string => {
  const tag = element.tagName.toLowerCase();
  const allowedAttrs = collectAllowedAttributes(tag, options);
  const sanitized: Record<string, { raw: string; value: string }> = {};

  for (const [nameRaw, valueRaw] of Object.entries(element.attributes)) {
    const name = nameRaw.toLowerCase();
    if (name.startsWith('on')) {
      continue;
    }

    const rawValue = valueRaw ?? '';

    if (name.startsWith('data-')) {
      if (!options.allowDataAttributes) {
        continue;
      }
      sanitized[name] = { raw: rawValue, value: escapeHtml(rawValue) };
      continue;
    }

    if (!allowedAttrs.has(name)) {
      continue;
    }

    let processedValue = rawValue;
    if (name === 'href' || name === 'src') {
      const safeUrl = sanitizeUrl(processedValue);
      if (!safeUrl) {
        continue;
      }
      processedValue = safeUrl;
    }

    sanitized[name] = { raw: processedValue, value: escapeHtml(processedValue) };
  }

  const targetAttr = sanitized.target;
  if (targetAttr && targetAttr.raw === '_blank' && options.enforceNoopener !== false) {
    const relAttr = sanitized.rel?.raw ?? element.getAttribute('rel') ?? '';
    const tokens = relAttr
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean);
    if (!tokens.some((token) => token.toLowerCase() === 'noopener')) {
      tokens.push('noopener');
    }
    const combined = tokens.join(' ');
    sanitized.rel = { raw: combined, value: escapeHtml(combined) };
  }

  const entries = Object.entries(sanitized);
  if (entries.length === 0) {
    return '';
  }

  const rendered = entries
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, attr]) => `${name}="${attr.value}"`)
    .join(' ');

  return ` ${rendered}`;
};

const sanitizeNode = (node: Node, options: SanitizeHtmlOptions): string => {
  if (node.nodeType === 3) {
    return escapeHtml((node as TextNode).rawText);
  }

  if (!(node instanceof HTMLElement)) {
    return '';
  }

  const tag = node.tagName.toLowerCase();
  if (tag === 'script' || tag === 'style') {
    return ' ';
  }

  const allowedTags = options.allowedTags ?? DEFAULT_ALLOWED_TAGS;
  const childrenSanitized = node.childNodes
    .map((child) => sanitizeNode(child, options))
    .join('');

  if (!allowedTags.has(tag)) {
    return childrenSanitized;
  }

  const attributes = sanitizeAttributes(node, options);

  if (VOID_ELEMENTS.has(tag)) {
    return `<${tag}${attributes}>`;
  }

  return `<${tag}${attributes}>${childrenSanitized}</${tag}>`;
};

export const sanitizeHtml = (html: string, options: SanitizeHtmlOptions = {}): string => {
  if (!html.trim()) {
    return '';
  }

  const root = parse(html, {
    lowerCaseTagName: true,
    comment: false,
    blockTextElements: {
      script: true,
      style: true,
    },
  });

  return root.childNodes
    .map((child) => sanitizeNode(child, options))
    .join('')
    .trim();
};
