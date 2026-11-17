import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const directory = path.join(process.cwd(), ".tcs-runtime", "music");
const safeId = (id: string) => /^[a-zA-Z0-9-]{1,100}$/.test(id);
const fileFor = (id: string) => path.join(directory, `${id}.mp3`);

export async function saveMusicFile(id: string, audio: Uint8Array) {
  if (!safeId(id)) throw new Error("音源IDが不正です。");
  await mkdir(directory, { recursive: true });
  await writeFile(fileFor(id), audio);
}

export async function readMusicFile(id: string) {
  if (!safeId(id)) return undefined;
  try { return new Uint8Array(await readFile(fileFor(id))); } catch { return undefined; }
}
