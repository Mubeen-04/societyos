import dotenv from 'dotenv';
dotenv.config();

const configuredClientUrl = process.env.CLIENT_URL || '';
const renderExternalUrl = process.env.RENDER_EXTERNAL_URL || '';
const pointsToLocalhost = (() => {
  try {
    return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(configuredClientUrl).hostname);
  } catch {
    return false;
  }
})();
const clientUrl = renderExternalUrl && (!configuredClientUrl || pointsToLocalhost)
  ? renderExternalUrl
  : configuredClientUrl || 'http://localhost:5173';

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  MONGO_URI: process.env.MONGO_URI || '',
  JWT_SECRET: process.env.JWT_SECRET || 'societyos_super_secure_jwt_secret_key_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CLIENT_URL: clientUrl,
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads',
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || ''
};
