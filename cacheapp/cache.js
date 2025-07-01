const redis = require('redis');
const { MongoClient } = require('mongodb');
const express = require('express');
const app = express();
const PORT = 3000;

// Config mongo
const mongoUrl = 'mongodb://mongo:27017';
const dbName = 'trafficData';
const collectionName = 'filtered_incidents';

// Config redis
const redisClient = redis.createClient({ url: 'redis://redis:6379' });
redisClient.connect().catch(console.error);

async function getCachedQuery(key, query) {
  const cached = await redisClient.get(key);
  if (cached) {
    console.log(`Cache hit for ${key}`);
    return JSON.parse(cached);
  }

  const client = await MongoClient.connect(mongoUrl);
  const db = client.db(dbName);
  const result = await db.collection(collectionName).find(query).toArray();
  await client.close();

  await redisClient.set(key, JSON.stringify(result));
  console.log(`Cache miss. Fetched from MongoDB and cached for ${key}`);
  return result;
}

// server.
app.get('/event/:serialId', async (req, res) => {
  const serialId = parseInt(req.params.serialId, 10);
  if (isNaN(serialId)) return res.status(400).json({ error: 'Invalid ID' });

  const key = `event:${serialId}`;
  const result = await getCachedQuery(key, { serial_id: serialId });
  if (result.length > 0) res.json(result[0]);
  else res.status(404).json({ error: 'Not found' });
});

app.get('/event/by_city/:city', async (req, res) => {
  const city = req.params.city.toLowerCase();
  const key = `query:city:${city}`;
  const result = await getCachedQuery(key, { city: new RegExp(`^${city}$`, 'i') });
  res.json(result);
});

app.get('/event/by_street/:street', async (req, res) => {
  const street = req.params.street.toLowerCase();
  const key = `query:street:${street}`;
  const result = await getCachedQuery(key, { street: new RegExp(`^${street}$`, 'i') });
  res.json(result);
});

app.get('/event/by_category/:category', async (req, res) => {
  const category = req.params.category.toLowerCase();
  const key = `query:category:${category}`;
  const result = await getCachedQuery(key, { category: new RegExp(`^${category}$`, 'i') });
  res.json(result);
});

app.get('/event/by_title/:title', async (req, res) => {
  const title = req.params.title.toLowerCase();
  const key = `query:title:${title}`;
  const result = await getCachedQuery(key, { title: new RegExp(title, 'i') });
  res.json(result);
});

app.listen(PORT, () => {
  console.log(`Cache server running at http://localhost:${PORT}`);
});
