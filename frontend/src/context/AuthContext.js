import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const token = localStorage.getItem('cosmic_token');
        if (token) {
            try {
                const response = await api.get('/auth/me');
                if (response.data.success) {
                    setUser(response.data.data.user);
                } else {
                    localStorage.removeItem('cosmic_token');
                }
            } catch (error) {
                console.error('Auth check failed:', error);
                localStorage.removeItem('cosmic_token');
            }
        }
        setLoading(false);
    };

    const login = async (email, password) => {
        try {
            const response = await api.post('/auth/login', { email, password });
            const { user, token } = response.data.data;

            localStorage.setItem('cosmic_token', token);
            setUser(user);

            return { success: true, user };
        } catch (error) {
            const message = error.response?.data?.message || 'Login failed';
            return { success: false, message };
        }
    };

    const register = async (username, email, password) => {
        try {
            console.log('[AUTH DEBUG] Registration attempt:', { username, email, password: '[REDACTED]' });
            const response = await api.post('/auth/register', { username, email, password });
            const { user, token } = response.data.data;

            localStorage.setItem('cosmic_token', token);
            setUser(user);

            return { success: true, user };
        } catch (error) {
            console.log('[AUTH DEBUG] Registration error response:', error.response?.data);
            const resp = error.response?.data;
            let message = 'Registration failed';
            if (resp) {
                if (Array.isArray(resp.errors) && resp.errors.length > 0) {
                    message = resp.errors[0].msg;
                } else if (resp.message) {
                    message = resp.message;
                } else if (resp.error) {
                    message = resp.error;
                }
            }
            return { success: false, message };
        }
    };

    const logout = () => {
        localStorage.removeItem('cosmic_token');
        setUser(null);
    };

    const updateUser = (userData) => {
        setUser(prev => ({ ...prev, ...userData }));
    };

    const value = {
        user,
        loading,
        login,
        register,
        logout,
        updateUser,
        isAuthenticated: !!user
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
