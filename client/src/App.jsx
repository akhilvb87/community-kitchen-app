import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import AdminDashboard from './components/AdminDashboard';
import UserDashboard from './components/UserDashboard';

function App() {
    const [user, setUser] = useState(null);

    const getHomePath = () => {
        if (!user) return '/';
        if (user.role === 'super_admin') return '/super-admin';
        if (user.role === 'coordinator') return '/coordinator';
        return '/user';
    };

    return (
        <Router>
            <div className="min-h-screen bg-gray-100">
                <Routes>
                    <Route
                        path="/"
                        element={!user ? <Login setUser={setUser} /> : <Navigate to={getHomePath()} />}
                    />
                    <Route
                        path="/super-admin"
                        element={
                            user && user.role === 'super_admin' ? (
                                <SuperAdminDashboard user={user} setUser={setUser} />
                            ) : (
                                <Navigate to="/" />
                            )
                        }
                    />
                    <Route
                        path="/coordinator"
                        element={
                            user && user.role === 'coordinator' ? (
                                <AdminDashboard user={user} setUser={setUser} />
                            ) : (
                                <Navigate to="/" />
                            )
                        }
                    />
                    <Route
                        path="/user"
                        element={user ? <UserDashboard user={user} setUser={setUser} /> : <Navigate to="/" />}
                    />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
