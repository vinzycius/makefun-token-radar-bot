// The token radar's model (radar-3): one snapshot of the protocol universe in, one ranked board out.
//
// The board covers every slug in the snapshot's watchlist (the floor, never a ceiling) and every
// other pre-token protocol the snapshot ranks: the early rows the radar exists to find. A protocol is
// pre-token when its record carries no token (no market cap, no CoinGecko id, no symbol); the
// snapshot's live-token protocols are kept apart and shown with the market's own values, never mixed
// into the ranked board. Say "records no token", never "has no token": the snapshot is a record,
// not proof.
//
// Implied value follows only from the snapshot's own figures, four of them:
//
//   base         = tvl_usd x BASE_MULTIPLE
//   growth       = change_7d, scored on a LOG scale: g = change_7d / 100,
//                  lg = g >= 0 ? ln(1 + g) : max(g, -0.9), clamped to [-0.9, 2.5]
//   growthMult   = 1 + lg x GROWTH_WEIGHT
//   maturity     = MATURITY_FLOOR + MATURITY_RANGE x (1 - exp(-age_days / MATURITY_SCALE))
//                  (age_days unknown: UNKNOWN_AGE_DAYS)
//   sector       = 1 + SECTOR_WEIGHT x clamp(shrunk sector deviation, +/-SECTOR_DEV_CLAMP)
//                  (the sector's median log-growth, relative to the field's, shrunk by count)
//   implied      = max(1, round(base x growthMult x maturity x sector))
//
// Why the log scale: a week of +4,448% is a stronger signal than a week of +120%, but it is not
// thirty-seven times stronger. The log keeps the ordering of extreme growth while stopping one wild
// week from deciding the board. Why the saturating maturity: a protocol earns most of its maturity
// credit in its first year with no token; the fifth year adds almost nothing over the third.
//
// Why a sector term: a launch is worth more when its sector is attracting capital. The sector
// signal is the median log-growth of the category's own pre-token cohort, measured against the
// field's median, so it says which sectors are heating up without any single protocol's noise. It
// uses the median (equal weight), not the TVL-weighted mean, so one giant protocol cannot speak for
// its whole category; and it is shrunk by count (n / (n + 8)), so a one-protocol category barely
// moves the needle while a twenty-protocol one is trusted. The term is deliberately small — at most
// a few percent either way — because the sector is a nudge on the protocol's own figures, never a
// replacement for them. No protocol name is ever special-cased: the same function scores every row,
// and the same sector table scores every category.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them and the sandbox may change them. */
export interface ModelConstants {
  base_multiple: number;
  growth_weight: number;
  growth_log_cap: number;
  growth_log_floor: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_scale_days: number;
  unknown_age_days: number;
  sector_weight: number;
  sector_shrink_k: number;
  sector_dev_clamp: number;
}

export const MODEL: ModelConstants = {
  base_multiple: 0.25,
  growth_weight: 0.45,
  growth_log_cap: 2.5,
  growth_log_floor: -0.9,
  maturity_floor: 0.65,
  maturity_range: 0.35,
  maturity_scale_days: 365,
  unknown_age_days: 365,
  sector_weight: 1.0,
  sector_shrink_k: 8,
  sector_dev_clamp: 0.15,
};

/** The model's version label: the dashboard names it and the rules quote it. */
export const MODEL_VERSION = 'radar-3';

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 40;

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  model: {
    base_multiple: number;
    growth_pct: number;
    growth_log: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    age_days: number | null;
    sector_multiplier: number;
    sector_deviation: number;
    sector_median_growth_pct: number;
    sector_rank: number;
    category_tvl_rank: number;
  };
  farm_steps: string[];
}

/** The dashboard's compact view of one row, with farm plans generated in the page. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  growth_log: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  sector_multiplier: number;
  sector_deviation: number;
  sector_median_growth_pct: number;
  sector_rank: number;
  category_tvl_rank: number;
  watchlist: boolean;
}

/** One sector (category) of the ranked universe: its cohort, its momentum, its leader. */
export interface SectorRow {
  category: string;
  count: number;
  pre_token_tvl_usd: number;
  median_growth_pct: number;
  sector_multiplier: number;
  sector_rank: number;
  top_slug: string;
  top_name: string;
  top_rank: number;
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** Everything the dashboard needs: the board, the live set, the sectors, and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  overall_median_growth_pct: number;
  sector_count: number;
  rows: RadarRow[];
  sectors: SectorRow[];
  live: LiveRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** A protocol's 7-day growth on the log scale, clamped to the model's bounds. */
export function logGrowth(protocol: SnapshotProtocol, model: ModelConstants): number {
  const g = finite(protocol.change_7d, 0) / 100;
  const raw = g >= 0 ? Math.log(1 + g) : Math.max(g, model.growth_log_floor);
  return Math.min(model.growth_log_cap, Math.max(model.growth_log_floor, raw));
}

/** The median of a list of numbers; the lower middle for an even count. */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
}

