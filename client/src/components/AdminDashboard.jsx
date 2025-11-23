import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

function CoordinatorDashboard({ user, setUser }) {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [mealType, setMealType] = useState('lunch');
    const [items, setItems] = useState([
        { name: '', enabled: true },
        { name: '', enabled: true },
        { name: 'Nil', enabled: false },
        { name: 'Nil', enabled: false },
    ]);
    const [message, setMessage] = useState('');
    const [menus, setMenus] = useState([]);
    const [orderDetails, setOrderDetails] = useState({ menus: {}, userOrders: [] });

    const menusRef = useRef(menus);
    useEffect(() => {
        menusRef.current = menus;
    }, [menus]);

    // Fetch menus and order details for the selected date
    useEffect(() => {
        const fetchData = async () => {
            try {
                const menuRes = await axios.get(`http://localhost:3000/api/menus?date=${date}`);
                setMenus(menuRes.data);
                const detailsRes = await axios.get(`http://localhost:3000/api/orders/details?date=${date}`);
                setOrderDetails(detailsRes.data);
            } catch (err) {
                console.error('Error fetching data', err);
            }
        };
        fetchData();
    }, [date]);

    // Load existing menu items when meal type changes or menus update
    useEffect(() => {
        const existing = menus.find(m => m.meal_type === mealType);
        if (existing && Array.isArray(existing.items)) {
            const newItems = existing.items.slice(0, 4).map(it => ({
                name: it.name || '',
                enabled: it.enabled !== false,
            }));
            // Pad with disabled 'Nil' items for positions 3 and 4
            while (newItems.length < 2) newItems.push({ name: '', enabled: true });
            while (newItems.length < 4) newItems.push({ name: 'Nil', enabled: false });
            setItems(newItems);
        } else {
            // Default: items 1-2 enabled, items 3-4 disabled with 'Nil'
            setItems([
                { name: '', enabled: true },
                { name: '', enabled: true },
                { name: 'Nil', enabled: false },
                { name: 'Nil', enabled: false },
            ]);
        }
    }, [mealType, menus]);

    const handleItemChange = (index, value) => {
        setItems(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], name: value };
            return copy;
        });
    };

    const toggleEnabled = index => {
        setItems(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], enabled: !copy[index].enabled };
            return copy;
        });
    };

    const handlePublish = async e => {
        e.preventDefault();
        if (items.some(it => it.name.trim() === '')) {
            setMessage('All items must have a name');
            return;
        }
        try {
            const res = await axios.post('http://localhost:3000/api/menus', {
                date,
                meal_type: mealType,
                items,
            });
            setMessage('Menu saved successfully!');
            if (res.data && Array.isArray(res.data.items)) {
                setItems(res.data.items.map(it => ({ name: it.name, enabled: it.enabled !== false })));
            }
            const menuRes = await axios.get(`http://localhost:3000/api/menus?date=${date}`);
            setMenus(menuRes.data);
            const detailsRes = await axios.get(`http://localhost:3000/api/orders/details?date=${date}`);
            setOrderDetails(detailsRes.data);
        } catch (err) {
            const errMsg = err.response?.data?.error || err.message;
            setMessage('Error saving menu: ' + errMsg);
        }
    };

    const handleQuantityUpdate = async (userId, mealTypeParam, itemIdx, newQuantity) => {
        const menu = menus.find(m => m.meal_type === mealTypeParam);
        if (!menu) return;
        const quantity = parseInt(newQuantity) || 0;

        // Optimistically update local state
        setOrderDetails(prev => {
            const newUserOrders = prev.userOrders.map(uOrder => {
                if (uOrder.userId === userId) {
                    const existingMealOrder = uOrder.orders[mealTypeParam] || { quantities: {} };
                    const newQuantities = { ...existingMealOrder.quantities, [itemIdx]: quantity };
                    return {
                        ...uOrder,
                        orders: {
                            ...uOrder.orders,
                            [mealTypeParam]: { ...existingMealOrder, quantities: newQuantities },
                        },
                    };
                }
                return uOrder;
            });
            return { ...prev, userOrders: newUserOrders };
        });

        // Send update to backend
        const userOrder = orderDetails.userOrders.find(u => u.userId === userId);
        const currentQuantities = userOrder?.orders[mealTypeParam]?.quantities || {};
        const updatedQuantities = { ...currentQuantities, [itemIdx]: quantity };
        try {
            await axios.post('http://localhost:3000/api/orders', {
                user_id: userId,
                menu_id: menu.id,
                quantities: updatedQuantities,
            });
        } catch (err) {
            console.error('Error updating quantity', err);
            setMessage('Error updating quantity');
        }
    };

    // Build the consolidated stats table (four items per meal)
    const renderConsolidatedTable = () => {
        const mealMap = { breakfast: [], lunch: [], dinner: [] };
        menus.forEach(m => {
            const type = m.meal_type;
            if (mealMap[type]) {
                const itemsArr = (m.items || []).slice(0, 4);
                while (itemsArr.length < 4) itemsArr.push({ name: '', enabled: true });
                mealMap[type] = itemsArr;
            }
        });

        const topHeaders = [];
        const subHeaders = [];

        // Member Name column spans two rows
        topHeaders.push(
            <th key="member-name" rowSpan="2" className="border px-2 py-1 text-left align-middle">
                Member Name
            </th>
        );

        ['breakfast', 'lunch', 'dinner'].forEach((meal, idx) => {
            const items = mealMap[meal];
            const enabledItems = items.filter(i => i.enabled);
            if (enabledItems.length > 0) {
                const borderClass = idx === 0 ? 'border-l-4 border-r-4 border-gray-400' : 'border-r-4 border-gray-400';
                topHeaders.push(
                    <th key={`header-${meal}`} colSpan={enabledItems.length} className={`border px-2 py-1 text-center font-bold capitalize bg-gray-200 ${borderClass}`}>
                        {meal}
                    </th>
                );
                items.forEach((item, i) => {
                    if (!item.enabled) return;
                    const displayName = item.name || `${meal.charAt(0).toUpperCase() + meal.slice(1)} Item ${i + 1}`;
                    subHeaders.push(
                        <th key={`${meal}-${i}`} className="border px-2 py-1 text-center text-xs">
                            {displayName}
                        </th>
                    );
                });
            }
        });

        const columnTotals = [];
        if (!orderDetails.userOrders || !Array.isArray(orderDetails.userOrders)) {
            return { topHeaders, subHeaders, rows: [], footerRow: null };
        }

        const rows = orderDetails.userOrders.map((userOrder, userIdx) => {
            const cells = [];
            ['breakfast', 'lunch', 'dinner'].forEach(meal => {
                const menuItems = mealMap[meal];
                const userMealOrder = userOrder.orders[meal];
                menuItems.forEach((item, i) => {
                    if (!item.enabled) return;
                    const quantity = userMealOrder && userMealOrder.quantities[i] ? userMealOrder.quantities[i] : 0;
                    if (columnTotals.length <= cells.length) columnTotals.push(0);
                    columnTotals[cells.length] += parseInt(quantity) || 0;
                    cells.push(
                        <td key={`${meal}-${i}`} className="border px-1 py-1 text-center">
                            <input
                                type="number"
                                min="0"
                                className="w-12 text-center border rounded p-1 text-sm"
                                value={quantity}
                                onChange={e => handleQuantityUpdate(userOrder.userId, meal, i, e.target.value)}
                            />
                        </td>
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

        return { topHeaders, subHeaders, rows, footerRow };
    };

    const { topHeaders, subHeaders, rows, footerRow } = renderConsolidatedTable();

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Coordinator Dashboard</h1>
                <div className="flex items-center gap-4">
                    <span>Welcome, {user?.name} ({user?.phone})</span>
                    <button onClick={() => setUser(null)} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
                        Logout
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded shadow-md">
                    <h2 className="text-xl font-bold mb-4">Create Daily Menu</h2>
                    {message && (
                        <p className={`mb-4 ${message.includes('Error') ? 'text-red-500' : 'text-green-500'}`}>{message}</p>
                    )}
                    <form onSubmit={handlePublish}>
                        <div className="mb-4">
                            <label className="block text-gray-700">Date</label>
                            <input
                                type="date"
                                className="w-full border p-2 rounded"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700">Meal Type</label>
                            <select
                                className="w-full border p-2 rounded"
                                value={mealType}
                                onChange={e => setMealType(e.target.value)}
                            >
                                <option value="breakfast">Breakfast</option>
                                <option value="lunch">Lunch</option>
                                <option value="dinner">Dinner</option>
                            </select>
                        </div>
                        {items.map((it, idx) => (
                            <div key={idx} className="flex items-center mb-4 gap-2">
                                <label className="block text-gray-700 w-16">Item {idx + 1}</label>
                                <input
                                    type="text"
                                    className="flex-1 border p-2 rounded"
                                    value={it.name}
                                    onChange={e => handleItemChange(idx, e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => toggleEnabled(idx)}
                                    className={`px-3 py-1 rounded text-sm ${it.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                                >
                                    {it.enabled ? 'Enabled' : 'Disabled'}
                                </button>
                            </div>
                        ))}
                        <button type="submit" className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600">
                            Publish Menu
                        </button>
                    </form>
                </div>

                <div className="bg-white p-6 rounded shadow-md overflow-x-auto">
                    <h2 className="text-xl font-bold mb-4">Consolidated Stats ({date})</h2>
                    <table className="min-w-full table-auto border-collapse text-sm">
                        <thead className="bg-gray-100">
                            <tr>{topHeaders}</tr>
                            <tr>{subHeaders}</tr>
                        </thead>
                        <tbody>
                            {rows.length > 0 ? rows : (
                                <tr>
                                    <td colSpan={10} className="border px-2 py-1 text-center text-gray-500">No orders yet</td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot>
                            {footerRow}
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default CoordinatorDashboard;
