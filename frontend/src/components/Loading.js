import React from 'react';

const Loading = ({ message = 'Loading...' }) => {
    return (
        <div className="loading" style={{ minHeight: '50vh' }}>
            <div className="loading-spinner"></div>
            <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>{message}</p>
        </div>
    );
};

export default Loading;
