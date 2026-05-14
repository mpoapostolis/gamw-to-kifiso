/**
 * THE CLEANERS — central game state.
 *
 * One singleton. Holds the only mutable state the game cares about across
 * scenes: which day it is, how much truth the player has accumulated, the
 * fragments they've spotted, the journal they keep writing in, and the
 * flags that determine which ending they reach.
 *
 * Persisted to localStorage on every mutation so the player can close the
 * tab and come back. A dev-only "scrub day" helper lets us jump to any day
 * during development.
 *
 * Notes for future code:
 *   • `awareness` is hidden from the HUD. The player NEVER sees a number.
 *     Internal code reads it to decide which dialogue choices to show and
 *     how much chromatic-aberration to apply to fragment-bearing objects.
 *   • `fragmentsFound` is the only journal-visible measure of progress.
 *   • `journalEntries` is what survives the nightly wipe. The notebook is
 *     the closest thing to a soul in this game — see design doc §7/§12.
 */

export interface JournalEntry {
  /** in-game day the entry was written */
  day: number;
  /** body text — first-person, what the player saw */
  text: string;
  /** real-world ms when it was committed; orders entries within a day */
  ts: number;
  /** if this entry came from a fragment, the fragment id */
  fragmentId?: string;
}

export interface GameStateData {
  /** 1…7 in the canonical arc; design doc §3 */
  dayIndex: number;
  /** hidden stat, 0…100. Raised by fragment events. */
  awareness: number;
  /** ids of fragments the player has surfaced — never goes down */
  fragmentsFound: string[];
  /** persistent notebook entries across days */
  journalEntries: JournalEntry[];
  /** late-game ending decisions — see design doc §8 */
  endingFlags: Record<string, boolean>;
  /** the player's name — defaults to "Elias" until they set it */
  playerName: string;
  /** real-world ms timestamp of last save (for the load menu) */
  lastSaveAt: number;
}

const LS_KEY = "the_cleaners_save_v1";

const DEFAULT_STATE: GameStateData = {
  dayIndex: 1,
  awareness: 0,
  fragmentsFound: [],
  journalEntries: [],
  endingFlags: {},
  playerName: "Elias",
  lastSaveAt: 0,
};

type Listener = (s: GameStateData) => void;

class GameStateClass {
  private data: GameStateData = { ...DEFAULT_STATE };
  private listeners: Set<Listener> = new Set();

  /** Read-only snapshot. Mutating the returned object won't persist. */
  get state(): Readonly<GameStateData> {
    return this.data;
  }

  /** Subscribe to every mutation. Returns unsubscribe. */
  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Hydrate from localStorage. Called once from BootScene. */
  load(): void {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<GameStateData>;
      this.data = { ...DEFAULT_STATE, ...parsed };
    } catch {
      // corrupt save — fall back to defaults. Don't crash the game.
      this.data = { ...DEFAULT_STATE };
    }
  }

  /** Reset to a fresh Day 1. Used by "new game". */
  reset(): void {
    this.data = { ...DEFAULT_STATE };
    this.save();
  }

  private save(): void {
    this.data.lastSaveAt = Date.now();
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(this.data));
    } catch {
      /* storage full / private mode — game continues, save is best-effort */
    }
    for (const fn of this.listeners) fn(this.data);
  }

  /** Has the player saved at least once? Drives "continue" vs "new". */
  hasSave(): boolean {
    return this.data.lastSaveAt > 0;
  }

  /* ------------------------------------------------------------------ *
   * MUTATIONS                                                          *
   * Each one persists immediately so a tab-close never loses progress. *
   * ------------------------------------------------------------------ */

  /** Add a fragment by id. If already found, raises awareness only the first time. */
  addFragment(id: string, awarenessDelta = 1): boolean {
    if (this.data.fragmentsFound.includes(id)) return false;
    this.data.fragmentsFound.push(id);
    this.data.awareness = Math.min(100, this.data.awareness + awarenessDelta);
    this.save();
    return true;
  }

  /** Bump awareness directly (e.g. from a dialogue choice). */
  raiseAwareness(by: number): void {
    this.data.awareness = Math.max(0, Math.min(100, this.data.awareness + by));
    this.save();
  }

  /** Add a journal entry. Persists across days even though the character "shouldn't" remember. */
  addJournalEntry(text: string, opts: { fragmentId?: string } = {}): void {
    this.data.journalEntries.push({
      day: this.data.dayIndex,
      text,
      ts: Date.now(),
      fragmentId: opts.fragmentId,
    });
    this.save();
  }

  /** Set a story flag (e.g. saw_first_cleaner, chose_witness_ending). */
  setFlag(key: string, value = true): void {
    this.data.endingFlags[key] = value;
    this.save();
  }

  /** Read a story flag (boolean, defaults to false). */
  flag(key: string): boolean {
    return this.data.endingFlags[key] === true;
  }

  /** Tomorrow morning. The Cleaners visit, the wipe happens, the player wakes. */
  advanceDay(): void {
    this.data.dayIndex = Math.min(99, this.data.dayIndex + 1);
    this.save();
  }

  /** DEV-ONLY: jump to a specific day for testing. */
  scrubToDay(n: number): void {
    this.data.dayIndex = Math.max(1, Math.min(99, n));
    this.save();
  }

  /** DEV-ONLY: set the player name. Hooked from menu later. */
  setPlayerName(name: string): void {
    this.data.playerName = name.trim().slice(0, 24) || "Elias";
    this.save();
  }
}

/** The one and only game-state instance. Import this, never instantiate. */
export const GameState = new GameStateClass();