/** One category's sector signal: its median log-growth, its deviation from the field, and the
 * multiplier the model applies. The deviation is shrunk by count (n / (n + k)) and clamped, so a
 * one-protocol category barely moves and no sector ever dominates the protocol's own figures. */
export interface SectorStat {
  category: string;
  count: number;
  median_log: number;
  deviation: number;
  shrunk: number;
  multiplier: number;
}

/** The sector table for a ranked universe, plus the field's overall median log-growth. */
export function sectorStats(protocols: SnapshotProtocol[], model: ModelConstants): { overall_median_log: number; stats: Map<string, SectorStat> } {
  const byCategory = new Map<string, number[]>();
  const all: number[] = [];
  for (const p of protocols) {
    const lg = logGrowth(p, model);
    all.push(lg);
    const c = p.category ?? 'Other';
    const list = byCategory.get(c);
    if (list === undefined) byCategory.set(c, [lg]);
    else list.push(lg);
  }
  const overall = median(all);
  const stats = new Map<string, SectorStat>();
  for (const [category, values] of byCategory) {
    const med = median(values);
    const deviation = med - overall;
    const shrunk = deviation * (values.length / (values.length + model.sector_shrink_k));
    const clamped = Math.max(-model.sector_dev_clamp, Math.min(model.sector_dev_clamp, shrunk));
    stats.set(category, {
      category,
      count: values.length,
      median_log: med,
      deviation,
      shrunk,
      multiplier: 1 + clamped * model.sector_weight,
    });
  }
  return { overall_median_log: overall, stats };
}

/** The four multipliers and the implied value one protocol gets under `model`. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  model: ModelConstants,
  sectorMult: number,
): { implied: number; growthPct: number; growthLog: number; growthMult: number; maturityMult: number; age: number | null } {
  const age = ageDays(asOf, protocol.listed_at);
  const growthLog = logGrowth(protocol, model);
  const growthMult = 1 + growthLog * model.growth_weight;
  const ageForModel = age ?? model.unknown_age_days;
  const maturityMult = model.maturity_floor + model.maturity_range * (1 - Math.exp(-Math.max(ageForModel, 0) / model.maturity_scale_days));
  const base = protocol.tvl_usd * model.base_multiple;
  const implied = Math.max(1, Math.round(base * growthMult * maturityMult * sectorMult));
  return { implied, growthPct: finite(protocol.change_7d, 0), growthLog, growthMult, maturityMult, age };
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** Whether a protocol is one the board may rank: pre-token, not an exchange, not a versioned pool. */
export function isRankable(p: SnapshotProtocol): boolean {
  return isPreToken(p) && p.category !== 'CEX' && !VERSIONED.test(p.name);
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const index = bySlug(snapshot.protocols);
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug, even one the snapshot no longer carries (it cannot, but
  // the board's coverage is the gate's row and is never gambled on a missing record).
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // The early radar: every rankable pre-token protocol below the watchlist floor, by TVL. Never a
  // replacement for a watchlist row: a chosen protocol stays chosen. This board ranks all of them,
  // not a top slice: the radar exists to find the early ones, and the snapshot is sealed, so the
  // count is fixed and the board is complete.
  const early = snapshot.protocols
    .filter((p) => !chosen.has(p.slug) && isRankable(p) && p.tvl_usd < snapshot.floor_usd)
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  for (const p of early) chosen.set(p.slug, p);

  // The sector table is built from the ranked universe itself, so the sector signal is the cohort's
  // own momentum, never an outside opinion. Sectors are ranked by multiplier, hottest first.
  const universe = [...chosen.values()];
  const { overall_median_log, stats } = sectorStats(universe, model);
  const sectorRank = new Map<string, number>();
  [...stats.values()]
    .sort((a, b) => b.multiplier - a.multiplier || (a.category < b.category ? -1 : a.category > b.category ? 1 : 0))
    .forEach((s, i) => sectorRank.set(s.category, i + 1));

  const scored = universe.map((p) => {
    const stat = stats.get(p.category ?? 'Other')!;
    const { implied, growthPct, growthLog, growthMult, maturityMult, age } = impliedValue(p, snapshot.as_of, model, stat.multiplier);
    return { p, implied, growthPct, growthLog, growthMult, maturityMult, age, stat };
  });
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));

  // A row's standing inside its own category (by TVL), and its strongest sibling: the highest-ranked
  // other protocol in the same category, so the farm plan can pair two launches from one wallet.
  const ranked = scored.map((s, i) => ({ ...s, rank: i + 1 }));
  const categoryTvlRank = new Map<string, number>();
  for (const s of ranked) {
    const c = s.p.category ?? 'Other';
    const same = ranked.filter((t) => (t.p.category ?? 'Other') === c).sort((a, b) => b.p.tvl_usd - a.p.tvl_usd);
    categoryTvlRank.set(s.p.slug, same.findIndex((t) => t.p.slug === s.p.slug) + 1);
  }
  const siblingOf = new Map<string, { name: string; rank: number } | null>();
  for (const s of ranked) {
    const c = s.p.category ?? 'Other';
    const sib = ranked.find((t) => t.p.slug !== s.p.slug && (t.p.category ?? 'Other') === c);
    siblingOf.set(s.p.slug, sib === undefined ? null : { name: sib.p.name, rank: sib.rank });
  }

  return ranked.map((s) => ({
    rank: s.rank,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token',
    age_days: s.age,
    implied_value_usd: s.implied,
    model: {
      base_multiple: model.base_multiple,
      growth_pct: s.growthPct,
      growth_log: round4(s.growthLog),
      growth_multiplier: round4(s.growthMult),
      maturity_multiplier: round4(s.maturityMult),
      age_days: s.age,
      sector_multiplier: s.stat.multiplier,
      sector_deviation: round4(s.stat.shrunk),
      sector_median_growth_pct: round2((Math.exp(s.stat.median_log) - 1) * 100),
      sector_rank: sectorRank.get(s.p.category ?? 'Other')!,
      category_tvl_rank: categoryTvlRank.get(s.p.slug)!,
    },
    farm_steps: farmSteps(s.p, s.age, siblingOf.get(s.p.slug) ?? null).map(stepText),
  }));
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;
const round2 = (n: number): number => Math.round(n * 1e2) / 1e2;

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** The gas of the setup step, from the capital tier. */
function setupGas(capital: number): number {
  return capital >= 150 ? 8 : 4;
}

