import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../services/api';
import Loading from '../components/Loading';

const Settings = () => {
    const { user, updateUser } = useAuth();
    const [preferences, setPreferences] = useState({
        riskThreshold: 'medium',
        minAsteroidSizeKm: 0.1,
        maxMissDistanceKm: 10000000,
        emailNotifications: true,
        pushNotifications: false
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        if (user?.preferences) {
            setPreferences(user.preferences);
        }
        setLoading(false);
    }, [user]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setPreferences((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            const response = await userApi.updatePreferences(preferences);
            if (response.data.success) {
                updateUser({ preferences });
                setMessage({ type: 'success', text: 'Settings saved successfully!' });
            }
        } catch (err) {
            setMessage({
                type: 'danger',
                text: err.response?.data?.message || 'Failed to save settings'
            });
        }
        setSaving(false);
    };

    if (loading) {
        return <Loading message="Loading settings..." />;
    }

    return (
        <div className="container settings-page">
            <div className="section-spacing">
                <h1>Settings</h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    Configure your asteroid alert preferences
                </p>
            </div>

            {message && (
                <div className={`alert alert-${message.type}`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="card mb-3">
                    <h3>Profile</h3>
                    <div style={{ marginTop: '1rem' }}>
                        <div className="form-group">
                            <label className="form-label">Username</label>
                            <input type="text" className="form-input" value={user?.username || ''} disabled />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input type="email" className="form-input" value={user?.email || ''} disabled />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Account Type</label>
                            <input type="text" className="form-input" value={user?.role || 'user'} disabled style={{ textTransform: 'capitalize' }} />
                        </div>
                    </div>
                </div>

                <div className="card mb-3">
                    <h3>Risk Thresholds</h3>
                    <div style={{ marginTop: '1rem' }}>
                        <div className="form-group">
                            <label className="form-label">Minimum Risk Threshold</label>
                            <select name="riskThreshold" value={preferences.riskThreshold} onChange={handleChange} className="form-input">
                                <option value="low">Low Risk and Above</option>
                                <option value="medium">Medium Risk and Above</option>
                                <option value="high">High Risk and Above</option>
                                <option value="critical">Critical Risk Only</option>
                            </select>
                            <p className="form-help-text">Only show alerts for asteroids meeting this risk level</p>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Minimum Asteroid Size (km)</label>
                            <input
                                type="number"
                                name="minAsteroidSizeKm"
                                value={preferences.minAsteroidSizeKm}
                                onChange={handleChange}
                                className="form-input"
                                step="0.01"
                                min="0"
                            />
                            <p className="form-help-text">Only track asteroids larger than this size</p>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Maximum Miss Distance (km)</label>
                            <input
                                type="number"
                                name="maxMissDistanceKm"
                                value={preferences.maxMissDistanceKm}
                                onChange={handleChange}
                                className="form-input"
                                min="0"
                            />
                            <p className="form-help-text">Alert when asteroids come closer than this distance</p>
                        </div>
                    </div>
                </div>

                <div className="card mb-3">
                    <h3>Notifications</h3>
                    <div style={{ marginTop: '1rem' }}>
                        <div className="settings-toggle-group">
                            <input
                                type="checkbox"
                                name="emailNotifications"
                                checked={preferences.emailNotifications}
                                onChange={handleChange}
                                id="emailNotifications"
                                className="settings-checkbox"
                            />
                            <label htmlFor="emailNotifications" style={{ cursor: 'pointer' }}>
                                <strong>Email Notifications</strong>
                                <p className="form-help-text">Receive email alerts for important asteroid close approaches</p>
                            </label>
                        </div>

                        <div className="settings-toggle-group">
                            <input
                                type="checkbox"
                                name="pushNotifications"
                                checked={preferences.pushNotifications}
                                onChange={handleChange}
                                id="pushNotifications"
                                className="settings-checkbox"
                            />
                            <label htmlFor="pushNotifications" style={{ cursor: 'pointer' }}>
                                <strong>Push Notifications</strong>
                                <p className="form-help-text">Receive browser notifications for critical alerts</p>
                            </label>
                        </div>
                    </div>
                </div>

                <button type="submit" className="btn btn-primary w-full" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Settings'}
                </button>
            </form>
        </div>
    );
};

export default Settings;
