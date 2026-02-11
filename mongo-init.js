// MongoDB Initialization Script
// Creates database and sets up initial indexes

db = db.getSiblingDB('cosmic-watch');

// Create collections with validation
db.createCollection('users', {
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['username', 'email', 'password'],
            properties: {
                username: {
                    bsonType: 'string',
                    minLength: 3,
                    maxLength: 30
                },
                email: {
                    bsonType: 'string',
                    pattern: '^\\S+@\\S+\\.\\S+$'
                },
                password: {
                    bsonType: 'string',
                    minLength: 8
                }
            }
        }
    }
});

db.createCollection('asteroids', {
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['neoReferenceId', 'name'],
            properties: {
                neoReferenceId: {
                    bsonType: 'string'
                },
                name: {
                    bsonType: 'string'
                }
            }
        }
    }
});

// Create indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ 'watchedAsteroids.asteroidId': 1 });

db.asteroids.createIndex({ neoReferenceId: 1 }, { unique: true });
db.asteroids.createIndex({ closeApproachDate: 1 });
db.asteroids.createIndex({ isPotentiallyHazardous: 1 });
db.asteroids.createIndex({ 'riskAssessment.category': 1, closeApproachDate: 1 });

print('MongoDB initialization complete!');
