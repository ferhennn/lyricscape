// LRC parser.
// Supports [mm:ss.xx] and [mm:ss.xxx] timestamps, multiple timestamps per line,
// enhanced (word-level) <mm:ss.xx> tags, and [tag:value] metadata headers.

import type { LyricLine, LyricWord, Lyrics } from "@/types";

const LINE_TIME = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
const WORD_TIME = /<(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?>/g;
const META = /^\[([a-z]+):(.*)\]$/i;

function toSeconds(min: string, sec: string, frac?: string): number {
  let f = 0;
  if (frac) f = parseInt(frac.padEnd(3, "0").slice(0, 3), 10) / 1000;
  return parseInt(min, 10) * 60 + parseInt(sec, 10) + f;
}

interface RawLine {
  time: number;
  text: string;
  words: LyricWord[];
}

function parseWords(raw: string, lineStart: number): { text: string; words: LyricWord[] } {
  WORD_TIME.lastIndex = 0;
  if (!WORD_TIME.test(raw)) {
    return { text: raw.trim(), words: [] };
  }
  WORD_TIME.lastIndex = 0;
  const words: LyricWord[] = [];
  let cursor = 0;
  let lastTime = lineStart;
  let pendingText = "";
  let m: RegExpExecArray | null;
  const flush = (end: number) => {
    const t = pendingText.trim();
    if (t) words.push({ text: t, start: lastTime, end, estimated: false });
    pendingText = "";
  };
  while ((m = WORD_TIME.exec(raw)) !== null) {
    pendingText += raw.slice(cursor, m.index);
    const time = toSeconds(m[1], m[2], m[3]);
    flush(time);
    lastTime = time;
    cursor = m.index + m[0].length;
  }
  pendingText += raw.slice(cursor);
  flush(lastTime + 1.2);
  const text = words.map((w) => w.text).join(" ");
  return { text, words };
}

export interface ParsedLrc {
  meta: Record<string, string>;
  lines: RawLine[];
}

export function parseLrc(source: string): ParsedLrc {
  const meta: Record<string, string> = {};
  const lines: RawLine[] = [];

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (!line) continue;

    const metaMatch = line.match(META);
    if (metaMatch && !/^\d/.test(metaMatch[2].trim())) {
      // Header like [ar:Artist]; ignore [offset] handled below.
      meta[metaMatch[1].toLowerCase()] = metaMatch[2].trim();
      if (metaMatch[1].toLowerCase() !== "offset") continue;
    }

    LINE_TIME.lastIndex = 0;
    const stamps: number[] = [];
    let m: RegExpExecArray | null;
    while ((m = LINE_TIME.exec(line)) !== null) {
      stamps.push(toSeconds(m[1], m[2], m[3]));
    }
    if (stamps.length === 0) continue;

    const body = line.replace(LINE_TIME, "").trim();
    for (const time of stamps) {
      const { text, words } = parseWords(body, time);
      lines.push({ time, text, words });
    }
  }

  const offset = meta.offset ? parseInt(meta.offset, 10) / 1000 : 0;
  if (offset) {
    for (const l of lines) {
      l.time = Math.max(0, l.time - offset);
      for (const w of l.words) {
        w.start = Math.max(0, w.start - offset);
        w.end = Math.max(0, w.end - offset);
      }
    }
  }

  lines.sort((a, b) => a.time - b.time);
  return { meta, lines };
}

/** Estimate word timings from a line-level lyric, weighting by word length. */
export function estimateWords(text: string, start: number, end: number): LyricWord[] {
  const tokens = text.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  const total = Math.max(0.4, end - start);
  const weights = tokens.map((t) => Math.max(1, t.replace(/[^\p{L}\p{N}]/gu, "").length));
  const sum = weights.reduce((a, b) => a + b, 0);
  let cursor = start;
  return tokens.map((t, i) => {
    const dur = (weights[i] / sum) * total;
    const word: LyricWord = {
      text: t,
      start: cursor,
      end: cursor + dur,
      estimated: true,
    };
    cursor += dur;
    return word;
  });
}

export interface BuildLyricsOptions {
  source: Lyrics["source"];
  songDuration: number;
  /** Optional section lookup by time (seconds). */
  sectionAt?: (t: number) => LyricLine["section"];
  /** Optional per-line demo annotations keyed by line index. */
  annotations?: Array<Pick<LyricLine, "emphasis" | "preset" | "section"> | undefined>;
}

export function buildLyrics(parsed: ParsedLrc, opts: BuildLyricsOptions): Lyrics {
  const { lines: raw } = parsed;
  if (raw.length === 0) {
    return { lines: [], synced: false, wordLevel: false, source: "none" };
  }

  const wordLevel = raw.some((l) => l.words.length > 0);
  const lines: LyricLine[] = raw.map((l, i) => {
    const next = raw[i + 1];
    const endTimestamp = next ? next.time : Math.max(l.time + 4, opts.songDuration || l.time + 4);
    const ann = opts.annotations?.[i];
    let words = l.words;
    const instrumental = l.text.trim() === "" || /^[♪♫•·\-–—\s]+$/.test(l.text.trim());
    if (words.length === 0 && !instrumental) {
      words = estimateWords(l.text, l.time, Math.min(endTimestamp, l.time + 6));
    }
    return {
      id: `line-${i}`,
      timestamp: l.time,
      endTimestamp,
      text: l.text,
      words,
      instrumental,
      section: ann?.section ?? opts.sectionAt?.(l.time),
      emphasis: ann?.emphasis,
      preset: ann?.preset,
    };
  });

  return {
    lines,
    synced: true,
    wordLevel,
    source: opts.source,
    language: parsed.meta.la || parsed.meta.language,
  };
}

export function plainTextLyrics(text: string): Lyrics {
  const lines = text
    .split(/\r?\n/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map<LyricLine>((t, i) => ({
      id: `line-${i}`,
      timestamp: 0,
      endTimestamp: 0,
      text: t,
      words: [],
    }));
  return {
    lines,
    synced: false,
    wordLevel: false,
    source: "lrclib",
    plainText: text,
  };
}
