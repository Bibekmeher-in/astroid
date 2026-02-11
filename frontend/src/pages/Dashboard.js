import React, { useState, useEffect } from 'react';
import { neoApi } from '../services/api';
import AsteroidCard from '../components/AsteroidCard';
import Loading from '../components/Loading';
import SpaceVisualization from '../components/SpaceVisualization';

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [asteroids, setAsteroids] = useState([]);
    const [hazardous, setHazardous] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('all');

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [statsRes, feedRes, hazardousRes] = await Promise.all([
                neoApi.getStats(),
                neoApi.getFeed({ limit: 20 }),
                neoApi.getHazardous({ limit: 10 })
            ]);

            if (statsRes.data.success) {
                setStats(statsRes.data.data.stats);
            }

            if (feedRes.data.success) {
                setAsteroids(feedRes.data.data.asteroids);
            }

            if (hazardousRes.data.success) {
                setHazardous(hazardousRes.data.data.asteroids);
            }
        } catch (err) {
            console.error('Dashboard fetch error:', err);
            setError(err.response?.data?.message || 'Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <Loading message="Loading cosmic data..." />;
    }

    if (error) {
        return (
            <div className="container">
                <div className="alert alert-danger">
                    {error}
                </div>
                <button onClick={fetchDashboardData} className="btn btn-primary mt-2">
                    Retry
                </button>
            </div>
        );
    }

    const displayAsteroids = activeTab === 'all' ? asteroids : hazardous;

    return (
        <div className="container">
            <div className="section-spacing">
                <SpaceVisualization asteroids={asteroids} />
            </div>

            <div className="section-spacing">
                <h1>Dashboard</h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    Real-time asteroid tracking and risk analysis from NASA data
                </p>
            </div>

            {stats && (
                <div className="grid grid-4 mb-3">
                    <div className="card stat-card">
                        <div className="stat-value">{stats.totalAsteroids}</div>
                        <div className="stat-label">Total Asteroids</div>
                    </div>
                    <div className="card stat-card">
                        <div className="stat-value" style={{ color: 'var(--danger-red)' }}>
                            {stats.hazardousCount}
                        </div>
                        <div className="stat-label">Potentially Hazardous</div>
                    </div>
                    <div className="card stat-card">
                        <div className="stat-value" style={{ color: 'var(--asteroid-orange)' }}>
                            {stats.closeApproaches}
                        </div>
                        <div className="stat-label">Close Approaches</div>
                    </div>
                    <div className="card stat-card">
                        <div className="stat-value" style={{ color: 'var(--safe-green)' }}>
                            {stats.largestAsteroid?.diameterKm?.toFixed(2) || 'N/A'}
                        </div>
                        <div className="stat-label">Largest (km)</div>
                    </div>
                </div>
            )}

            <div className="dashboard-tabs">
                <button
                    onClick={() => setActiveTab('all')}
                    className={`dashboard-tab-btn ${activeTab === 'all' ? 'active-all' : ''}`}
                >
                    All Asteroids
                </button>
                <button
                    onClick={() => setActiveTab('hazardous')}
                    className={`dashboard-tab-btn ${activeTab === 'hazardous' ? 'active-hazardous' : ''}`}
                >
                    Hazardous Only
                </button>
            </div>

            <div className="grid grid-3">
                {displayAsteroids.map((asteroid) => (
                    <AsteroidCard key={asteroid.id} asteroid={asteroid} />
                ))}
            </div>

            {displayAsteroids.length === 0 && (
                <div className="dashboard-empty">
                    <p>No asteroids found</p>
                </div>
            )}

            <div className="dashboard-refresh-wrap">
                <button onClick={fetchDashboardData} className="btn btn-secondary">
                    Refresh Data
                </button>
            </div>
        </div>
    );
};

export default Dashboard;
