/**
 * Cosmic Watch - NASA NeoWs API Service
 * Handles all interactions with NASA's Near-Earth Object Web Service
 */

const axios = require('axios');

class NASAApiService {
    constructor() {
        this.baseUrl = process.env.NASA_BASE_URL || 'https://api.nasa.gov';
        this.apiKey = process.env.NASA_API_KEY || 'DEMO_KEY';

        this.client = axios.create({
            baseURL: this.baseUrl,
            timeout: 30000,
            params: {
                api_key: this.apiKey
            }
        });

        // Cache for API responses
        this.cache = new Map();
        this.cacheExpiry = 15 * 60 * 1000; // 15 minutes
    }

    /**
     * Check if cache is valid
     */
    isCacheValid(key) {
        const cached = this.cache.get(key);
        if (!cached) return false;
        return (Date.now() - cached.timestamp) < this.cacheExpiry;
    }

    /**
     * Get cached data
     */
    getCached(key) {
        return this.cache.get(key)?.data;
    }

    /**
     * Set cache
     */
    setCache(key, data) {
        this.cache.set(key, { data, timestamp: Date.now() });
    }

    /**
     * Fetch NeoWs Feed - Get asteroids for a date range
     * @param {string} startDate - Start date (YYYY-MM-DD)
     * @param {string} endDate - End date (YYYY-MM-DD)
     * @returns {Object} Asteroid data
     */
    async getNeoFeed(startDate, endDate) {
        const cacheKey = `feed_${startDate}_${endDate}`;

        if (this.isCacheValid(cacheKey)) {
            const cached = this.getCached(cacheKey);
            if (cached && cached.success) {
                console.log('📦 Returning cached Neo Feed data');
                return cached;
            }
            // Invalid cache, fetch fresh data
            console.log('⚠️ Invalid cache found, fetching fresh data');
            this.cache.delete(cacheKey);
        }

        try {
            console.log(`🔭 Fetching NASA NeoWs Feed: ${startDate} to ${endDate}`);
            console.log(`🔑 Using API key: ${this.apiKey.substring(0, 4)}...${this.apiKey.slice(-4)}`);

            const response = await this.client.get('/neo/rest/v1/feed', {
                params: {
                    start_date: startDate,
                    end_date: endDate
                }
            });

            console.log(`✅ NASA Feed response received: ${response.data.element_count} asteroids`);

            const data = response.data;
            const result = {
                success: true,
                data: {
                    elementCount: data.element_count,
                    nearEarthObjects: data.near_earth_objects,
                    links: data.links
                }
            };

            // Only cache successful responses
            this.setCache(cacheKey, result);

            return result;
        } catch (error) {
            console.error('NASA API Error (Feed):', error.response?.status, error.response?.data || error.message);
            // Clear invalid cache
            this.cache.delete(cacheKey);
            throw new Error(`Failed to fetch Neo Feed: ${error.message}`);
        }
    }

    /**
     * Fetch single asteroid by ID
     * @param {string} asteroidId - NASA NEO reference ID
     * @returns {Object} Asteroid details
     */
    async getAsteroidById(asteroidId) {
        const cacheKey = `asteroid_${asteroidId}`;

        if (this.isCacheValid(cacheKey)) {
            console.log(`📦 Returning cached asteroid: ${asteroidId}`);
            const cached = this.getCached(cacheKey);
            if (cached && cached.success) {
                return cached;
            }
        }

        try {
            console.log(`🔭 Fetching NASA asteroid: ${asteroidId}`);

            const response = await this.client.get(`/neo/rest/v1/neo/${asteroidId}`);
            const data = response.data;

            const result = {
                success: true,
                data
            };

            this.setCache(cacheKey, result);

            return result;
        } catch (error) {
            if (error.response?.status === 404) {
                console.error(`❌ Asteroid not found in NASA database: ${asteroidId}`);
                return {
                    success: false,
                    error: `Asteroid not found: ${asteroidId}`
                };
            }
            console.error('NASA API Error (Lookup):', error.response?.status, error.response?.data || error.message);

            // Clear cache on error
            this.cache.delete(cacheKey);

            return {
                success: false,
                error: `NASA API error: ${error.response?.status || error.message}`
            };
        }
    }

    /**
     * Fetch random asteroids for demo purposes
     * @param {number} count - Number of asteroids to fetch
     */
    async getRandomAsteroids(count = 10) {
        try {
            // Get today's asteroids and randomly select
            const today = new Date().toISOString().split('T')[0];
            const result = await this.getNeoFeed(today, today);

            if (!result || !result.success || !result.data || !result.data.nearEarthObjects) {
                throw new Error('Invalid Neo Feed response for random asteroids');
            }

            const allAsteroids = Object.values(result.data.nearEarthObjects).flat();
            const shuffled = allAsteroids.sort(() => 0.5 - Math.random());

            return {
                success: true,
                data: shuffled.slice(0, count)
            };
        } catch (error) {
            throw new Error(`Failed to fetch random asteroids: ${error.message}`);
        }
    }

    /**
     * Get next 7 days of close approaches
     */
    async getUpcomingCloseApproaches() {
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);

        const startDate = today.toISOString().split('T')[0];
        const endDate = nextWeek.toISOString().split('T')[0];

        try {
            const result = await this.getNeoFeed(startDate, endDate);

            if (!result || !result.success || !result.data || !result.data.nearEarthObjects) {
                throw new Error('Invalid Neo Feed response for upcoming close approaches');
            }

            // Flatten and sort by close approach date
            const allAsteroids = Object.values(result.data.nearEarthObjects).flat();
            const sorted = allAsteroids.sort((a, b) => {
                const dateA = new Date(a.close_approach_data[0].close_approach_date);
                const dateB = new Date(b.close_approach_data[0].close_approach_date);
                return dateA - dateB;
            });

            return {
                success: true,
                data: sorted
            };
        } catch (error) {
            throw new Error(`Failed to fetch upcoming approaches: ${error.message}`);
        }
    }

    /**
     * Get hazardous asteroids
     */
    async getHazardousAsteroids() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const nextWeek = new Date();
            nextWeek.setDate(new Date().getDate() + 7);
            const endDate = nextWeek.toISOString().split('T')[0];

            const result = await this.getNeoFeed(today, endDate);
            if (!result || !result.success || !result.data || !result.data.nearEarthObjects) {
                throw new Error('Invalid Neo Feed response for hazardous asteroids');
            }

            // Filter hazardous asteroids
            const allAsteroids = Object.values(result.data.nearEarthObjects).flat();
            const hazardous = allAsteroids.filter(a => a.is_potentially_hazardous_asteroid);

            return {
                success: true,
                data: hazardous
            };
        } catch (error) {
            throw new Error(`Failed to fetch hazardous asteroids: ${error.message}`);
        }
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        console.log('🗑️ NASA API cache cleared');
    }

    /**
     * Get cache status
     */
    getCacheStatus() {
        return {
            size: this.cache.size,
            entries: Array.from(this.cache.keys())
        };
    }
}

module.exports = new NASAApiService();
