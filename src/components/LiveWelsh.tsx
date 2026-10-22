'use client';

import { useLayoutEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/app/(public)/LanguageProvider';

// Live Welsh, the way Weglot works. With the site in Cymraeg, any English still on the page (news
// written only in English, the lunch menu, staff titles, pages with no Welsh yet) is swapped for Welsh
// from /api/welsh as the page shows it, and again whenever the page changes. Only the words change:
// React still owns every element, and switching back to English puts the English back.
// To keep something exactly as it is (a name, a code), give it translate="no".

// Staff areas stay exactly as staff wrote them
const STAFF_AREA = /^\/(admin|teacher|staff)(\/|$)/;
const SKIP = 'script, style, noscript, code, pre, textarea, svg, template, [translate="no"], [contenteditable=""], [contenteditable="true"]';
const ATTRIBUTES = ['placeholder', 'alt', 'title', 'aria-label'];
// The Welsh already fetched, kept on this device. Change the version to drop every device's copy
// (after correcting translations in Firestore's welshCache, for example).
const STORAGE_KEY = 'welsh-cache-v1';
const KEEP_ON_DEVICE = 3000;
// What one request to /api/welsh may hold, and how many go at once
const MAX_PIECES = 80;
const MAX_TOTAL = 15000;
const MAX_PIECE = 1500;
const AT_ONCE = 2;
// A safety stop, in case something on a page keeps making new text: at most this many pieces asked
// for in ten minutes
const MAX_ASKED = 1000;
const ASK_WINDOW_MS = 10 * 60_000;
// Pieces that got no Welsh are tried again after this long (a busy moment, the daily cap), or after
// SOON_MS when the server said it was still translating them (the first Welsh visit to a page)
const RETRY_MS = 2 * 60_000;
const SOON_MS = 15_000;
// Text React changes more than MAX_CHANGES times in CHANGE_WINDOW_MS is live (a score, a clock). It
// stays as it is until it has been still for LIVE_MS.
const MAX_CHANGES = 5;
const CHANGE_WINDOW_MS = 10_000;
const LIVE_MS = 60_000;
// Spaces around the words, kept exactly as they are (non-breaking ones too)
const EDGES = /^([ \t\n\f\r ]*)([\s\S]*?)([ \t\n\f\r ]*)$/;

type Swap = { en: string; cy: string };

const known = new Map<string, string>();          // English: its Welsh (the same text when it was Welsh already)
const failed = new Map<string, number>();         // English: when to try it again
const waiting = new Set<string>();                // asked for or about to be, no answer yet
const textSwaps = new Map<Text, Swap>();          // words on the page now showing our Welsh
const attributeSwaps = new Map<Element, Map<string, Swap>>();
const changes = new WeakMap<Node, { count: number; since: number; liveUntil: number }>();
const liveNodes = new Set<Text>();
let queued = new Set<string>();
let batches: string[][] = [];
let running = 0;
let queueTimer: number | undefined;
let saveTimer: number | undefined;
let pruneTimer: number | undefined;
let liveTimer: number | undefined;
let retryTimer: number | undefined;
let observer: MutationObserver | null = null;
let active = false;
let loaded = false;
let asked = { since: 0, count: 0 };

// The site's own Welsh is on the page too. Text that is plainly Welsh is not sent: no English words,
// and two different Welsh grammar words. Only grammar words count, never nouns, because names in
// English text are often Welsh ("Ysgol Croeso admissions"). Anything less sure is sent, and comes
// back unchanged if it was Welsh.
// (No lookbehind: iPhones before iOS 16.4 cannot read one, and the whole page would fail there.)
const WELSH_WORDS = /(^|[^\p{L}'’])(yn|yr|gyda|neu|hefyd|ddim|wedi|bydd|ydy|yw|i'r|o'r|a'r|eich|ein)(?=$|[^\p{L}'’])/giu;
const ENGLISH_WORDS = /\b(the|and|of|to|for|with|you|your|our|is|are|be|on|at|by|this|that|from|will|has|have|please|more|read|all|in|we|it|or|an)\b/i;
function looksWelsh(text: string) {
  if (ENGLISH_WORDS.test(text)) return false;
  return new Set([...text.matchAll(WELSH_WORDS)].map((m) => m[2].toLowerCase())).size >= 2;
}

// Worth sending: two letters in a row, not only a web or email address, and not plainly Welsh
const worthTranslating = (text: string) =>
  text.length <= MAX_PIECE && /\p{L}{2}/u.test(text) && !/^(https?:\/\/|www\.)\S+$/i.test(text)
  && !/^\S+@\S+\.\S+$/.test(text) && !looksWelsh(text);

const isFailed = (en: string) => (failed.get(en) ?? 0) > Date.now();

// The words without the spaces around them. Inside, spaces are made single the way the page shows
// them, unless the page keeps them (pre-wrap keeps everything, pre-line keeps line breaks, as on Events).
function partsOf(value: string, element: Element | null) {
  const [, lead, core, trail] = value.match(EDGES)!;
  let en = core;
  if (/[ \t\n\f\r]{2}|[\t\n\f\r]/.test(core)) {
    const space = element ? getComputedStyle(element).whiteSpace : 'normal';
    if (space === 'pre-line') en = core.replace(/[ \t\f\r]+/g, ' ');
    else if (!/^(pre|pre-wrap|break-spaces)$/.test(space)) en = core.replace(/[ \t\n\f\r]+/g, ' ');
  }
  return { lead, trail, en };
}

// Live text is looked at again once it has been still for LIVE_MS
function checkLive() {
  liveTimer = undefined;
  if (!active) return;
  const now = Date.now();
  const queue = new Set<string>();
  for (const node of liveNodes) {
    if (!node.isConnected) liveNodes.delete(node);
    else if ((changes.get(node)?.liveUntil ?? 0) <= now) {
      liveNodes.delete(node);
      handleText(node, queue, true);
    }
  }
  later(queue);
  if (liveNodes.size && liveTimer === undefined) liveTimer = window.setTimeout(checkLive, LIVE_MS / 2);
}

function noteChange(node: Text) {
  const now = Date.now();
  const seen = changes.get(node);
  if (seen && seen.liveUntil > now) {
    seen.liveUntil = now + LIVE_MS;
  } else if (!seen || now - seen.since > CHANGE_WINDOW_MS) {
    changes.set(node, { count: 1, since: now, liveUntil: 0 });
  } else if (++seen.count > MAX_CHANGES) {
    seen.liveUntil = now + LIVE_MS;
    watchLive(node);
  }
}

function watchLive(node: Text) {
  liveNodes.add(node);
  if (liveTimer === undefined) liveTimer = window.setTimeout(checkLive, LIVE_MS / 2);
}

function handleText(node: Text, queue: Set<string>, checkParents: boolean) {
  const value = node.nodeValue ?? '';
  const swap = textSwaps.get(node);
  if (swap && value === swap.cy) return;
  if (swap) textSwaps.delete(node);
  if (checkParents && (!node.parentElement || node.parentElement.closest(SKIP))) return;
  // Still live (also after switching language away and back): looked at again once it is quiet
  if ((changes.get(node)?.liveUntil ?? 0) > Date.now()) return watchLive(node);
  const { lead, trail, en } = partsOf(value, node.parentElement);
  if (!worthTranslating(en)) return;
  const cy = known.get(en);
  if (cy === undefined) {
    if (!isFailed(en)) queue.add(en);
    return;
  }
  if (cy === en) return;
  const shown = lead + cy + trail;
  textSwaps.set(node, { en: value, cy: shown });
  node.nodeValue = shown;
}

function handleAttributes(element: Element, queue: Set<string>, checkParents: boolean) {
  if (checkParents && element.closest(SKIP)) return;
  for (const name of ATTRIBUTES) {
    const value = element.getAttribute(name);
    const swaps = attributeSwaps.get(element);
    const swap = swaps?.get(name);
    if (swap && value === swap.cy) continue;
    if (swap) swaps!.delete(name);
    if (value === null) continue;
    const [, lead, en, trail] = value.match(EDGES)!;
    if (!worthTranslating(en)) continue;
    const cy = known.get(en);
    if (cy === undefined) {
      if (!isFailed(en)) queue.add(en);
      continue;
    }
    if (cy === en) continue;
    const shown = lead + cy + trail;
    if (!swaps) attributeSwaps.set(element, new Map());
    attributeSwaps.get(element)!.set(name, { en: value, cy: shown });
    element.setAttribute(name, shown);
  }
}

// Every word in and under this node, in page order
function scan(root: Node, queue: Set<string>) {
  if (root.nodeType === Node.TEXT_NODE) return handleText(root as Text, queue, true);
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const element = root as Element;
  if (element.closest(SKIP)) return;
  handleAttributes(element, queue, false);
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      node.nodeType === Node.ELEMENT_NODE && (node as Element).matches(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeType === Node.TEXT_NODE) handleText(node as Text, queue, false);
    else handleAttributes(node as Element, queue, false);
  }
}

function load() {
  if (loaded) return;
  loaded = true;
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    for (const [en, cy] of Object.entries(saved)) if (typeof cy === 'string') known.set(en, cy);
  } catch {}
}

function save() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries([...known].slice(-KEEP_ON_DEVICE))));
    } catch {}
  }, 1000);
}

