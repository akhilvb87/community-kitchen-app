const express = require('express');
const router = express.Router();
const db = require('../db');

// Get All Orders
router.get('/', (req, res) => {
    const orders = db.all('orders');
    res.json(orders);
});

// Create/Update Order with Quantities
router.post('/', (req, res) => {
    const { user_id, menu_id, quantities } = req.body;
    // quantities expected format: { "Item Name": 3, "Item 2": 0 }
    if (!user_id || !menu_id || !quantities) return res.status(400).json({ error: 'Missing fields' });

    let order = db.all('orders').find(o => o.user_id === user_id && o.menu_id === menu_id);

    if (order) {
        order = db.update('orders', order.id, { quantities, status: 'ordered' });
    } else {
        order = db.insert('orders', { user_id, menu_id, quantities, status: 'ordered' });
    }

    res.json(order);
});

// Get Consolidated Stats for Date
router.get('/stats', (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Date required' });

    const menus = db.all('menus').filter(m => m.date === date);
    const stats = {
        breakfast: {},
        lunch: {},
        dinner: {}
    };

    menus.forEach(menu => {
        const orders = db.all('orders').filter(o => o.menu_id === menu.id);
        const itemCounts = {};

        // Initialize counts for all items in the menu
        if (Array.isArray(menu.items)) {
            menu.items.forEach(item => {
                itemCounts[item.name] = 0;
            });
        }

        // Sum up quantities from orders
        orders.forEach(order => {
            if (order.quantities) {
                Object.entries(order.quantities).forEach(([key, count]) => {
                    const val = parseInt(count) || 0;
                    // Try to treat key as index
                    const idx = parseInt(key);
                    if (!isNaN(idx) && menu.items[idx]) {
                        const itemName = menu.items[idx].name;
                        if (itemCounts[itemName] !== undefined) {
                            itemCounts[itemName] += val;
                        }
                    } else if (itemCounts[key] !== undefined) {
                        // Legacy support: key is item name
                        itemCounts[key] += val;
                    }
                });
            }
        });

        if (menu.meal_type === 'breakfast') stats.breakfast = itemCounts;
        if (menu.meal_type === 'lunch') stats.lunch = itemCounts;
        if (menu.meal_type === 'dinner') stats.dinner = itemCounts;
    });

    res.json(stats);
});

// Get Detailed Orders with User Info for Date
router.get('/details', (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Date required' });

    const menus = db.all('menus').filter(m => m.date === date);
    const users = db.all('users');

    // Build a map of menu_id -> meal_type and items
    const menuMap = {};
    menus.forEach(menu => {
        menuMap[menu.id] = {
            meal_type: menu.meal_type,
            items: menu.items || []
        };
    });

    // Get all orders for these menus
    const menuIds = menus.map(m => m.id);
    const orders = db.all('orders').filter(o => menuIds.includes(o.menu_id));

    // Group orders by user
    const userOrders = {};
    orders.forEach(order => {
        const user = users.find(u => u.id === order.user_id);
        const userName = user ? (user.name || user.phone) : `User ${order.user_id}`;

        if (!userOrders[order.user_id]) {
            userOrders[order.user_id] = {
                userId: order.user_id,
                userName,
                orders: {}
            };
        }

        const menuInfo = menuMap[order.menu_id];
        if (menuInfo) {
            userOrders[order.user_id].orders[menuInfo.meal_type] = {
                quantities: order.quantities || {},
                items: menuInfo.items
            };
        }
    });

    res.json({
        menus: menuMap,
        userOrders: Object.values(userOrders)
    });
});

module.exports = router;
