const admin = require('firebase-admin');

// Initialize Firebase Admin only once
if (!admin.apps.length) {
  try {
    // Prefer GOOGLE_APPLICATION_CREDENTIALS if set
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      // Last resort: initialize with no credentials (will fail on verify/create)
      admin.initializeApp();
    }
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
    throw error;
  }
}

module.exports = { admin };