// Pieces that got no Welsh are asked for again once their wait is over, while the page is open: the
// page is looked at again when the soonest wait ends, and then for the next one, until none is left
let retryAt = Infinity;
function retryLater() {
  const now = Date.now();
  let next = Infinity;
  for (const until of failed.values()) if (until > now && until < next) next = until;
  if (next >= retryAt) return;
  window.clearTimeout(retryTimer);
  retryAt = next;
  retryTimer = window.setTimeout(() => {
    retryTimer = undefined;
    retryAt = Infinity;
    if (!active) return;
    run(document.body);
    retryLater();
  }, next - now + 1000);
}

async function ask(pieces: string[]) {
  let missed = false;
  let wait = RETRY_MS;
  try {
    const res = await fetch('/api/welsh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts: pieces }),
    });
    const data = res.ok ? await res.json() : null;
    if (data?.pending === true) wait = SOON_MS;
    pieces.forEach((en, i) => {
      const cy = data?.texts?.[i];
      if (typeof cy === 'string' && cy) known.set(en, cy);
      else {
        failed.set(en, Date.now() + wait);
        missed = true;
      }
    });
  } catch {
    pieces.forEach((en) => failed.set(en, Date.now() + RETRY_MS));
    missed = true;
  } finally {
    pieces.forEach((en) => waiting.delete(en));
  }
  save();
  if (missed) retryLater();
}

