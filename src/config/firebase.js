const admin = require("firebase-admin");
const path = require("path");

// WARNING: Keep this file secure and do NOT commit to version control.
// The serviceAccountKey.json file contains your private key.
const serviceAccount = require(path.join(__dirname, "../../serviceAccountKey.json"));

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // Optional: Add your Firebase Storage bucket URL if you are using it.
  // storageBucket: "your-project-id.appspot.com"
});

module.exports = { admin };
// Note: Ensure that the serviceAccountKey.json file is in the correct location
// and contains the necessary credentials for Firebase Admin SDK.