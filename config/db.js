const mongoose = require('mongoose');

async function connectDB() {
  const envMongoUri = process.env.MONGODB_URI;
  const localMongoUri = 'mongodb://127.0.0.1:27017/mission2k38';
  const primaryUri = envMongoUri || localMongoUri;

  console.log(`[DB] Connecting to ${primaryUri}`);

  try {
    await mongoose.connect(primaryUri, {
      serverSelectionTimeoutMS: 10000
    });

    console.log('[✓] MongoDB connected');
    return true;
  } catch (primaryError) {
    console.warn('[!] MongoDB not available at startup:', primaryError.message);

    if (primaryUri !== localMongoUri) {
      console.log(`[DB] Trying fallback local MongoDB at ${localMongoUri}`);
      try {
        await mongoose.connect(localMongoUri, {
          serverSelectionTimeoutMS: 10000
        });
        console.log('[✓] MongoDB connected to local fallback');
        return true;
      } catch (fallbackError) {
        console.warn('[!] Local MongoDB fallback failed:', fallbackError.message);
      }
    }

    return false;
  }
}

module.exports = connectDB;