// Sends the waiting batches, a few at a time. Each answer goes onto the page as soon as it is back.
function pump() {
  while (running < AT_ONCE && batches.length) {
    const batch = batches.shift()!;
    running++;
    ask(batch).finally(() => {
      running--;
      if (active) run(document.body);
      pump();
    });
  }
}

function send() {
  queueTimer = undefined;
  const now = Date.now();
  if (now - asked.since > ASK_WINDOW_MS) asked = { since: now, count: 0 };
  const eligible = [...queued].filter((en) => !known.has(en) && !isFailed(en) && !waiting.has(en));
  const room = Math.max(0, MAX_ASKED - asked.count);
  const pieces = eligible.slice(0, room);
  // Over the safety stop: the rest waits for the next ten minutes
  queued = new Set(eligible.slice(room));
  if (queued.size) queueTimer = window.setTimeout(send, asked.since + ASK_WINDOW_MS - now + 1000);
  if (!pieces.length) return;
  asked.count += pieces.length;
  let total = Infinity;
  for (const en of pieces) {
    waiting.add(en);
    if (total + en.length > MAX_TOTAL || batches[batches.length - 1].length >= MAX_PIECES) {
      batches.push([]);
      total = 0;
    }
    batches[batches.length - 1].push(en);
    total += en.length;
  }
  pump();
}

// Waits a moment, so text that arrives in parts (news loading) goes in one request
function later(queue: Set<string>) {
  if (!queue.size) return;
  queue.forEach((en) => queued.add(en));
  window.clearTimeout(queueTimer);
  queueTimer = window.setTimeout(send, 150);
}

function run(root: Node) {
  const queue = new Set<string>();
  scan(root, queue);
  later(queue);
}

// Forgets words that have left the page (moving to another page keeps the site in Cymraeg, so
// nothing else would let them go). At most once a second, however often things leave.
function prune() {
  pruneTimer = undefined;
  for (const node of textSwaps.keys()) if (!node.isConnected) textSwaps.delete(node);
  for (const element of attributeSwaps.keys()) if (!element.isConnected) attributeSwaps.delete(element);
}

function onChanges(records: MutationRecord[]) {
  const queue = new Set<string>();
  let removed = false;
  for (const record of records) {
    if (record.type === 'childList') {
      record.addedNodes.forEach((node) => scan(node, queue));
      removed ||= record.removedNodes.length > 0;
    } else if (record.type === 'characterData') {
      const node = record.target as Text;
      if (!node.isConnected || node.nodeValue === textSwaps.get(node)?.cy) continue;
      noteChange(node);
      handleText(node, queue, true);
    } else if (record.target.isConnected) {
      handleAttributes(record.target as Element, queue, true);
    }
  }
  later(queue);
  if (removed && pruneTimer === undefined) pruneTimer = window.setTimeout(prune, 1000);
}

function start() {
  if (active) return;
  active = true;
  load();
  observer = new MutationObserver(onChanges);
  observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRIBUTES });
  run(document.body);
  // Pieces still waiting for a retry (stop() dropped the timer when the visitor switched to English)
  retryLater();
}

// Puts the English back, except where React has already changed the words itself
function stop() {
  if (!active) return;
  active = false;
  observer?.disconnect();
  observer = null;
  for (const timer of [queueTimer, pruneTimer, liveTimer, retryTimer]) window.clearTimeout(timer);
  queueTimer = pruneTimer = liveTimer = retryTimer = undefined;
  retryAt = Infinity;
  queued = new Set();
  liveNodes.clear();
  // Batches not sent yet are dropped; ones already sent still fill in what they learn
  batches.forEach((batch) => batch.forEach((en) => waiting.delete(en)));
  batches = [];
  for (const [node, swap] of textSwaps) if (node.nodeValue === swap.cy) node.nodeValue = swap.en;
  textSwaps.clear();
  for (const [element, swaps] of attributeSwaps) {
    for (const [name, swap] of swaps) if (element.getAttribute(name) === swap.cy) element.setAttribute(name, swap.en);
  }
  attributeSwaps.clear();
}

export function LiveWelsh() {
  const { language } = useLanguage();
  const staffArea = STAFF_AREA.test(usePathname() ?? '');
  const on = language === 'cy' && !staffArea;

  // A layout effect runs straight after React changes the page and before the browser shows it, so
  // Welsh already fetched goes in with no flash of English, and English comes back the same way
  useLayoutEffect(() => {
    if (!on) return;
    start();
    return stop;
  }, [on]);

  return null;
}
