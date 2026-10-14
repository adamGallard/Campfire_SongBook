/**
 * The OAS book's content: Scouts Australia's Outdoor Adventure Skills, read
 * from the templates Scouts | Terrain itself is built from
 * (templates.terrain.scouts.com.au), the same source ScoutBase syncs from.
 *
 * Nothing is copied into this repo or the database. The home page reads the
 * templates when it is built, and Next keeps each one for a day before asking
 * Terrain again, so a change Scouts Australia make reaches the book within a
 * day without a deploy.
 *
 * Anything unexpected (a template that will not load, a part of a stage this
 * code does not know) throws. At build time that fails the deploy; when the
 * page is refreshed in the background, Next keeps serving the last good copy.
 * Either way a half-read book is never shown.
 */

const BASE = 'https://templates.terrain.scouts.com.au';
const DAY = 24 * 60 * 60;
const USER_AGENT = 'ScoutBase OAS (+https://oas.scoutbase.app)';

/** How many templates are asked for at once. */
const BATCH = 12;

/**
 * Every stream, the three core streams first, then the six specialist ones.
 * Terrain lists each stream's tree under its slug.
 */
const STREAMS: { slug: string; core: boolean }[] = [
  { slug: 'bushcraft', core: true },
  { slug: 'bushwalking', core: true },
  { slug: 'camping', core: true },
  { slug: 'alpine', core: false },
  { slug: 'aquatics', core: false },
  { slug: 'boating', core: false },
  { slug: 'cycling', core: false },
  { slug: 'paddling', core: false },
  { slug: 'vertical', core: false },
];

/** The plan–do–review cycle every stage is written in. */
export type OasPart = 'plan' | 'do' | 'review';

/** One "I can…" statement and the guidance a leader reads when verifying it. */
export interface OasStatement {
  /** Terrain's id. Unique within a stage, but not across stages. */
  id: string;
  part: OasPart;
  text: string;
  /** Plain text: blank lines between paragraphs, "* " starting a list item. */
  details: string;
}

/** One stage of one stream, as one Terrain template. */
export interface OasStage {
  /** The template's address on Terrain: "aquatics/life-saving/5". */
  key: string;
  stream: string;
  /** The activity at this stage ("life-saving"); the stream's own slug for stages 1 to 3. */
  branch: string;
  branchTitle: string;
  stage: number;
  statements: OasStatement[];
  /** The stage's sign-off lines: "My logbook is up to date at the end of this stage." */
  verify: string[];
  /** When Scouts Australia last changed the template (ISO date), if Terrain said. */
  updated: string | null;
}

/**
 * One way through a stream from Stage 1 to Stage 9: Aquatics, then Life
 * Saving, then Swift Water Rescue. A stream with no activities has one.
 */
export interface OasPath {
  /** The last stage's address without the stage: "aquatics/life-saving/swift-water-rescue". */
  key: string;
  stream: string;
  /** The activities after the shared early stages: "Life Saving → Swift Water Rescue". */
  label: string;
  /** Its stages' keys, Stage 1 first. */
  stages: string[];
}

export interface OasStream {
  slug: string;
  title: string;
  description: string;
  core: boolean;
}

export interface OasBook {
  streams: OasStream[];
  /** Stream by stream, in stage order, and in Terrain's order within a stage. */
  stages: OasStage[];
  paths: OasPath[];
  /** When the templates were last read from Terrain (ISO). */
  checkedAt: string;
}

interface TreeNode {
  branch_id: string;
  title: string;
  stage: number;
  template_link: string;
  children?: TreeNode[];
}

interface Tree {
  title: string;
  description: string;
  tree: TreeNode;
}

interface TemplateDocument {
  input_groups?: {
    title?: string;
    inputs?: { id?: string; type?: string; label?: string; dialog_text?: string }[];
  }[];
}

interface Template {
  meta?: { stage?: number; stream?: string };
  /** One document, or a list holding one. */
  document?: TemplateDocument | TemplateDocument[];
}

interface Fetched<T> {
  body: T;
  lastModified: string | null;
  date: string | null;
}

async function getJson<T>(path: string): Promise<Fetched<T>> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt) await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
    try {
      const res = await fetch(`${BASE}/${path}`, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        next: { revalidate: DAY },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        lastError = new Error(`HTTP ${res.status}`);
        continue;
      }
      return {
        body: (await res.json()) as T,
        lastModified: res.headers.get('last-modified'),
        date: res.headers.get('date'),
      };
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`[oas] could not read ${BASE}/${path}`, { cause: lastError });
}

/** "oas/aquatics/life-saving/4/latest.json" → "aquatics/life-saving/4". Anything else is refused. */
function stageKey(link: string): string {
  const match = /^oas\/((?:[a-z0-9-]+\/)+[1-9])\/latest\.json$/.exec(link);
  if (!match) throw new Error(`[oas] unexpected template link: ${link}`);
  return match[1];
}

