import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { userApi } from '../services/api';
import Loading from '../components/Loading';

const Watchlist = () => {
    const [watchlist, setWatchlist] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchWatchlist();
    }, []);

    const fetchWatchlist = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await userApi.getWatchlist();
            if (response.data.success) {
                setWatchlist(response.data.data.watchlist);
            }
        } catch (err) {
            console.error('Watchlist fetch error:', err);
            setError(err.response?.data?.message || 'Failed to load watchlist');
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async (asteroidId) => {
        try {
            await userApi.removeFromWatchlist(asteroidId);
            setWatchlist(watchlist.filter((item) => item.asteroidId?._id !== asteroidId));
        } catch (err) {
            console.error('Remove error:', err);
        }
    };

    if (loading) {
        return <Loading message="Loading watchlist..." />;
    }

    return (
        <div className="container">
            <div className="section-spacing">
                <h1>My Watchlist</h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    Asteroids you are tracking for future close approaches
                </p>
            </div>

            {error && (
                <div className="alert alert-danger">{error}</div>
            )}

            {watchlist.length === 0 ? (
                <div className="card empty-state-card">
                    <span className="empty-state-icon">No Items</span>
                    <h3 style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>No asteroids watched yet</h3>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                        Add asteroids from the dashboard to track them here
                    </p>
                    <Link to="/dashboard" className="btn btn-primary mt-2">
                        Go to Dashboard
                    </Link>
                </div>
            ) : (
                <div className="grid grid-2">
                    {watchlist.map((item) => {
                        const asteroid = item.asteroidId;
                        if (!asteroid) return null;

                        const diameter = asteroid.estimatedDiameter?.kilometers?.estimatedDiameterMax || 0;
                        const velocity = asteroid.relativeVelocity?.kilometersPerHour || '0';
                        const missDistance = asteroid.missDistance?.kilometers || '0';
                        const riskCategory = asteroid.riskAssessment?.category || 'low';

                        return (
                            <div key={item._id} className="card">
                                <div className="watchlist-item-head">
                                    <div>
                                        <Link to={`/asteroid/${asteroid.neoReferenceId}`} className="watchlist-item-title">
                                            {asteroid.name}
                                        </Link>
                                        <p className="watchlist-item-added">
                                            Added: {new Date(item.addedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <button onClick={() => handleRemove(asteroid.neoReferenceId)} className="btn btn-danger btn-small">
                                        Remove
                                    </button>
                                </div>

                                <div className="watchlist-item-grid">
                                    <div>
                                        <p className="watchlist-item-label">Diameter</p>
                                        <p style={{ fontWeight: '600' }}>{diameter.toFixed(2)} km</p>
                                    </div>
                                    <div>
                                        <p className="watchlist-item-label">Velocity</p>
                                        <p style={{ fontWeight: '600' }}>{parseFloat(velocity).toLocaleString()} km/h</p>
                                    </div>
                                    <div>
                                        <p className="watchlist-item-label">Miss Distance</p>
                                        <p style={{ fontWeight: '600' }}>{parseFloat(missDistance).toLocaleString()} km</p>
                                    </div>
                                    <div>
                                        <p className="watchlist-item-label">Risk</p>
                                        <span className={`risk-badge risk-${riskCategory}`}>
                                            {riskCategory.toUpperCase()}
                                        </span>
                                    </div>
                                </div>

                                {item.notes && (
                                    <div className="watchlist-notes">
                                        {item.notes}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Watchlist;