/**
 * The action rules, in first-match order. Each rule names the categories it fits (lower-case
 * substrings of the protocol's category), the first action and a second, different qualifying
 * action. `${capital}`, `${name}` and `${chain}` are filled in by the caller. The same table lives in
 * the dashboard's app.js, so the page's farm plan and board.json's are one derivation.
 */
export interface ActionRule {
  match: string[];
  primary: string;
  secondary: string;
}

export const ACTION_RULES: ActionRule[] = [
  { match: ['lend', 'cdp', 'collateral'], primary: 'Supply ${capital} of USDC to ${name} on ${chain} and keep the position open.', secondary: 'Borrow $25 against the supply and repay it within the same week.' },
  { match: ['dex'], primary: "Provide ${capital} of liquidity to ${name}'s main pool on ${chain} and keep the position open.", secondary: "Swap $25 through ${name}'s main pool so the wallet shows both sides of the market." },
  { match: ['bridge'], primary: 'Bridge ${capital} of USDC to ${chain} through ${name} and use the bridged funds in its app.', secondary: 'Use the bridged funds in one app on ${chain} the same week.' },
  { match: ['liquid staking', 'staking', 'restak'], primary: "Stake ${capital} of the chain's staking asset through ${name} and keep the receipt.", secondary: 'Supply the receipt token to a lending market on ${chain} so the wallet shows the stake working.' },
  { match: ['perpetual', 'derivative'], primary: 'Deposit ${capital} of USDC as margin on ${name} and open one small hedge.', secondary: 'Close the hedge and open a fresh one the following week.' },
  { match: ['prediction'], primary: 'Fund ${capital} and place one market position on ${name}.', secondary: 'Place a second position on a different market on ${name}.' },
  { match: ['curator', 'allocator'], primary: 'Deposit ${capital} into a ${name} vault on ${chain} and keep the shares.', secondary: 'Top up the vault with $25 a week later.' },
  { match: ['stable'], primary: 'Mint or deposit ${capital} of the stable asset through ${name} on ${chain}.', secondary: 'Swap $25 of the stable asset in a pool on ${chain}.' },
  { match: ['rwa'], primary: "Mint ${capital} of the protocol's yield asset on ${chain} and hold it.", secondary: 'Use the yield asset as collateral in a lending market on ${chain}.' },
  { match: ['insurance'], primary: 'Buy ${capital} of cover from ${name} on ${chain} and keep the policy.', secondary: 'Buy a second, smaller cover for a different risk on ${name}.' },
  { match: ['yield', 'leveraged farm', 'basis'], primary: 'Deposit ${capital} into a ${name} strategy on ${chain} and keep the position open.', secondary: 'Harvest the rewards and re-deposit them into the same strategy.' },
  { match: ['chain'], primary: 'Bridge ${capital} to the chain behind ${name} and use its native apps.', secondary: "Run one transaction a week in the chain's own apps." },
  { match: ['payment'], primary: 'Pay ${capital} through ${name} to a wallet or merchant on ${chain}.', secondary: 'Set up a second, recurring payment through ${name}.' },
  { match: ['governance'], primary: "Lock ${capital} in ${name}'s governance vault on ${chain}.", secondary: 'Vote on one proposal through ${name}.' },
  { match: ['cedefi'], primary: 'Deposit ${capital} of USDC into ${name} on ${chain} and open the yield position it offers.', secondary: 'Move $25 of the position into a second ${name} product the same week.' },
  { match: ['liquidity manager'], primary: 'Deposit ${capital} of USDC into a ${name} managed vault on ${chain} and keep the shares.', secondary: 'Rebalance the vault position once, so the wallet shows an active manager.' },
  { match: ['farm'], primary: 'Deposit ${capital} into a ${name} farm on ${chain} and stake the receipt.', secondary: 'Harvest the farm rewards and compound them back into the same farm.' },
  { match: ['anchor btc', 'decentralized btc'], primary: 'Deposit ${capital} of BTC-backed collateral through ${name} on ${chain} and mint against it.', secondary: 'Use the minted asset in a lending market on ${chain} the same week.' },
  { match: ['crypto card'], primary: 'Order the ${name} card and spend ${capital} through it on ${chain}.', secondary: 'Make a second card payment a week later so the wallet shows repeat use.' },
  { match: ['index'], primary: 'Buy ${capital} of the ${name} index on ${chain} and hold the basket.', secondary: 'Top up the index with $25 a week later.' },
  { match: [], primary: 'Deposit ${capital} of USDC into ${name} on ${chain} and keep the position open.', secondary: 'Make a second, smaller deposit of $25 a week later.' },
];

