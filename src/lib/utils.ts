import { clsx, type ClassValue } from "clsx"
import { differenceInCalendarDays, format } from 'date-fns';
import { cy as cyLocale } from 'date-fns/locale';
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// The admin form takes plain text; news pages show it as HTML paragraphs.
// Escaping first means nothing typed into the form can run as code on the site.
const DAY_IN_WORDS = 'EEEE d MMMM yyyy';
const UK_DAY = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: 'numeric', day: 'numeric' });
const UK_HOUR = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: 'numeric', hourCycle: 'h23' });

// School dates are UK days, whatever time zone a visitor's device is in (a parent abroad would
// otherwise see an event a day out). This gives the UK calendar day of a saved time, as a
// local midnight that date-fns can format and compare.
export const ukDay = (when: string | Date) => {
  const parts = UK_DAY.formatToParts(new Date(when));
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return new Date(part('year'), part('month') - 1, part('day'));
};

// The UK clock time of an event ("6:00 PM"), to go with its UK day
const UK_TIME = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/London', hour: 'numeric', minute: '2-digit' });
export const ukTime = (when: string) => UK_TIME.format(new Date(when));

// Midday UK time on a picked calendar day, which is how all-day events are saved
export const ukMidday = (day: Date) => {
  const utcNoon = Date.UTC(day.getFullYear(), day.getMonth(), day.getDate(), 12);
  const ukHour = Number(UK_HOUR.format(new Date(utcNoon)));
  return new Date(utcNoon - (ukHour - 12) * 3_600_000).toISOString();
};

const validDate = (iso: string | undefined) => (iso && !isNaN(new Date(iso).getTime()) ? iso : null);

// An event's last UK day, when it runs over several days (null for a one-day event)
export const lastDayOf = (startIso: string, endIso: string | undefined) => {
  const start = validDate(startIso);
  const end = validDate(endIso);
  return start && end && differenceInCalendarDays(ukDay(end), ukDay(start)) > 0 ? ukDay(end) : null;
};

// Whether an event is still to come or still going on (its last UK day is today or later)
export const isStillOn = (event: { start: string; end?: string }, now: Date = new Date()) =>
  (lastDayOf(event.start, event.end) ?? ukDay(event.start)) >= ukDay(now);

// When an event happens, in words: "Tuesday 24 to Friday 27 November 2026", or one day.
// Welsh uses a dash, which needs no mutation: "dydd Mawrth 24 – dydd Gwener 27 Tachwedd 2026"
export const eventDays = (startIso: string, endIso: string | undefined, language: 'en' | 'cy') => {
  const options = language === 'cy' ? { locale: cyLocale } : undefined;
  const start = ukDay(startIso);
  const end = lastDayOf(startIso, endIso);
  if (!end) return format(start, DAY_IN_WORDS, options);
  const firstPattern = start.getFullYear() !== end.getFullYear() ? DAY_IN_WORDS
    : start.getMonth() !== end.getMonth() ? 'EEEE d MMMM' : 'EEEE d';
  return `${format(start, firstPattern, options)} ${language === 'cy' ? '–' : 'to'} ${format(end, DAY_IN_WORDS, options)}`;
};

// The same, short, for small spaces: "24–27 Nov", "30 Oct – 2 Nov", "20 Oct"
export const shortEventDays = (startIso: string, endIso: string | undefined, language: 'en' | 'cy') => {
  const options = language === 'cy' ? { locale: cyLocale } : undefined;
  const start = ukDay(startIso);
  const end = lastDayOf(startIso, endIso);
  if (!end) return format(start, 'd MMM', options);
  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
    return `${format(start, 'd')}–${format(end, 'd MMM', options)}`;
  }
  return `${format(start, 'd MMM', options)} – ${format(end, 'd MMM', options)}`;
};

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
