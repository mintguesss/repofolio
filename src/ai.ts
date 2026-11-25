import Anthropic from "@anthropic-ai/sdk";
import type { Config } from "./schema.js";

/** Every place repofolio may call Claude. Each one can be switched off in `llm.features`. */
export const AI_FEATURES = ["summaries", "intros", "drafts", "competitors", "site"] as const;
export type AiFeature = (typeof AI_FEATURES)[number];

/** USD per million tokens [input, output]. Unknown models are priced like Opus 5.5 (the safe side for a budget). */
export const PRICES: Record<string, [number, number]> = {
  "claude-haiku-5-5": [0.1, 0.5],
  "claude-sonnet-5-5": [2, 10],
  "claude-sonnet-5": [2, 10],
  "claude-opus-5-5": [4, 20],
  "claude-fable-5-2": [8, 40],
};
const FALLBACK_PRICE: [number, number] = [4, 20];

export function priceOf(model: string): [number, number] {
  return PRICES[model] ?? FALLBACK_PRICE;
}

export interface UsageTotals { calls: number; input: number; output: number; usd: number }
export interface UsageMonth extends UsageTotals {
  /** YYYY-MM (UTC). */
  month: string;
  byFeature: Partial<Record<AiFeature, UsageTotals>>;
  byModel: Record<string, UsageTotals>;
  /** When the monthly budget stopped Claude calls this month. */
  cappedAt?: string;
}

/** The parts of a Messages API `usage` object repofolio bills on. */
export interface ApiUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
}

export function costOf(model: string, u: ApiUsage): number {
  const [inP, outP] = priceOf(model);
  const input = u.input_tokens + (u.cache_creation_input_tokens ?? 0) * 1.25 + (u.cache_read_input_tokens ?? 0) * 0.1;
  return (input * inP + u.output_tokens * outP) / 1_000_000;
}

const add = (t: UsageTotals | undefined, input: number, output: number, usd: number): UsageTotals => ({
  calls: (t?.calls ?? 0) + 1,
  input: (t?.input ?? 0) + input,
  output: (t?.output ?? 0) + output,
  usd: (t?.usd ?? 0) + usd,
});

/**
 * Decides whether a feature may call Claude (API key present, feature on, budget left),
 * which model it uses, and records what every call cost into the state's monthly usage.
 */
export class AiMeter {
  private _client?: Anthropic;
  private warned = false;
  constructor(
    private readonly config: Config,
    /** Monthly usage history (kept on the state branch); a fresh array when there's no state. */
    private readonly usage: UsageMonth[],
    private readonly env: Record<string, string | undefined> = process.env,
    private readonly log: (m: string) => void = () => {},
    private readonly now: () => Date = () => new Date(),
  ) {}

  get hasKey(): boolean {
    return !!(this.env.ANTHROPIC_API_KEY || this.env.ANTHROPIC_AUTH_TOKEN);
  }

  /** Feature switched on in the config (whatever the key and budget). */
  configured(f: AiFeature): boolean {
    const l = this.config.llm;
    return f === "summaries" ? l.enabled || l.features.summaries : l.features[f];
  }

  model(f: AiFeature): string {
    return this.config.llm.models[f] ?? this.config.llm.model;
  }

  get budget(): number {
    return this.config.llm.monthlyBudget;
  }

  month(): UsageMonth {
    const key = this.now().toISOString().slice(0, 7);
    let m = this.usage.find((x) => x.month === key);
    if (!m) {
      m = { month: key, calls: 0, input: 0, output: 0, usd: 0, byFeature: {}, byModel: {} };
      this.usage.push(m);
      this.usage.sort((a, b) => a.month.localeCompare(b.month));
      while (this.usage.length > 12) this.usage.shift();
    }
    return m;
  }

  overBudget(): boolean {
    return this.budget > 0 && this.month().usd >= this.budget;
  }

  /** May this feature call Claude right now? */
  allowed(f: AiFeature): boolean {
    if (!this.hasKey || !this.configured(f)) return false;
    if (this.overBudget()) {
      const m = this.month();
      m.cappedAt ??= this.now().toISOString();
      if (!this.warned) {
        this.log(`::warning::Claude budget reached ($${m.usd.toFixed(2)} of $${this.budget} this month): using templates and rules until next month. Raise llm.monthlyBudget to continue.`);
        this.warned = true;
      }
      return false;
    }
    return true;
  }

  client(): Anthropic {
    return (this._client ??= new Anthropic());
  }

  record(f: AiFeature, model: string, u: ApiUsage | undefined | null): void {
    if (!u) return;
    const usd = costOf(model, u);
    const input = u.input_tokens + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0);
    const m = this.month();
    Object.assign(m, add(m, input, u.output_tokens, usd));
    m.byFeature[f] = add(m.byFeature[f], input, u.output_tokens, usd);
    m.byModel[model] = add(m.byModel[model], input, u.output_tokens, usd);
  }
}
