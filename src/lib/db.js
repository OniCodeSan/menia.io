const STORAGE_PREFIX = "tokaro:";

const safeRead = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const safeWrite = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

class Table {
  constructor(name) {
    this.name = name;
    this.key = `${STORAGE_PREFIX}${name}`;
  }

  _rows() {
    return safeRead(this.key) || [];
  }

  _save(rows) {
    safeWrite(this.key, rows);
  }

  all() {
    return this._rows();
  }

  find(predicate) {
    return this._rows().find(predicate) || null;
  }

  filter(where = {}) {
    return this._rows().filter((row) =>
      Object.entries(where).every(([k, v]) => row[k] === v)
    );
  }

  insert(data) {
    const rows = this._rows();
    const now = new Date().toISOString();
    const row = {
      id: data.id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)),
      created_at: now,
      updated_at: now,
      ...data,
    };
    rows.push(row);
    this._save(rows);
    return row;
  }

  update(id, patch) {
    const rows = this._rows();
    const idx = rows.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    rows[idx] = { ...rows[idx], ...patch, updated_at: new Date().toISOString() };
    this._save(rows);
    return rows[idx];
  }

  remove(id) {
    this._save(this._rows().filter((r) => r.id !== id));
  }

  clear() {
    this._save([]);
  }
}

export const db = {
  users: new Table("users"),
  tokenWallets: new Table("token_wallets"),
  tokenTransactions: new Table("token_transactions"),
};

export const SESSION_KEY = `${STORAGE_PREFIX}session`;

