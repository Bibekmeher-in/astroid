import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
    const { user, logout, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);

    const closeMenu = () => setMobileOpen(false);

    const handleLogout = () => {
        logout();
        closeMenu();
        navigate('/login');
    };

    return (
        <nav className="navbar">
            <div className="container navbar-container">
                <Link to="/" className="navbar-brand" onClick={closeMenu}>
                    <span className="navbar-brand-icon">CW</span>
                    <div className="navbar-brand-copy">
                        <span className="navbar-brand-title">COSMIC WATCH</span>
                        <p className="navbar-brand-subtitle">Asteroid Tracker</p>
                    </div>
                </Link>

                <button
                    type="button"
                    className={`navbar-toggle ${mobileOpen ? 'active' : ''}`}
                    onClick={() => setMobileOpen((prev) => !prev)}
                    aria-label="Toggle navigation menu"
                    aria-expanded={mobileOpen}
                >
                    <span />
                    <span />
                    <span />
                </button>

                <div className={`navbar-links ${mobileOpen ? 'open' : ''}`}>
                    {isAuthenticated ? (
                        <>
                            <Link to="/dashboard" style={navLinkStyle} onClick={closeMenu}>
                                Dashboard
                            </Link>
                            <Link to="/watchlist" style={navLinkStyle} onClick={closeMenu}>
                                Watchlist
                            </Link>
                            <Link to="/settings" style={navLinkStyle} onClick={closeMenu}>
                                Settings
                            </Link>

                            <div className="navbar-user">
                                <span className="navbar-user-name">{user?.username}</span>
                                <button onClick={handleLogout} className="btn btn-secondary btn-small">
                                    Logout
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <Link to="/login" style={navLinkStyle} onClick={closeMenu}>
                                Login
                            </Link>
                            <Link to="/register" className="btn btn-primary btn-small" onClick={closeMenu}>
                                Sign Up
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};

const navLinkStyle = {
    color: 'var(--text-secondary)',
    textDecoration: 'none',
    fontFamily: 'var(--font-display)',
    fontSize: '0.875rem',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    transition: 'color 0.3s ease'
};

export default Navbar;
