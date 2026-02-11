import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { neoApi, userApi } from '../services/api';
import Loading from '../components/Loading';
import AsteroidChat from '../components/AsteroidChat';

const AsteroidDetail = () => {
    const { id } = useParams();
    const [asteroid, setAsteroid] = useState(null);
    const [riskAnalysis, setRiskAnalysis] = useState(null);
    const [isWatched, setIsWatched] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchAsteroidData();
    }, [id]);

    const fetchAsteroidData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [asteroidRes, riskRes] = await Promise.all([
                neoApi.getAsteroid(id),
                neoApi.getRiskAnalysis(id)
            ]);

            if (asteroidRes.data.success) {
                setAsteroid(asteroidRes.data.data);
                setIsWatched(asteroidRes.data.data.isWatched);
            }

            if (riskRes.data.success) {
                setRiskAnalysis(riskRes.data.data);
            }
        } catch (err) {
            console.error('Asteroid fetch error:', err);
            setError(err.response?.data?.message || 'Failed to load asteroid data');
        } finally {
            setLoading(false);
        }
    };

    const handleWatchToggle = async () => {
        try {
            if (isWatched) {
                await userApi.removeFromWatchlist(id);
            } else {
                await userApi.addToWatchlist(id);
            }
            setIsWatched(!isWatched);
        } catch (err) {
            console.error('Watch toggle error:', err);
        }
    };

    if (loading) {
        return <Loading message="Loading asteroid data..." />;
    }

    if (error || !asteroid) {
        return (
            <div className="container">
                <div className="alert alert-danger">{error || 'Asteroid not found'}</div>
                <Link to="/dashboard" className="btn btn-primary mt-2">Back to Dashboard</Link>
            </div>
        );
    }

    const {
        name,
        designation,
        estimated_diameter,
        close_approach_data,
        is_potentially_hazardous_asteroid
    } = asteroid;

    const closeApproach = close_approach_data?.[0] || {};
    const diameter = estimated_diameter?.kilometers;
    const riskDisplay = riskAnalysis?.categoryDisplay;

    return (
        <div className="container detail-page">
            <div className="section-spacing">
                <Link to="/dashboard" className="detail-back-link">
                    Back to Dashboard
                </Link>

                <div className="detail-header">
                    <div>
                        <h1>{name}</h1>
                        {designation && (
                            <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                {designation}
                            </p>
                        )}
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                            ID: {id}
                        </p>
                    </div>

                    <button onClick={handleWatchToggle} className={`btn ${isWatched ? 'btn-primary' : 'btn-secondary'}`}>
                        {isWatched ? 'In Watchlist' : 'Add to Watchlist'}
                    </button>
                </div>
            </div>

            {riskAnalysis && (
                <div className="card mb-3 detail-risk-card" style={{ borderLeft: `4px solid ${riskDisplay?.color || 'var(--safe-green)'}` }}>
                    <div className="card-header detail-risk-head">
                        <h3 style={{ color: riskDisplay?.color }}>Risk Assessment</h3>
                        <span className={`risk-badge risk-${riskAnalysis.riskAssessment?.category}`}>
                            {riskAnalysis.riskAssessment?.category?.toUpperCase()} RISK
                        </span>
                    </div>

                    <div className="detail-risk-body">
                        <div style={{ flex: 1 }}>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                Risk Score
                            </p>
                            <p className="detail-risk-score" style={{ color: riskDisplay?.color }}>
                                {riskAnalysis.riskAssessment?.score}/100
                            </p>
                        </div>

                        <div style={{ flex: 2 }}>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                {riskDisplay?.description}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {is_potentially_hazardous_asteroid && (
                <div className="alert alert-danger mb-3">
                    This asteroid is classified as <strong>Potentially Hazardous</strong> by NASA
                </div>
            )}

            <div className="grid grid-2 gap-3">
                <div className="card">
                    <h3>Physical Properties</h3>
                    <div style={{ marginTop: '1rem' }}>
                        <DetailRow
                            label="Estimated Diameter"
                            value={`${diameter?.estimated_diameter_min?.toFixed(3)} - ${diameter?.estimated_diameter_max?.toFixed(3)} km`}
                        />
                        <DetailRow
                            label="Diameter (meters)"
                            value={`${estimated_diameter?.meters?.estimated_diameter_max?.toFixed(1)} m`}
                        />
                        <DetailRow
                            label="Diameter (miles)"
                            value={`${estimated_diameter?.miles?.estimated_diameter_max?.toFixed(2)} mi`}
                        />
                    </div>
                </div>

                <div className="card">
                    <h3>Close Approach</h3>
                    <div style={{ marginTop: '1rem' }}>
                        <DetailRow label="Close Approach Date" value={closeApproach.close_approach_date} />
                        <DetailRow label="Velocity" value={`${parseFloat(closeApproach.relative_velocity?.kilometers_per_hour).toLocaleString()} km/h`} />
                        <DetailRow label="Miss Distance" value={`${parseFloat(closeApproach.miss_distance?.kilometers).toLocaleString()} km`} />
                        <DetailRow label="Astronomical Units" value={`${closeApproach.miss_distance?.astronomical} AU`} />
                        <DetailRow label="Orbiting Body" value={closeApproach.orbiting_body} />
                    </div>
                </div>
            </div>

            {riskAnalysis?.riskSummary && (
                <div className="card mt-3">
                    <h3>Risk Analysis Summary</h3>
                    <div style={{ marginTop: '1rem' }}>
                        <p className="detail-summary-text">{riskAnalysis.riskSummary.sizeAssessment}</p>
                        <p className="detail-summary-text">{riskAnalysis.riskSummary.velocityAssessment}</p>
                        <p className="detail-summary-text">{riskAnalysis.riskSummary.distanceAssessment}</p>

                        <h4 style={{ marginTop: '1.5rem', marginBottom: '0.75rem' }}>Recommendations</h4>
                        <ul className="detail-recommend-list">
                            {riskAnalysis.riskSummary.recommendations?.map((rec, idx) => (
                                <li key={idx} className="detail-recommend-item">
                                    {rec}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            <div className="mt-3">
                <AsteroidChat asteroid={{ _id: asteroid._id || id, neoReferenceId: id, name: name || asteroid.designation || 'Unknown Asteroid' }} />
            </div>
        </div>
    );
};

const DetailRow = ({ label, value }) => (
    <div className="detail-row">
        <span className="detail-row-label">{label}</span>
        <span className="detail-row-value">{value}</span>
    </div>
);

export default AsteroidDetail;
