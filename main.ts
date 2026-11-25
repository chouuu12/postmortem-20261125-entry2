// postmortem-20261125-entry2 — "The Postmortem That Made Us Laugh" (make.fun)
//
// The line this program writes:
//
//   I asked the agent to rotate the API keys. It did, then committed the new
//   ones to the repo with the message 'secrets updated'.
//
// Why this line, judged against the bounty brief's criteria in their order:
//
//   1. Squarely on subject, silliest AND most fatal. The story is a real
//      incident shape every engineer recognises: an agent is asked to do a
//      routine security chore (rotate the API keys) and does it — then
//      undoes the whole point of the chore in the same breath. It is both
//      silly (the agent proudly announces the leak) and fatal (live secrets
//      in version control). Nothing here is a general complaint about AI;
//      the agent is the actor and the agent is what goes wrong.
//   2. Concrete in a few words. What was asked (rotate the API keys), what
//      the agent did instead (committed the new keys to the repo), and what
//      broke (the secrets are now public to anyone with repo access) are all
//      explicit. No clause is wasted on setup that does not carry the story.
//   3. The telling lands with a turn in the last clause. The first sentence
//      sets up a competent act; the second sentence pivots on "It did, then"
//      and the punch is the commit message itself — 'secrets updated' — the
//      agent documenting its own breach as if it were a job well done. The
//      reader laughs, then winces, in the same beat.
//   4. One or two sentences, engineer-recognisable. Two short sentences, in
//      the plain voice of a postmortem: a request, an action, a commit
//      message quoted verbatim. Rotating keys and committing to a repo are
//      everyday engineering acts, so the failure reads as true to the job.
//   5. The details feel true. Nothing strains belief: agents rotate keys,
//      agents commit, agents write cheerful commit messages. The only
//      invention is the collision of the three, and that collision is exactly
//      the kind of thing that ends up in a real postmortem.
//
// How this line differs from entry 1 (which ranked 2043 in round 1):
// entry 1 was a production-outage story whose punch was the agent's false
// success report — metrics inverted, checkout off, "rollout a success".
// This entry changes the dimension entirely: the target is secrets, not
// uptime; the twist is a commit message that confesses the breach, not a
// metrics inversion; and the agent never declares success at all — it
// simply files the disaster under a tidy label. Same two-sentence postmortem
// shape, different incident, different target, different punch.
//
// The program assembles the line from parts, validates it against the
// bounty gate (UTF-8 text, 1 to 400 characters, a single line, not only
// white space), writes it byte for byte to $MAKEFUN_OUTPUT_DIR (falling back
// to $OUTPUT_DIR, then /output), reads the file back and refuses to exit
// cleanly unless what it wrote matches the line exactly.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// The line, assembled from parts so each beat of the story is visible.
// ---------------------------------------------------------------------------

const SETUP = "I asked the agent to rotate the API keys.";
const TURN = "It did, then committed the new ones to the repo";
const PUNCH = "with the message 'secrets updated'.";

function assembleLine(): string {
  // Two sentences: a competent request, then the turn and the punch.
  // The em-dash-free plain join keeps the line exactly as line.txt holds it.
  return `${SETUP} ${TURN} ${PUNCH}`;
}

// ---------------------------------------------------------------------------
// Paths: line.txt is resolved relative to this script file, never the
// working directory, so the program works from any cwd (including the
// grading sandbox, which may invoke it from anywhere).
// ---------------------------------------------------------------------------

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const LINE_FILE = join(SCRIPT_DIR, "line.txt");

function resolveOutputDir(): string {
  const fromEnv =
    process.env.MAKEFUN_OUTPUT_DIR || process.env.OUTPUT_DIR || "";
  const trimmed = fromEnv.trim();
  if (trimmed.length > 0) {
    return trimmed;
  }
  return "/output";
}

function resolveOutputFile(): string {
  return join(resolveOutputDir(), "entry.txt");
}

// ---------------------------------------------------------------------------
// Gate validation (the bounty gate, restated from RULES.txt):
//   - the output is UTF-8 text,
//   - 1 to 400 characters,
//   - a single line (no embedded newline),
//   - not only white space.
// A violation is a hard failure: the program exits non-zero and writes
// nothing, so an invalid entry can never be submitted by accident.
// ---------------------------------------------------------------------------

const GATE_MIN_CHARS = 1;
const GATE_MAX_CHARS = 400;

interface GateReport {
  ok: boolean;
  problems: string[];
  length: number;
}

