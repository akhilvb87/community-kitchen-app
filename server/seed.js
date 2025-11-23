const db = require('./db');

// Create Specific Admin
const adminPhone = '112233';
const admin = db.findBy('users', 'phone', adminPhone);
if (!admin) {
    db.insert('users', { name: 'Super Admin', phone: adminPhone, role: 'admin' });
    console.log(`Admin created: ${adminPhone}`);
} else {
    // Ensure role is admin
    const allUsers = db.read();
    const userIndex = allUsers.users.findIndex(u => u.id === admin.id);
    allUsers.users[userIndex].role = 'admin';
    db.write(allUsers);
    console.log(`Admin updated: ${adminPhone}`);
}

// Create Member
const member = db.findBy('users', 'phone', '8888');
if (!member) {
    db.insert('users', { name: 'Regular Member', phone: '8888', role: 'member' });
    console.log('Member created: 8888');
}

console.log('Database seeded!');
