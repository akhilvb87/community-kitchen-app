const express = require('express');
const router = express.Router();
const db = require('../db');

// Get All Users
router.get('/', (req, res) => {
    const users = db.all('users');
    res.json(users);
});

// Get User
router.get('/:id', (req, res) => {
    const user = db.get('users', parseInt(req.params.id));
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
});

// Create New User
router.post('/', (req, res) => {
    const { name, phone, role } = req.body;
    if (!name || !phone) {
        return res.status(400).json({ error: 'Name and phone are required' });
    }

    // Check if phone already exists in any user's phones array
    const users = db.all('users');
    const existing = users.find(u =>
        (Array.isArray(u.phones) && u.phones.includes(phone)) ||
        u.phone === phone
    );
    if (existing) {
        return res.status(400).json({ error: 'Phone number already in use' });
    }

    const user = db.insert('users', {
        name,
        phones: [phone],  // Store as array
        role: role || 'member'
    });
    res.json(user);
});

// Add Additional Phone to User
router.post('/:id/phones', (req, res) => {
    const id = parseInt(req.params.id);
    const { phone } = req.body;

    if (!phone) {
        return res.status(400).json({ error: 'Phone number is required' });
    }

    const user = db.get('users', id);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    // Initialize phones array if it doesn't exist (for backward compatibility)
    const phones = user.phones || (user.phone ? [user.phone] : []);

    if (phones.length >= 3) {
        return res.status(400).json({ error: 'Maximum 3 phone numbers allowed' });
    }

    // Check if phone already exists
    const users = db.all('users');
    const phoneExists = users.some(u =>
        u.id !== id && (
            (Array.isArray(u.phones) && u.phones.includes(phone)) ||
            u.phone === phone
        )
    );

    if (phoneExists || phones.includes(phone)) {
        return res.status(400).json({ error: 'Phone number already in use' });
    }

    phones.push(phone);
    const updated = db.update('users', id, { phones });
    res.json(updated);
});

// Remove Phone from User
router.delete('/:id/phones/:phone', (req, res) => {
    const id = parseInt(req.params.id);
    const { phone } = req.params;

    const user = db.get('users', id);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    const phones = user.phones || (user.phone ? [user.phone] : []);

    if (phones.length <= 1) {
        return res.status(400).json({ error: 'Cannot remove last phone number' });
    }

    const newPhones = phones.filter(p => p !== phone);
    const updated = db.update('users', id, { phones: newPhones });
    res.json(updated);
});

// Login or Register by Phone
router.post('/login', (req, res) => {
    const { phone, name } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number required' });

    // Find user by checking all phone numbers
    const users = db.all('users');
    let user = users.find(u =>
        (Array.isArray(u.phones) && u.phones.includes(phone)) ||
        u.phone === phone
    );

    if (!user) {
        if (!name) return res.status(400).json({ error: 'Name required for new user' });
        user = db.insert('users', { name, phones: [phone], role: 'member' });
    }

    res.json(user);
});

// Update User Role
router.patch('/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const { role } = req.body;

    if (!role) {
        return res.status(400).json({ error: 'Role is required' });
    }

    if (!['member', 'coordinator', 'super_admin'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
    }

    const user = db.get('users', id);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    const updated = db.update('users', id, { role });
    res.json(updated);
});

// Delete User
router.delete('/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const user = db.get('users', id);

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deleting super_admin
    if (user.role === 'super_admin') {
        return res.status(403).json({ error: 'Cannot delete super admin' });
    }

    db.delete('users', id);
    res.json({ message: 'User deleted successfully' });
});

module.exports = router;