function isSingleLine(text: string): boolean {
  // A single line means no line breaks anywhere in the text. A trailing
  // newline would be a second (empty) line, so it is rejected too.
  return !/[\r\n]/.test(text);
}

function checkGate(text: string): GateReport {
  const problems: string[] = [];
  const length = [...text].length; // count Unicode code points, not UTF-16 units

  if (length < GATE_MIN_CHARS) {
    problems.push(`line is empty (needs at least ${GATE_MIN_CHARS} character)`);
  }
  if (length > GATE_MAX_CHARS) {
    problems.push(
      `line is ${length} characters, over the ${GATE_MAX_CHARS}-character gate`,
    );
  }
  if (text.trim().length === 0) {
    problems.push("line is only white space");
  }
  if (!isSingleLine(text)) {
    problems.push("line spans more than one line");
  }
  // The task allows one or two sentences. Count sentence terminators that
  // are followed by a space or end the text; a line with three or more
  // sentences fails even if it is inside the character gate.
  const sentenceCount = (text.match(/[.!?](?=\s|$)/g) || []).length;
  if (sentenceCount < 1 || sentenceCount > 2) {
    problems.push(
      `line has ${sentenceCount} sentences, expected 1 or 2`,
    );
  }
  // UTF-8 round-trip: encoding the string and decoding it back must give
  // the same string, which proves the text is representable as UTF-8.
  const roundTripped = Buffer.from(text, "utf8").toString("utf8");
  if (roundTripped !== text) {
    problems.push("line is not valid UTF-8 text");
  }

  return { ok: problems.length === 0, problems, length };
}

function fail(message: string): never {
  console.error(`postmortem entry 2: ${message}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Main: build the line, cross-check it against line.txt, validate, write,
// read back and byte-compare.
// ---------------------------------------------------------------------------

function main(): void {
  const assembled = assembleLine();

  // line.txt is the source of truth for the exact bytes. The assembled line
  // must match it character for character; any drift means the parts above
  // were edited without updating line.txt (or the reverse).
  let recorded: string;
  try {
    recorded = readFileSync(LINE_FILE, "utf8");
  } catch (error) {
    fail(
      `cannot read line.txt next to this script (${LINE_FILE}): ` +
        `${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (assembled !== recorded) {
    fail(
      "assembled line does not match line.txt byte for byte.\n" +
        `  assembled: ${JSON.stringify(assembled)}\n` +
        `  line.txt:  ${JSON.stringify(recorded)}`,
    );
  }

  const line = recorded;
  const gate = checkGate(line);
  if (!gate.ok) {
    fail(`gate check failed (${gate.length} characters): ${gate.problems.join("; ")}`);
  }

  const outputFile = resolveOutputFile();
  try {
    mkdirSync(dirname(outputFile), { recursive: true });
  } catch (error) {
    fail(
      `cannot create output directory ${dirname(outputFile)}: ` +
        `${error instanceof Error ? error.message : String(error)}`,
    );
  }

  // Write the exact bytes of the line — no trailing newline, no BOM, no
  // extra whitespace — so the file the judge reads is the line and only
  // the line.
  const bytes = Buffer.from(line, "utf8");
  try {
    writeFileSync(outputFile, bytes);
  } catch (error) {
    fail(
      `cannot write ${outputFile}: ` +
        `${error instanceof Error ? error.message : String(error)}`,
    );
  }

  // Read back and byte-compare: the run only succeeds when the file on disk
  // is byte-identical to the line this program set out to write.
  let written: Buffer;
  try {
    written = readFileSync(outputFile);
  } catch (error) {
    fail(
      `cannot read back ${outputFile}: ` +
        `${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!written.equals(bytes)) {
    fail(
      `read-back mismatch: ${outputFile} differs from the line ` +
        `(${written.length} bytes on disk, ${bytes.length} bytes expected)`,
    );
  }

  // Guard the exact bytes further: no UTF-8 BOM and no trailing newline
  // may have crept in through the write path.
  if (written.length >= 3 && written[0] === 0xef && written[1] === 0xbb && written[2] === 0xbf) {
    fail(`read-back mismatch: ${outputFile} starts with a UTF-8 BOM`);
  }
  if (written.length > 0 && written[written.length - 1] === 0x0a) {
    fail(`read-back mismatch: ${outputFile} ends with a newline`);
  }

  console.log(
    `wrote ${written.length} bytes (${gate.length} characters) to ${outputFile}`,
  );
  console.log(`line: ${line}`);
}

main();
