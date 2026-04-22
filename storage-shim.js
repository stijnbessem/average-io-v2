/**
 * window.storage shim
 *
 * Inside Claude's artifact runtime, `window.storage` is provided automatically.
 * Outside that runtime (on Vercel, localhost, anywhere else), it doesn't exist.
 * This shim reproduces the API on top of localStorage so the app works unchanged.
 *
 * API reference:
 *   await window.storage.get(key)           → { key, value, shared } | null
 *   await window.storage.set(key, value)    → { key, value, shared } | null
 *   await window.storage.delete(key)        → { key, deleted, shared } | null
 *   await window.storage.list(prefix?)      → { keys, prefix?, shared } | null
 */
(function installStorageShim() {
  if (typeof window === "undefined") return;
  if (window.storage && typeof window.storage.get === "function") return; // already provided

  const ls = (() => {
    try {
      const t = "__avg_io_storage_test__";
      window.localStorage.setItem(t, t);
      window.localStorage.removeItem(t);
      return window.localStorage;
    } catch (_) {
      return null;
    }
  })();

  const memory = new Map();

  const read = (key) => {
    if (ls) return ls.getItem(key);
    return memory.has(key) ? memory.get(key) : null;
  };
  const write = (key, value) => {
    if (ls) ls.setItem(key, value);
    else memory.set(key, value);
  };
  const remove = (key) => {
    if (ls) ls.removeItem(key);
    else memory.delete(key);
  };
  const allKeys = () => {
    if (ls) {
      const out = [];
      for (let i = 0; i < ls.length; i++) out.push(ls.key(i));
      return out;
    }
    return Array.from(memory.keys());
  };

  window.storage = {
    async get(key) {
      const v = read(key);
      if (v == null) return null;
      return { key, value: v, shared: false };
    },
    async set(key, value) {
      write(key, String(value));
      return { key, value, shared: false };
    },
    async delete(key) {
      remove(key);
      return { key, deleted: true, shared: false };
    },
    async list(prefix = "") {
      const keys = allKeys().filter(k => k.startsWith(prefix));
      return { keys, prefix, shared: false };
    },
  };
})();
