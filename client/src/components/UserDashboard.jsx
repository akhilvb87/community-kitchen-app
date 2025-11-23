import React, { useState, useEffect } from 'react';
import axios from 'axios';

function UserDashboard({ user, setUser }) {
    // ---- Current date (no selector) ----
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    const dayName = today.toLocaleDateString(undefined, { weekday: 'long' });

    const [menus, setMenus] = useState([]);
    const [quantities, setQuantities] = useState({}); // { menuId: { itemName: count } }

    // ---- Fetch today's menus, sort Breakfast → Lunch → Dinner, and load existing orders ----
    useEffect(() => {
        const fetchMenusAndOrders = async () => {
            try {
                // Fetch menus
                const menusRes = await axios.get(`http://localhost:3000/api/menus?date=${formattedDate}`);
                const order = { breakfast: 0, lunch: 1, dinner: 2 };
                const sorted = (menusRes.data || []).sort(
                    (a, b) => (order[a.meal_type] ?? 3) - (order[b.meal_type] ?? 3)
                );
                setMenus(sorted);

                // Initialize quantities
                const init = {};
                sorted.forEach(menu => {
                    init[menu.id] = {};
                    if (Array.isArray(menu.items)) {
                        menu.items.forEach((item, idx) => {
                            init[menu.id][idx] = 0;
                        });
                    }
                });

                // Fetch existing orders for this user and populate quantities
                try {
                    const ordersRes = await axios.get('http://localhost:3000/api/orders');
                    const userOrders = ordersRes.data.filter(
                        order => order.user_id === user.id && sorted.some(m => m.id === order.menu_id)
                    );

                    // Pre-fill quantities from existing orders
                    userOrders.forEach(order => {
                        if (init[order.menu_id] && order.quantities) {
                            init[order.menu_id] = { ...init[order.menu_id], ...order.quantities };
                        }
                    });
                } catch (err) {
                    console.log('No existing orders found or error fetching orders');
                }

                setQuantities(init);
            } catch (err) {
                console.error('Error fetching menus', err);
            }
        };
        fetchMenusAndOrders();
    }, [formattedDate, user.id]);

    const [isDirty, setIsDirty] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const handleQuantityChange = (menuId, itemName, value) => {
        setQuantities(prev => ({
            ...prev,
            [menuId]: {
                ...prev[menuId],
                [itemName]: parseInt(value, 10) || 0,
            },
        }));
        setIsDirty(true);
    };

    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const handleUpdateAllOrders = async () => {
        try {
            const promises = menus.map(menu => {
                return axios.post('http://localhost:3000/api/orders', {
                    user_id: user.id,
                    menu_id: menu.id,
                    quantities: quantities[menu.id] || {},
                });
            });
            await Promise.all(promises);
            setIsDirty(false);
            setShowSuccessModal(true);
        } catch (err) {
            console.error('Error updating orders', err);
            alert('Error updating orders');
        }
    };

    const handleLogoutClick = () => {
        if (isDirty) {
            setShowLogoutModal(true);
        } else {
            setUser(null);
        }
    };

    const confirmLogout = () => {
        setUser(null);
    };

    return (
        <div className="p-8 relative">
            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-lg shadow-xl max-w-sm w-full text-center transform transition-all scale-100">
                        <div className="mb-4 text-green-500">
                            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold mb-2">Success!</h3>
                        <p className="text-gray-600 mb-6">Food count is updated.</p>
                        <button
                            onClick={() => setShowSuccessModal(false)}
                            className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 w-full font-semibold"
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}

            {/* Logout Confirmation Modal */}
            {showLogoutModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-lg shadow-xl max-w-sm w-full text-center">
                        <div className="mb-4 text-yellow-500">
                            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold mb-2">Unsaved Changes</h3>
                        <p className="text-gray-600 mb-6">You are logging out without updating the Food count?</p>
                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={() => setShowLogoutModal(false)}
                                className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400 font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmLogout}
                                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 font-semibold"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">User Dashboard</h1>
                <div className="flex items-center gap-4">
                    <span>Welcome, {user.name}</span>
                    <button
                        onClick={handleLogoutClick}
                        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                    >
                        Logout
                    </button>
                </div>
            </div>

            {/* Date heading */}
            <h2 className="text-xl font-semibold mb-4">
                Menu for {formattedDate} ({dayName})
            </h2>

            {/* Menu cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {menus.length === 0 ? (
                    <p className="text-gray-500 col-span-full">No menus available for today.</p>
                ) : (
                    menus.map(menu => (
                        <div key={menu.id} className="bg-white p-6 rounded shadow-md">
                            <h3 className="text-xl font-bold capitalize mb-4 border-b pb-2">
                                {menu.meal_type}
                            </h3>
                            <div className="space-y-3 mb-4">
                                {Array.isArray(menu.items) &&
                                    menu.items.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className={`flex justify-between items-center ${!item.enabled ? 'opacity-50' : ''}`}
                                        >
                                            <span className={!item.enabled ? 'line-through' : ''}>{item.name}</span>
                                            {item.enabled ? (
                                                <input
                                                    type="number"
                                                    min="0"
                                                    className="border p-1 rounded w-20 text-center"
                                                    value={quantities[menu.id]?.[idx] ?? 0}
                                                    onChange={e =>
                                                        handleQuantityChange(menu.id, idx, e.target.value)
                                                    }
                                                />
                                            ) : (
                                                <span className="text-xs border border-gray-300 px-1 rounded">
                                                    Unavailable
                                                </span>
                                            )}
                                        </div>
                                    ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {menus.length > 0 && (
                <div className="mt-8 flex justify-center">
                    <button
                        onClick={handleUpdateAllOrders}
                        className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 shadow-lg"
                    >
                        Update Food Count
                    </button>
                </div>
            )}
        </div>
    );
}

export default UserDashboard;
