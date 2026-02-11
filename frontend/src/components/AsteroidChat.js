import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import './AsteroidChat.css';

const AsteroidChat = ({ asteroid }) => {
    const { user, isAuthenticated } = useAuth();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [activeUsers, setActiveUsers] = useState(0);
    const [typingUsers, setTypingUsers] = useState([]);
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);
    const messagesEndRef = useRef(null);
    const socketRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    // Initialize socket connection
    useEffect(() => {
        const token = localStorage.getItem('cosmic_token');
        const socketUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';

        socketRef.current = io(socketUrl, {
            auth: { token },
            transports: ['websocket', 'polling']
        });

        const socket = socketRef.current;

        socket.on('connect', () => {
            console.log('Connected to chat server');
            setIsConnected(true);

            // Join the asteroid chat room
            socket.emit('joinAsteroid', {
                asteroidId: asteroid._id || asteroid.neoReferenceId,
                neoReferenceId: asteroid.neoReferenceId,
                asteroidName: asteroid.name
            });
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from chat server');
            setIsConnected(false);
        });

        socket.on('chatHistory', (data) => {
            setMessages(data.messages);
        });

        socket.on('newMessage', (message) => {
            setMessages(prev => [...prev, message]);
        });

        socket.on('userJoined', (data) => {
            // Could add system message here
        });

        socket.on('userLeft', (data) => {
            // Could add system message here
        });

        socket.on('activeUsers', (data) => {
            setActiveUsers(data.count);
        });

        socket.on('userTyping', (data) => {
            setTypingUsers(prev => {
                if (!prev.includes(data.username)) {
                    return [...prev, data.username];
                }
                return prev;
            });
        });

        socket.on('userStoppedTyping', (data) => {
            setTypingUsers(prev => prev.filter(username => username !== data.username));
        });

        socket.on('messageDeleted', (data) => {
            setMessages(prev => prev.filter(msg => msg._id !== data.messageId));
        });

        socket.on('chatError', (data) => {
            console.error('Chat error:', data?.message || 'Unknown chat error');
        });

        return () => {
            socket.emit('leaveAsteroid');
            socket.disconnect();
        };
    }, [asteroid._id, asteroid.neoReferenceId, asteroid.name]);

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = useCallback((e) => {
        e.preventDefault();
        if (!newMessage.trim() || !isAuthenticated) return;

        console.log('[CHAT DEBUG] Sending message:', {
            asteroidId: asteroid._id,
            neoReferenceId: asteroid.neoReferenceId,
            asteroidName: asteroid.name,
            messageLength: newMessage.trim().length
        });

        socketRef.current?.emit('sendMessage', {
            asteroidId: asteroid._id || asteroid.neoReferenceId,
            neoReferenceId: asteroid.neoReferenceId || asteroid._id,
            asteroidName: asteroid.name,
            message: newMessage.trim()
        });

        setNewMessage('');
        socketRef.current?.emit('stopTyping');
    }, [newMessage, isAuthenticated, asteroid._id, asteroid.neoReferenceId, asteroid.name]);

    const handleTyping = useCallback((e) => {
        setNewMessage(e.target.value);

        if (isAuthenticated) {
            socketRef.current?.emit('typing');

            // Clear previous timeout
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }

            // Stop typing after 2 seconds of no input
            typingTimeoutRef.current = setTimeout(() => {
                socketRef.current?.emit('stopTyping');
            }, 2000);
        }
    }, [isAuthenticated]);

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(e);
        }
    };

    const quickReactions = ['🚀', '⭐', '👀', '🔥', '💫', '🔭'];

    const addReaction = (emoji) => {
        if (!isAuthenticated || messages.length === 0) return;

        const lastMessage = messages[messages.length - 1];
        socketRef.current?.emit('addReaction', {
            messageId: lastMessage._id,
            emoji
        });
    };

    return (
        <div className="asteroid-chat">
            <div className="chat-header">
                <h3>💬 Community Discussion</h3>
                <div className="chat-status">
                    <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
                        {isConnected ? '● Live' : '○ Connecting...'}
                    </span>
                    <span className="active-users">
                        👥 {activeUsers} online
                    </span>
                </div>
            </div>

            <div className="chat-messages">
                {messages.length === 0 ? (
                    <div className="no-messages">
                        <p>No messages yet. Be the first to start the discussion!</p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg._id}
                            className={`message ${msg.userId?._id === user?._id ? 'own-message' : ''}`}
                        >
                            <div className="message-avatar">
                                {msg.userAvatar ? (
                                    <img src={msg.userAvatar} alt={msg.username} />
                                ) : (
                                    <div className="avatar-placeholder">
                                        {msg.username.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div className="message-content">
                                <div className="message-header">
                                    <span className="username">{msg.username}</span>
                                    <span className="timestamp">{formatTime(msg.createdAt)}</span>
                                </div>
                                <div className="message-text">
                                    {msg.message}
                                </div>
                                {msg.reactions && msg.reactions.length > 0 && (
                                    <div className="message-reactions">
                                        {msg.reactions.map((reaction, idx) => (
                                            <span key={idx} className="reaction">
                                                {reaction.emoji}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {typingUsers.length > 0 && (
                <div className="typing-indicator">
                    {typingUsers.length === 1
                        ? `${typingUsers[0]} is typing...`
                        : `${typingUsers.slice(0, 2).join(', ')} and ${typingUsers.length - 2} more are typing...`
                    }
                </div>
            )}

            <div className="chat-input-container">
                {isAuthenticated ? (
                    <>
                        <div className="quick-reactions">
                            {quickReactions.map(emoji => (
                                <button
                                    key={emoji}
                                    className="reaction-btn"
                                    onClick={() => addReaction(emoji)}
                                    title="Add reaction"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                        <form onSubmit={handleSendMessage} className="chat-input-form">
                            <textarea
                                value={newMessage}
                                onChange={handleTyping}
                                onKeyDown={handleKeyDown}
                                placeholder="Share your thoughts about this asteroid..."
                                rows={1}
                                className="chat-input"
                            />
                            <button
                                type="submit"
                                className="send-btn"
                                disabled={!newMessage.trim() || !isConnected}
                            >
                                Send
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="login-prompt">
                        <p>🔐 <a href="/login" onClick={() => setShowLoginPrompt(false)}>Login</a> to join the discussion about {asteroid.name}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AsteroidChat;
