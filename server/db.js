const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(__dirname, 'kitchen.json');

// Initialize DB if not exists
if (!fs.existsSync(dbPath)) {
  const initialData = {
    users: [],
    menus: [],
    orders: [],
    expenses: []
  };
  fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2));
}

const readDb = () => {
  const data = fs.readFileSync(dbPath, 'utf8');
  return JSON.parse(data);
};

const writeDb = (data) => {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
};

const db = {
  // Helper to simulate "all"
  all: (table) => {
    const data = readDb();
    return data[table] || [];
  },
  // Helper to simulate "get" by id
  get: (table, id) => {
    const data = readDb();
    return data[table].find(item => item.id === id);
  },
  // Helper to simulate "insert"
  insert: (table, item) => {
    const data = readDb();
    const list = data[table];
    const newItem = { ...item, id: list.length > 0 ? Math.max(...list.map(i => i.id)) + 1 : 1 };
    list.push(newItem);
    writeDb(data);
    return newItem;
  },
  // Helper to simulate "update"
  update: (table, id, updates) => {
    const data = readDb();
    const list = data[table];
    const index = list.findIndex(item => item.id === id);
    if (index !== -1) {
      list[index] = { ...list[index], ...updates };
      writeDb(data);
      return list[index];
    }
    return null;
  },
  // Helper to find by field
  findBy: (table, field, value) => {
    const data = readDb();
    return data[table].find(item => item[field] === value);
  },
  // Helper to delete item
  delete: (table, id) => {
    const data = readDb();
    const list = data[table];
    const index = list.findIndex(item => item.id === id);
    if (index !== -1) {
      list.splice(index, 1);
      writeDb(data);
      return true;
    }
    return false;
  },
  // Raw read/write for complex ops
  read: readDb,
  write: writeDb
};

module.exports = db;
