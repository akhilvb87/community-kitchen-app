const express = require('express');
const router = express.Router();
const db = require('../db');

// Get Menus for a specific date
router.get('/', (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Date required' });

    const menus = db.all('menus').filter(m => m.date === date);
    res.json(menus);
});

// Create or update a menu for a date & meal_type
router.post('/', (req, res) => {
    const { date, meal_type, items } = req.body;
    if (!date || !meal_type || !items) return res.status(400).json({ error: 'Missing fields' });

    // Normalize items (allow strings or objects)
    let normalizedItems = items;
    if (Array.isArray(items)) {
        normalizedItems = items.map(i => typeof i === 'string' ? { name: i, enabled: true } : i);
    } else {
        return res.status(400).json({ error: 'Items must be an array' });
    }

    // DEBUG: log how many items we received
    console.log('🛠️  Received items length:', normalizedItems.length);

    // Allow 3 or 4 items per menu
    if (normalizedItems.length < 3 || normalizedItems.length > 4) {
        return res.status(400).json({ error: 'Menu must have 3 or 4 items' });
    }

    // If a menu already exists for this date & meal_type, update it
    const existing = db
        .all('menus')
        .find(m => m.date === date && m.meal_type === meal_type);
    if (existing) {
        const updatedMenu = db.update('menus', existing.id, { items: normalizedItems });
        return res.json(updatedMenu);
    }

    // Otherwise create a new menu entry
    const menu = db.insert('menus', { date, meal_type, items: normalizedItems });
    res.json(menu);
});

// Update an existing menu (PUT) – also allows 3 or 4 items
router.put('/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length < 3 || items.length > 4) {
        return res.status(400).json({ error: 'Invalid items data' });
    }

    const menu = db.get('menus', id);
    if (!menu) return res.status(404).json({ error: 'Menu not found' });

    const updatedMenu = db.update('menus', id, { items });
    res.json(updatedMenu);
});

module.exports = router;
