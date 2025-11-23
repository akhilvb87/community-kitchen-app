import React, { useState } from 'react';
import axios from 'axios';

function Login({ setUser }) {
    const [phone, setPhone] = useState('');
    const [name, setName] = useState('');
    const [isNew, setIsNew] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const res = await axios.post('http://localhost:3000/api/users/login', { phone, name });
            setUser(res.data);
        } catch (err) {
            if (err.response && err.response.status === 400 && err.response.data.error === 'Name required for new user') {
                setIsNew(true);
            } else {
                setError('Login failed');
            }
        }
    };

    return (
        <div className="flex items-center justify-center h-screen">
            <div className="bg-white p-8 rounded shadow-md w-96">
                <h2 className="text-2xl font-bold mb-4">Login</h2>
                {error && <p className="text-red-500 mb-2">{error}</p>}
                <form onSubmit={handleLogin}>
                    <div className="mb-4">
                        <label className="block text-gray-700">Phone Number</label>
                        <input
                            type="text"
                            className="w-full border p-2 rounded"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                        />
                    </div>
                    {isNew && (
                        <div className="mb-4">
                            <label className="block text-gray-700">Name</label>
                            <input
                                type="text"
                                className="w-full border p-2 rounded"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                    )}
                    <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600">
                        {isNew ? 'Register' : 'Login'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default Login;
