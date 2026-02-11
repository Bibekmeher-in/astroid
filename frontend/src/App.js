import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import AsteroidDetail from './pages/AsteroidDetail';
import Watchlist from './pages/Watchlist';
import Settings from './pages/Settings';

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="loading">
                <div className="loading-spinner" />
                <p>Loading...</p>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

const PublicRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="loading">
                <div className="loading-spinner" />
                <p>Loading...</p>
            </div>
        );
    }

    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

function AppContent() {
    const { user } = useAuth();

    return (
        <div className="App">
            <Navbar />
            <main className="app-main">
                <Routes>
                    <Route
                        path="/login"
                        element={(
                            <PublicRoute>
                                <Login />
                            </PublicRoute>
                        )}
                    />
                    <Route
                        path="/register"
                        element={(
                            <PublicRoute>
                                <Register />
                            </PublicRoute>
                        )}
                    />

                    <Route
                        path="/dashboard"
                        element={(
                            <ProtectedRoute>
                                <Dashboard />
                            </ProtectedRoute>
                        )}
                    />
                    <Route
                        path="/asteroid/:id"
                        element={(
                            <ProtectedRoute>
                                <AsteroidDetail />
                            </ProtectedRoute>
                        )}
                    />
                    <Route
                        path="/watchlist"
                        element={(
                            <ProtectedRoute>
                                <Watchlist />
                            </ProtectedRoute>
                        )}
                    />
                    <Route
                        path="/settings"
                        element={(
                            <ProtectedRoute>
                                <Settings />
                            </ProtectedRoute>
                        )}
                    />

                    <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />

                    <Route
                        path="*"
                        element={(
                            <div className="container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                                <h1>404</h1>
                                <p>Page not found</p>
                                <a href="/dashboard" className="btn btn-primary mt-2">Go Home</a>
                            </div>
                        )}
                    />
                </Routes>
            </main>

            <footer className="app-footer">
                <p>Cosmic Watch - Interstellar Asteroid Tracker and Risk Analyser</p>
                <p className="app-footer-subtitle">Data provided by NASA NeoWs API</p>
            </footer>
        </div>
    );
}

function App() {
    return (
        <AuthProvider>
            <Router>
                <AppContent />
            </Router>
        </AuthProvider>
    );
}

export default App;