/** Terrain's text with its stray spaces and non-breaking spaces taken out. */
function tidy(text: unknown): string {
  return String(text ?? '')
    .replace(/ /g, ' ')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** "Plan>" → "plan". Verify holds the sign-off, not statements. */
function partOf(title: unknown): OasPart | 'verify' | null {
  const t = tidy(title).replace(/>$/, '').trim().toLowerCase();
  return t === 'plan' || t === 'do' || t === 'review' || t === 'verify' ? t : null;
}

function readTemplate(
  key: string,
  node: TreeNode,
  stream: string,
  { body, lastModified }: Fetched<Template>,
): OasStage {
  const doc = Array.isArray(body.document) ? body.document[0] : body.document;
  if (!doc?.input_groups?.length) throw new Error(`[oas] ${key} has no statements`);
  if (body.meta?.stage !== node.stage) throw new Error(`[oas] ${key} says it is not Stage ${node.stage}`);

  const statements: OasStatement[] = [];
  const ids = new Set<string>();
  const verify: string[] = [];
  for (const group of doc.input_groups) {
    const part = partOf(group.title);
    for (const input of group.inputs ?? []) {
      if (part === 'verify') {
        if (input.type === 'checkbox' && input.label) verify.push(tidy(input.label));
        continue;
      }
      if (input.type !== 'verifiable_checkbox') continue;
      if (!part) throw new Error(`[oas] ${key} has statements under "${group.title}"`);
      const text = tidy(input.label);
      if (!input.id || !text) throw new Error(`[oas] ${key} has a statement with no id or words`);
      // The page keys statements by stage and id.
      if (ids.has(input.id)) throw new Error(`[oas] ${key} has ${input.id} twice`);
      ids.add(input.id);
      statements.push({ id: input.id, part, text, details: tidy(input.dialog_text) });
    }
  }
  if (!statements.length) throw new Error(`[oas] ${key} has no statements`);

  const updated = lastModified ? new Date(lastModified) : null;
  return {
    key,
    stream,
    branch: node.branch_id,
    branchTitle: tidy(node.title),
    stage: node.stage,
    statements,
    verify,
    updated: updated && !Number.isNaN(updated.getTime()) ? updated.toISOString() : null,
  };
}

/** Every stage of every stream, its paths, and when Terrain was last asked. */
export async function loadOas(): Promise<OasBook> {
  const trees = await Promise.all(STREAMS.map((s) => getJson<Tree>(`oas/${s.slug}/tree.json`)));

  const streams: OasStream[] = [];
  const nodes = new Map<string, { node: TreeNode; stream: string }>();
  const paths: OasPath[] = [];
  const dates: (string | null)[] = trees.map((t) => t.date);

  trees.forEach(({ body }, i) => {
    const stream = STREAMS[i].slug;
    if (!body?.tree?.template_link) throw new Error(`[oas] the ${stream} tree is empty`);
    streams.push({
      slug: stream,
      title: tidy(body.title) || stream,
      description: tidy(body.description),
      core: STREAMS[i].core,
    });

    // Walk the tree: every node is a stage, every leaf the end of a path.
    const walk = (node: TreeNode, chain: TreeNode[]) => {
      const here = [...chain, node];
      const key = stageKey(node.template_link);
      if (nodes.has(key)) throw new Error(`[oas] ${key} is in the tree twice`);
      nodes.set(key, { node, stream });
      if (node.children?.length) {
        node.children.forEach((child) => walk(child, here));
        return;
      }
      // The activities after the shared stages, each named once: "Canoeing", not "Canoeing → Canoeing".
      const titles = here
        .filter((n) => n.branch_id !== stream)
        .map((n) => tidy(n.title))
        .filter((title, j, all) => title !== all[j - 1]);
      paths.push({
        key: key.replace(/\/[1-9]$/, ''),
        stream,
        label: titles.join(' → ') || tidy(body.title),
        stages: here.map((n) => stageKey(n.template_link)),
      });
    };
    walk(body.tree, []);
  });

  const queue = [...nodes];
  const stages: OasStage[] = [];
  for (let i = 0; i < queue.length; i += BATCH) {
    const batch = queue.slice(i, i + BATCH);
    const templates = await Promise.all(
      batch.map(([, { node }]) => getJson<Template>(node.template_link)),
    );
    templates.forEach((template, j) => {
      const [key, { node, stream }] = batch[j];
      dates.push(template.date);
      stages.push(readTemplate(key, node, stream, template));
    });
  }

  // Stream by stream, then stage by stage; within a stage, the order the tree gave.
  const rank = new Map(streams.map((s, i) => [s.slug, i]));
  const order = new Map(queue.map(([key], i) => [key, i]));
  stages.sort(
    (a, b) =>
      (rank.get(a.stream) ?? 0) - (rank.get(b.stream) ?? 0) ||
      a.stage - b.stage ||
      (order.get(a.key) ?? 0) - (order.get(b.key) ?? 0),
  );

  // The oldest answer is how fresh the whole book is.
  const times = dates
    .map((d) => (d ? new Date(d).getTime() : NaN))
    .filter((t) => Number.isFinite(t));
  const checkedAt = new Date(times.length ? Math.min(...times) : Date.now()).toISOString();

  return { streams, stages, paths, checkedAt };
}