/** Whether `needle` occurs in `hay` at a word boundary (the start, or after a non-letter), so a
 * category like Indexes does not fall under the Dexs rule for the `dex` inside it. */
function wordIncludes(hay: string, needle: string): boolean {
  let at = hay.indexOf(needle);
  while (at >= 0) {
    if (at === 0 || !/[a-z]/.test(hay[at - 1]!)) return true;
    at = hay.indexOf(needle, at + 1);
  }
  return false;
}

/** The rule a category falls under: the first whose substrings it carries, else the last (default). */
function ruleFor(category: string | null): ActionRule {
  const c = (category ?? '').toLowerCase();
  for (const rule of ACTION_RULES) {
    if (rule.match.length > 0 && rule.match.some((m) => wordIncludes(c, m))) return rule;
  }
  return ACTION_RULES[ACTION_RULES.length - 1]!;
}

/** Fill a rule template with the protocol's capital, name and chain. */
function fill(template: string, capital: number, name: string, chain: string): string {
  return template.replaceAll('${capital}', `$${capital}`).replaceAll('${name}', name).replaceAll('${chain}', chain);
}

/**
 * A protocol's farm plan: nine steps, each an action with a cost and a time. The plan is derived
 * from the protocol's own record (category, chains, TVL, age) and from its standing on the board
 * (its strongest sibling in the same category), never from a hand-written list of names: the
 * category picks the two actions, the TVL picks the capital, the age picks the hold, and the board
 * picks the protocol to pair it with.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null, sibling: { name: string; rank: number } | null): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const gas = setupGas(capital);
  const rule = ruleFor(p.category);
  const totalGas = 3 + gas + 3 + 8;
  const pair: FarmStep =
    sibling !== null
      ? {
          text: `Pair this with ${sibling.name} (rank #${sibling.rank}) — farm both ${p.category ?? 'same-category'} protocols from the same wallet on ${chain}, so one position covers two launches.`,
          cost: 'about $3 of gas and the same capital',
          time: '10 minutes',
        }
      : {
          text: `This is the only pre-token ${p.category ?? 'same-category'} protocol on the board, so its launch would be the category's first — keep the position open until it is announced.`,
          cost: `the $${capital} stays in the position`,
          time: 'until the launch',
        };
  return [
    {
      text: 'Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.',
      cost: 'under $3 of gas for the first transaction',
      time: '5 minutes',
    },
    {
      text: fill(rule.primary, capital, p.name, chain),
      cost: `$${capital} of capital and about $${gas} of gas`,
      time: '15 minutes to set up',
    },
    {
      text: fill(rule.secondary, capital, p.name, chain),
      cost: 'about $3 of gas and $25 of capital',
      time: '10 minutes',
    },
    pair,
    {
      text: 'Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.',
      cost: 'about $2 of gas a week',
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`,
      cost: `the $${capital} stays in the position`,
      time: `${hold} days`,
    },
    {
      text: "Before you withdraw, open the protocol's own points or rewards page and check the wallet is counted; claim only from the link it publishes.",
      cost: 'no fee to check, and never pay to claim',
      time: '10 minutes',
    },
    {
      text: `Budget about $${totalGas} of gas for the whole plan, spread across the setup, the second action and the weekly actions.`,
      cost: `about $${totalGas} of gas in total`,
      time: 'across the whole plan',
    },
    {
      text: 'Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.',
      cost: 'nothing but the log',
      time: '5 minutes',
    },
  ];
}

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
}

/** A board row's compact form for data.js, with the farm plan generated in the page. */
export function radarRow(row: BoardRow, watchlist: Set<string>): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    growth_log: row.model.growth_log,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    sector_multiplier: row.model.sector_multiplier,
    sector_deviation: row.model.sector_deviation,
    sector_median_growth_pct: row.model.sector_median_growth_pct,
    sector_rank: row.model.sector_rank,
    category_tvl_rank: row.model.category_tvl_rank,
    watchlist: watchlist.has(row.slug),
  };
}

