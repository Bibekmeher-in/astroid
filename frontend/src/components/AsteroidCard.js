import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../services/api';

const AsteroidCard = ({ asteroid }) => {
    const { user } = useAuth();
    const [isWatched, setIsWatched] = useState(asteroid.isWatched || false);
    const [loading, setLoading] = useState(false);

    const {
        id,
        name,
        estimated_diameter,
        close_approach_data,
        is_potentially_hazardous_asteroid,
        riskAssessment
    } = asteroid;

    const diameter = estimated_diameter?.kilometers?.estimated_diameter_max || 0;
    const velocity = close_approach_data?.[0]?.relative_velocity?.kilometers_per_hour || '0';
    const missDistance = close_approach_data?.[0]?.miss_distance?.kilometers || '0';
    const closeApproachDate = close_approach_data?.[0]?.close_approach_date || 'N/A';

    const handleWatchToggle = async () => {
        if (!user) return;

        setLoading(true);
        try {
            if (isWatched) {
                await userApi.removeFromWatchlist(id);
            } else {
                await userApi.addToWatchlist(id);
            }
            setIsWatched(!isWatched);
        } catch (error) {
            console.error('Watch toggle failed:', error);
        }
        setLoading(false);
    };

    const riskClass = `risk-${riskAssessment?.category || 'low'}`;
    const riskLabel = riskAssessment?.category
        ? riskAssessment.category.charAt(0).toUpperCase() + riskAssessment.category.slice(1)
        : 'Low';

    return (
        <div className="card asteroid-card">
            <button
                onClick={handleWatchToggle}
                disabled={loading || !user}
                className="asteroid-watch-btn"
                title={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
            >
                {isWatched ? 'Starred' : 'Star'}
            </button>

            <div className="card-header asteroid-card-header">
                <div>
                    <Link to={`/asteroid/${id}`} className="asteroid-card-title-link">
                        {name}
                    </Link>
                    <p className="asteroid-card-meta">ID: {id}</p>
                </div>

                <span className={`risk-badge ${riskClass}`}>
                    {riskLabel} Risk
                </span>
            </div>

            {is_potentially_hazardous_asteroid && (
                <div className="alert alert-danger asteroid-hazard-alert">
                    Potentially Hazardous
                </div>
            )}

            <div className="asteroid-card-grid">
                <div>
                    <p className="asteroid-card-label">Diameter</p>
                    <p className="asteroid-card-value">{diameter.toFixed(2)} km</p>
                </div>
                <div>
                    <p className="asteroid-card-label">Velocity</p>
                    <p className="asteroid-card-value">{parseFloat(velocity).toLocaleString()} km/h</p>
                </div>
                <div>
                    <p className="asteroid-card-label">Miss Distance</p>
                    <p className="asteroid-card-value">{parseFloat(missDistance).toLocaleString()} km</p>
                </div>
                <div>
                    <p className="asteroid-card-label">Close Approach</p>
                    <p className="asteroid-card-value">{closeApproachDate}</p>
                </div>
            </div>

            {riskAssessment && (
                <div className="asteroid-risk-panel">
                    <div className="asteroid-risk-row">
                        <span className="asteroid-risk-label">Risk Score</span>
                        <span className="asteroid-risk-score">{riskAssessment.score}/100</span>
                    </div>
                    <div className="asteroid-risk-bar-bg">
                        <div
                            style={{
                                width: `${riskAssessment.score}%`,
                                height: '100%',
                                background: riskAssessment.score >= 60
                                    ? 'var(--danger-red)'
                                    : riskAssessment.score >= 40
                                        ? 'var(--warning-yellow)'
                                        : 'var(--safe-green)',
                                transition: 'width 0.3s ease'
                            }}
                        />
                    </div>
                </div>
            )}

            <div className="asteroid-actions">
                <Link to={`/asteroid/${id}`} className="btn btn-primary btn-small w-full">
                    View Details
                </Link>
            </div>
        </div>
    );
};

export default AsteroidCard;
