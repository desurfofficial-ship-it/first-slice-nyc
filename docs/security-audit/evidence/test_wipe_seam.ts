/** Supplements: save write-path seams used by the URL-driver findings. */
import { wipeSave, writeSave, loadSave } from './src/Save.ts';

const store = (() => {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => { m.set(k, v); },
    removeItem: (k: string) => { m.delete(k); },
  };
})();

// 1. A story save exists in the store.
writeSave({ ...loadSave(store), day: 4, money: 240, cart_name: 'Corner Light' }, store);
console.log('[E1] pre-wipe save:', JSON.stringify({ day: loadSave(store).day, money: loadSave(store).money }));

// 2. wipeSave() — exactly what autotest.ts:439 calls on ?autotest=1 — removes it unconditionally.
wipeSave(store);
console.log('[E2] post-wipe loadSave:', JSON.stringify(loadSave(store)), '(fresh defaults = progress gone)');

// 3. writeSave failure degrades (store refusal returns false, no throw).
const full = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); }, removeItem: () => {} };
console.log('[E3] writeSave refused store returns:', writeSave(loadSave(store), full as unknown as Storage));

// 4. Day-1 write law: snapshotForSave returns null below day 2 — day 1 never writes.
console.log('[E4] verified by source: GameState.snapshotForSave day<2 → null (core/GameState.ts:884-886); harness relies on production snapshot logic via writeSave above.');
