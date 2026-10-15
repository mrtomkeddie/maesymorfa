import { clsx, type ClassValue } from "clsx"
import { format } from 'date-fns';
import { cy as cyLocale } from 'date-fns/locale';
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// The admin form takes plain text; news pages show it as HTML paragraphs.
// Escaping first means nothing typed into the form can run as code on the site.
// The day an event happens, in words: "Tuesday 20 October 2026" / "dydd Mawrth 20 Hydref 2026"
export const eventDay = (iso: string, language: 'en' | 'cy') =>
  format(new Date(iso), 'EEEE d MMMM yyyy', language === 'cy' ? { locale: cyLocale } : undefined);

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export function textToHtml(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .trim()
    .split(/\n\s*\n/)
    .filter((paragraph) => paragraph.trim())
    .map((paragraph) => `<p>${escapeHtml(paragraph.trim()).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

// Turns a saved post back into plain text for editing
export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .trim();
}

// Makes a saved post safe to show as HTML. Keeps only a few plain formatting tags with no
// attributes, drops every other tag and shows any stray < or > as text, so nothing in a post can
// run as code, even if someone writes to the database without going through the admin form.
const SAFE_TAG = /^<\/?(p|br|strong|em|b|i|ul|ol|li)\s*\/?>$/i;

export function safeHtml(html: string): string {
  return (html || '')
    .split(/(<[^>]*>)/g)
    .map((part) => {
      if (part.startsWith('<') && part.endsWith('>')) {
        return SAFE_TAG.test(part) ? part.replace(/\s+/g, '').toLowerCase() : '';
      }
      return part.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    })
    .join('');
}
