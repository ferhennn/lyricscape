// Scans public/tracks/ for audio files and (re)writes manifest.json.
// Reads ID3 / Vorbis tags when present; falls back to "Artist - Title.ext".
// Embedded cover art is extracted to public/tracks/.covers/<id>.<ext>.
// Existing manifest entries are preserved (hand edits win) and merged by file.

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, extname, basename } from "node:path";
import { parseFile } from "music-metadata";

const TRACKS_DIR = join(process.cwd(), "public", "tracks");
const COVERS_DIR = join(TRACKS_DIR, ".covers");
const MANIFEST = join(TRACKS_DIR, "manifest.json");
const AUDIO_EXT = new Set([".mp3", ".m4a", ".aac", ".ogg", ".oga", ".opus", ".wav", ".flac"]);

const slugify = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "") || "track";

// Strip the noise download sites bake into filenames / tag values.
function tidy(s) {
  return s
    .replace(/[_+]+/g, " ")
    .replace(/\((?:official\s*)?(?:music\s*)?(?:lyric[s]?|audio|video|visualizer|hd|hq|4k)\b[^)]*\)/gi, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\((?:mp3|mp3\.pm|mp3juices|y2mate|tubidy|[a-z0-9.]*\.(?:pm|com|net|cc|to))\)/gi, "")
    .replace(/\b(?:www\.)?[a-z0-9-]+\.(?:pm|com|net|cc|to)\b/gi, "")
    .replace(/\s*[-–—]\s*(?:youtube|topic|official)\s*$/i, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s._-]+|[\s._-]+$/g, "")
    .trim();
}

function fromFilename(name) {
  const base = tidy(name.replace(/\.[^.]+$/, ""));
  const m = base.match(/^(.+?)\s*[-–—]\s*(.+?)$/);
  if (m && m[1].trim() && m[2].trim()) {
    return { artist: m[1].trim(), title: m[2].trim() };
  }
  return { artist: "", title: base };
}

// Reject tags that were decoded with the wrong encoding: any C0/C1 control
// character (NUL, etc.) or the Unicode replacement char is a decode bug, and a
// string that is mostly rare-plane codepoints when we expected text is too.
function looksMisdecoded(str) {
  let control = 0;
  let exotic = 0;
  for (const ch of str) {
    const cp = ch.codePointAt(0);
    if ((cp <= 0x1f && cp !== 0x09) || (cp >= 0x7f && cp <= 0x9f) || cp === 0xfffd) control++;
    // CJK / Hangul / rare planes — unlikely in a mis-endianed Latin string only
    // if they dominate.
    if (cp >= 0x2e00 && cp <= 0xffef && !(cp >= 0x3000 && cp <= 0x303f)) exotic++;
  }
  if (control > 0) return true;
  return str.length >= 3 && exotic / str.length > 0.6;
}

function cleanTag(v) {
  if (typeof v !== "string") return "";
  const s = v.trim();
  if (!s || looksMisdecoded(s)) return "";
  return s;
}

async function main() {
  if (!existsSync(TRACKS_DIR)) {
    console.log("[tracks] no public/tracks directory - nothing to do");
    return;
  }

  let existing = [];
  if (existsSync(MANIFEST)) {
    try {
      existing = JSON.parse(await readFile(MANIFEST, "utf8"));
      if (!Array.isArray(existing)) existing = [];
    } catch {
      existing = [];
    }
  }
  const byFile = new Map(existing.map((e) => [e.file, e]));

  const dirents = await readdir(TRACKS_DIR, { withFileTypes: true });
  const audioFiles = dirents
    .filter((e) => e.isFile() && AUDIO_EXT.has(extname(e.name).toLowerCase()))
    .map((e) => e.name)
    .sort();

  const usedIds = new Set();
  const manifest = [];

  for (const file of audioFiles) {
    const prev = byFile.get(file) ?? {};
    let tagTitle = "";
    let tagArtist = "";
    let tagAlbum = "";
    let durationMs = prev.durationMs;
    let coverRel = prev.cover;

    try {
      const meta = await parseFile(join(TRACKS_DIR, file), { duration: true });
      const c = meta.common ?? {};
      tagTitle = cleanTag(c.title);
      tagArtist = cleanTag(c.artist || (c.artists && c.artists[0]));
      tagAlbum = cleanTag(c.album);
      if (meta.format?.duration) durationMs = Math.round(meta.format.duration * 1000);

      if (!coverRel && c.picture && c.picture[0]) {
        const pic = c.picture[0];
        const ext = (pic.format || "image/jpeg").includes("png") ? "png" : "jpg";
        const id = prev.id || slugify(file);
        await mkdir(COVERS_DIR, { recursive: true });
        const coverName = `${id}.${ext}`;
        await writeFile(join(COVERS_DIR, coverName), Buffer.from(pic.data));
        coverRel = `.covers/${coverName}`;
      }
    } catch (err) {
      console.warn(`[tracks] could not read tags for ${file}: ${err.message}`);
    }

    const guess = fromFilename(file);
    const artist = cleanTag(prev.artist) || tagArtist || guess.artist || "Unknown artist";
    const title = cleanTag(prev.title) || tagTitle || guess.title;

    let id = prev.id || slugify(`${tagArtist || guess.artist}-${tagTitle || guess.title}` || file);
    while (usedIds.has(id)) id = `${id}-2`;
    usedIds.add(id);

    const lrcCandidate = `${basename(file, extname(file))}.lrc`;
    const hasLrc = existsSync(join(TRACKS_DIR, lrcCandidate));

    manifest.push({
      id,
      file,
      title,
      artist,
      album: cleanTag(prev.album) || tagAlbum || "",
      durationMs: durationMs || 0,
      ...(coverRel ? { cover: coverRel } : {}),
      ...(prev.lrc ? { lrc: prev.lrc } : hasLrc ? { lrc: lrcCandidate } : {}),
      ...(prev.scene ? { scene: prev.scene } : {}),
    });
  }

  await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`[tracks] manifest: ${manifest.length} track(s)`);
  for (const t of manifest) console.log(`  - ${t.artist} - ${t.title}  (${t.file})`);
}

main().catch((err) => {
  console.error("[tracks] skipped:", err.message);
});