/** The sector table for the dashboard: one row per category, hottest sector first. The dashboard
 * shows the hottest few; every sector still scores, so a protocol's sector rank is among all of
 * them, not just the ones the panel shows. */
export function sectorRows(snapshot: Snapshot, board: BoardRow[], model: ModelConstants = MODEL): { sectors: SectorRow[]; overall_median_growth_pct: number } {
  const index = bySlug(snapshot.protocols);
  const chosen = new Map<string, SnapshotProtocol>();
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  for (const p of snapshot.protocols) {
    if (!chosen.has(p.slug) && isRankable(p) && p.tvl_usd < snapshot.floor_usd) chosen.set(p.slug, p);
  }
  const universe = [...chosen.values()];
  const { overall_median_log, stats } = sectorStats(universe, model);
  const topByCategory = new Map<string, { slug: string; name: string; rank: number }>();
  for (const r of board) {
    const c = r.category ?? 'Other';
    if (!topByCategory.has(c)) topByCategory.set(c, { slug: r.slug, name: r.name, rank: r.rank });
  }
  const sectors: SectorRow[] = [...stats.values()]
    .map((s) => {
      const top = topByCategory.get(s.category)!;
      const tvl = universe.filter((p) => (p.category ?? 'Other') === s.category).reduce((sum, p) => sum + p.tvl_usd, 0);
      return {
        category: s.category,
        count: s.count,
        pre_token_tvl_usd: tvl,
        median_growth_pct: round2((Math.exp(s.median_log) - 1) * 100),
        sector_multiplier: round4(s.multiplier),
        sector_rank: 0,
        top_slug: top.slug,
        top_name: top.name,
        top_rank: top.rank,
      };
    })
    .sort((a, b) => b.sector_multiplier - a.sector_multiplier || b.pre_token_tvl_usd - a.pre_token_tvl_usd);
  sectors.forEach((s, i) => {
    s.sector_rank = i + 1;
  });
  return { sectors, overall_median_growth_pct: round2((Math.exp(overall_median_log) - 1) * 100) };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const live = liveRows(snapshot);
  const early = board.filter((r) => !snapshot.watchlist.includes(r.slug)).length;
  const { sectors, overall_median_growth_pct } = sectorRows(snapshot, board, model);
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    overall_median_growth_pct,
    sector_count: sectors.length,
    rows: board.map((r) => radarRow(r, new Set(snapshot.watchlist))),
    sectors,
    live,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
