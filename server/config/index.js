'use strict';

module.exports = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',

  db: {
    url: process.env.DATABASE_URL || '',
  },

  gemini: {
    apiKey:     process.env.GEMINI_API_KEY  || '',
    chatModel:  process.env.GEMINI_MODEL    || 'gemini-2.5-flash',
    embedModel: 'gemini-embedding-001',
  },

  uploads: {
    maxSizeMb: parseInt(process.env.UPLOAD_MAX_MB || '50', 10),
    dir: process.env.UPLOAD_DIR || 'server/uploads',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-prod',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
};
