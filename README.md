# 🪐 Cosmic Watch

**Interstellar Asteroid Tracker & Risk Analyser**

A production-ready full-stack web application that fetches real-time Near-Earth Object (NEO) data from NASA's NeoWs API and converts complex asteroid trajectory data into clear risk assessments, visual alerts, and dashboards.

![Cosmic Watch Banner](https://via.placeholder.com/1200x400/0f0f23/8b5cf6?text=Cosmic+Watch)

## 🌟 Features

### Core Features
- **User Authentication**: Secure signup/login with JWT tokens
- **Real-Time Asteroid Data**: Live data from NASA's NeoWs API
- **Risk Analysis Engine**: Calculates risk scores based on size, velocity, miss distance, and hazard flags
- **Dashboard**: Space-themed dark UI with stats, charts, and asteroid cards
- **Watchlist**: Save and track asteroids you're interested in
- **Custom Alerts**: Set risk thresholds and notification preferences

### API Features
- RESTful API endpoints
- JWT authentication
- Rate limiting (via NASA API)
- Data caching for performance

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend (React)                   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────┐   │
│  │Dashboard│ │ Auth    │ │Watchlist│ │ Settings    │   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────────┘   │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP + JWT
┌────────────────────────▼────────────────────────────────┐
│                      Backend (Express)                  │
│  ┌────────────┐ ┌────────────┐ ┌──────────────────┐   │
│  │ Auth Routes│ │ NEO Routes │ │ User Routes      │   │
│  └────────────┘ └────────────┘ └──────────────────┘   │
│                         │                              │
│         ┌───────────────┼───────────────┐             │
│         ▼               ▼               ▼             │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐        │
│  │ NASA API  │  │ MongoDB   │  │ Cache     │        │
│  │ Service   │  │ Database  │  │ Service   │        │
│  └───────────┘  └───────────┘  └───────────┘        │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- MongoDB (if running locally)

### Option 1: Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/cosmic-watch.git
cd cosmic-watch

# Create environment file
cp backend/.env.example backend/.env

# Start all services
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000
```

### Option 2: Local Development

```bash
# Backend
cd backend
npm install
cp .env.example .env
npm run dev

# Frontend (in a new terminal)
cd frontend
npm install
npm start
```

## 📁 Project Structure

```
cosmic-watch/
├── backend/
│   ├── config/
│   │   └── db.js              # MongoDB connection
│   ├── middleware/
│   │   └── auth.js            # JWT authentication
│   ├── models/
│   │   ├── User.js            # User model
│   │   └── Asteroid.js        # Asteroid model
│   ├── routes/
│   │   ├── auth.js            # Authentication routes
│   │   ├── neo.js             # NEO/asteroid routes
│   │   └── user.js            # User preferences routes
│   ├── services/
│   │   └── nasaApi.js         # NASA API integration
│   ├── utils/
│   │   └── riskAnalysis.js    # Risk calculation engine
│   ├── server.js              # Express server entry
│   └── package.json
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── AsteroidCard.js
│   │   │   ├── Loading.js
│   │   │   └── Navbar.js
│   │   ├── context/
│   │   │   └── AuthContext.js
│   │   ├── pages/
│   │   │   ├── Dashboard.js
│   │   │   ├── Login.js
│   │   │   ├── Register.js
│   │   │   ├── AsteroidDetail.js
│   │   │   ├── Watchlist.js
│   │   │   └── Settings.js
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.js
│   │   ├── index.css
│   │   └── index.js
│   ├── nginx.conf
│   └── package.json
├── README.md
└── AI-LOG.md
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Backend port | 5000 |
| `NODE_ENV` | Environment | development |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/cosmic-watch |
| `JWT_SECRET` | JWT signing secret | (required) |
| `JWT_EXPIRE` | Token expiration | 7d |
| `NASA_API_KEY` | NASA API key | DEMO_KEY |
| `FRONTEND_URL` | Frontend URL | http://localhost:3000 |

### NASA API Key

Get a free NASA API key at: https://api.nasa.gov/

## 📡 API Endpoints

### Authentication
```
POST /api/auth/register    - Register new user
POST /api/auth/login      - Login user
GET  /api/auth/me         - Get current user profile
PUT  /api/auth/updateprofile - Update profile
PUT  /api/auth/changepassword - Change password
```

### NEO (Asteroid) Data
```
GET  /api/neo/feed              - Get asteroid feed
GET  /api/neo/lookup/:id       - Get single asteroid
GET  /api/neo/hazardous        - Get hazardous asteroids
GET  /api/neo/upcoming         - Get upcoming close approaches
GET  /api/neo/stats            - Get dashboard statistics
GET  /api/neo/risk-analysis/:id - Get detailed risk analysis
```

### User
```
GET  /api/user/profile         - Get user profile
PUT  /api/user/preferences     - Update preferences
GET  /api/user/watchlist       - Get watchlist
POST /api/user/watchlist/:id   - Add to watchlist
DELETE /api/user/watchlist/:id - Remove from watchlist
```

## 🎨 UI Preview

The application features a dark space-themed design with:
- Animated starfield background
- Glowing neon accents (purple/blue)
- Responsive design for all screen sizes
- Real-time data visualization
- Risk indicators with color coding

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 🐳 Docker Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild containers
docker-compose up -d --build

# Remove volumes (data loss)
docker-compose down -v
```

## 📝 Postman Collection

Import the Postman collection from `Cosmic_Watch_API.json` for easy API testing.

## 🔒 Security

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting on API endpoints
- CORS configuration
- Helmet security headers

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [NASA](https://www.nasa.gov/) for providing asteroid data
- [NeoWs API](https://api.nasa.gov/) for the Near-Earth Object Web Service
- [Space icons](https://emojipedia.org/) for UI elements

---

**🪐 Built with passion for space exploration**
