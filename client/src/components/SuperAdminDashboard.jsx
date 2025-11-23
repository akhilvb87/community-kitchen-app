import React, { useState, useEffect } from 'react';
import axios from 'axios';

function SuperAdminDashboard({ user, setUser }) {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [users, setUsers] = useState([]);
    const [orderDetails, setOrderDetails] = useState({ menus: {}, userOrders: [] });
    const [menus, setMenus] = useState([]);
    const [newUserName, setNewUserName] = useState('');
    const [newUserPhone, setNewUserPhone] = useState('');
    const [message, setMessage] = useState('');
    const [addingPhoneUserId, setAddingPhoneUserId] = useState(null);
    const [newPhone, setNewPhone] = useState('');

    useEffect(() => {
        fetchData();
    }, [date]);

    const fetchData = async () => {
        try {
            const [usersRes, menusRes, detailsRes] = await Promise.all([
                axios.get('http://localhost:3000/api/users'),
                axios.get(`http://localhost:3000/api/menus?date=${date}`),
                axios.get(`http://localhost:3000/api/orders/details?date=${date}`)
            ]);
            setUsers(usersRes.data);
            setMenus(menusRes.data);
            setOrderDetails(detailsRes.data);
        } catch (err) {
            console.error('Error fetching data', err);
        }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        if (!newUserName.trim() || !newUserPhone.trim()) {
            setMessage('Both name and phone are required');
            return;
        }
        try {
            await axios.post('http://localhost:3000/api/users', {
                name: newUserName,
                phone: newUserPhone,
                role: 'member'
            });
            setMessage('User added successfully!');
            setNewUserName('');
            setNewUserPhone('');
            fetchData();
        } catch (err) {
            setMessage('Error: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleDeleteUser = async (userId, userName) => {
        if (!confirm(`Delete user "${userName}"?`)) return;
        try {
            await axios.delete(`http://localhost:3000/api/users/${userId}`);
            setMessage(`User "${userName}" deleted!`);
            fetchData();
        } catch (err) {
            setMessage('Error: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleRoleChange = async (userId, newRole, userName) => {
        try {
            await axios.patch(`http://localhost:3000/api/users/${userId}`, { role: newRole });
            setMessage(`Role updated for "${userName}"!`);
            fetchData();
        } catch (err) {
            setMessage('Error: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleAddPhone = async (userId, userName) => {
        if (!newPhone.trim()) {
            setMessage('Phone number is required');
            return;
        }
        try {
            await axios.post(`http://localhost:3000/api/users/${userId}/phones`, { phone: newPhone });
            setMessage(`Phone added to "${userName}"!`);
            setNewPhone('');
            setAddingPhoneUserId(null);
            fetchData();
        } catch (err) {
            setMessage('Error: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleRemovePhone = async (userId, phone, userName) => {
        if (!confirm(`Remove ${phone} from ${userName}?`)) return;
        try {
            await axios.delete(`http://localhost:3000/api/users/${userId}/phones/${phone}`);
            setMessage('Phone removed!');
            fetchData();
        } catch (err) {
            setMessage('Error: ' + (err.response?.data?.error || err.message));
        }
    };

    const renderConsolidatedTable = () => {
        const mealMap = { breakfast: [], lunch: [], dinner: [] };
        menus.forEach(m => {
            const type = m.meal_type;
            if (mealMap[type]) {
                const itemsArr = (m.items || []).slice(0, 3);
                while (itemsArr.length < 3) itemsArr.push({ name: '', enabled: true });
                mealMap[type] = itemsArr;
            }
        });

        const headers = [];
        ['breakfast', 'lunch', 'dinner'].forEach(meal => {
            mealMap[meal].forEach((item, idx) => {
                if (!item.enabled) return;
                const displayName = item.name || `${meal.charAt(0).toUpperCase() + meal.slice(1)} Item ${idx + 1}`;
                headers.push(
                    <th key={`${meal}-${idx}`} className="border px-2 py-1 text-center text-xs">
                        {displayName}
                    </th>
                );
            });
        });

        const columnTotals = [];

        if (!orderDetails.userOrders || !Array.isArray(orderDetails.userOrders)) {
            return { headers, rows: [], footerRow: null };
        }

        const rows = orderDetails.userOrders.map((userOrder, userIdx) => {
            const cells = [];

            ['breakfast', 'lunch', 'dinner'].forEach(meal => {
                const menuItems = mealMap[meal];
                const userMealOrder = userOrder.orders[meal];
                menuItems.forEach((item, idx) => {
                    if (!item.enabled) return;
                    const quantity = userMealOrder && userMealOrder.quantities[idx] ? userMealOrder.quantities[idx] : 0;

                    // Initialize total for this column if not exists
                    if (columnTotals.length <= cells.length) {
                        columnTotals.push(0);
                    }
                    columnTotals[cells.length] += (parseInt(quantity) || 0);

                    cells.push(
                        <td key={`${meal}-${idx}`} className="border px-2 py-1 text-center">{quantity}</td>
                    );
                });
            });
            return (
                <tr key={userIdx} className="bg-white">
                    <td className="border px-2 py-1 font-medium">{userOrder.userName}</td>
                    {cells}
                </tr>
            );
        });

        const footerRow = (
            <tr className="bg-gray-200 font-bold">
                <td className="border px-2 py-1">Total</td>
                {columnTotals.map((total, idx) => (
                    <td key={idx} className="border px-2 py-1 text-center">
                        {total}
                    </td>
                ))}
            </tr>
        );

        return { headers, rows, footerRow };
    };

    const { headers, rows, footerRow } = renderConsolidatedTable();

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
                <div className="flex items-center gap-4">
                    <span>Welcome, {user?.name}</span>
                    <button onClick={() => setUser(null)} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
                        Logout
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="bg-white p-6 rounded shadow-md">
                    <h2 className="text-xl font-bold mb-4">Add New User</h2>
                    {message && (
                        <p className={`mb-4 ${message.includes('Error') ? 'text-red-500' : 'text-green-500'}`}>{message}</p>
                    )}
                    <form onSubmit={handleAddUser}>
                        <div className="mb-4">
                            <label className="block text-gray-700">Name</label>
                            <input type="text" className="w-full border p-2 rounded" value={newUserName} onChange={e => setNewUserName(e.target.value)} required />
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700">Phone</label>
                            <input type="text" className="w-full border p-2 rounded" value={newUserPhone} onChange={e => setNewUserPhone(e.target.value)} required />
                        </div>
                        <button type="submit" className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600">
                            Add User
                        </button>
                    </form>
                </div>

                <div className="bg-white p-6 rounded shadow-md">
                    <h2 className="text-xl font-bold mb-4">All Users</h2>
                    <div className="max-h-96 overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-100 sticky top-0">
                                <tr>
                                    <th className="border px-2 py-1 text-left">Name</th>
                                    <th className="border px-2 py-1 text-left">Phones (max 3)</th>
                                    <th className="border px-2 py-1 text-left">Role</th>
                                    <th className="border px-2 py-1 text-left">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => {
                                    const phones = u.phones || (u.phone ? [u.phone] : []);
                                    return (
                                        <tr key={u.id}>
                                            <td className="border px-2 py-1">{u.name}</td>
                                            <td className="border px-2 py-1">
                                                <div className="flex flex-col gap-1">
                                                    {phones.map((phone, idx) => (
                                                        <div key={idx} className="flex items-center gap-1">
                                                            <span>{phone}</span>
                                                            {phones.length > 1 && (
                                                                <button onClick={() => handleRemovePhone(u.id, phone, u.name)} className="text-red-500 text-xs">×</button>
                                                            )}
                                                        </div>
                                                    ))}
                                                    {phones.length < 3 && (
                                                        addingPhoneUserId === u.id ? (
                                                            <div className="flex gap-1">
                                                                <input type="text" className="border px-1 py-0.5 text-xs w-24" placeholder="Phone" value={newPhone} onChange={e => setNewPhone(e.target.value)} />
                                                                <button onClick={() => handleAddPhone(u.id, u.name)} className="bg-green-500 text-white px-2 py-0.5 text-xs rounded">✓</button>
                                                                <button onClick={() => { setAddingPhoneUserId(null); setNewPhone(''); }} className="bg-gray-500 text-white px-2 py-0.5 text-xs rounded">×</button>
                                                            </div>
                                                        ) : (
                                                            <button onClick={() => setAddingPhoneUserId(u.id)} className="text-blue-500 text-xs">+ Add phone</button>
                                                        )
                                                    )}
                                                </div>
                                            </td>
                                            <td className="border px-2 py-1">
                                                <select value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value, u.name)} disabled={u.role === 'super_admin'} className={`px-2 py-1 text-xs rounded border-0 ${u.role === 'super_admin' ? 'bg-purple-100 text-purple-800' : u.role === 'coordinator' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                                    <option value="member">Member</option>
                                                    <option value="coordinator">Coordinator</option>
                                                    <option value="super_admin">Super Admin</option>
                                                </select>
                                            </td>
                                            <td className="border px-2 py-1">
                                                {u.role !== 'super_admin' && (
                                                    <button onClick={() => handleDeleteUser(u.id, u.name)} className="bg-red-500 text-white px-2 py-1 text-xs rounded">Delete</button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded shadow-md overflow-x-auto">
                <h2 className="text-xl font-bold mb-4">Consolidated Stats ({date})</h2>
                <div className="mb-4">
                    <label className="block text-gray-700 mb-2">Select Date</label>
                    <input type="date" className="border p-2 rounded" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <table className="min-w-full table-auto border-collapse text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="border px-2 py-1 text-left">Member</th>
                            {headers}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length > 0 ? rows : (
                            <tr><td colSpan={10} className="border px-2 py-1 text-center text-gray-500">No orders yet</td></tr>
                        )}
                    </tbody>
                    <tfoot>
                        {footerRow}
                    </tfoot>
                </table>
            </div>
        </div>
    );
}

export default SuperAdminDashboard;
