const redis = require('redis');
const { MongoClient } = require('mongodb');
const express = require('express');
const app = express();
const PORT = 3000;


// NOMBRE DB Y COLECCION
const mongoUrl = 'mongodb://mongo:27017';
const dbName = 'trafficData';
const collectionName = 'events';

// CONEXION A REDIS
const redisClient = redis.createClient({
  url: 'redis://redis:6379'
});
redisClient.connect().catch(console.error);

// FUNCION, BUSCAR ELEMENTO POR ID
async function getEventById(serialId) {

  // PRIMERO, BUSCA SI REDIS YA LO TIENE Y LO RETORNA.
  const cacheKey = `event:${serialId}`;
  const cachedEvent = await redisClient.get(cacheKey);

  if (cachedEvent) {
    console.log(`Cache hit for serial_id ${serialId}`);
    return JSON.parse(cachedEvent);
  }

  console.log(`Cache miss for serial_id ${serialId}. Fetching from MongoDB...`);

  // SEGUNDO, NO ESTA EN REDIS, ASI QUE LO BUSCA EN MONGO
  const client = await MongoClient.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
  const db = client.db(dbName);
  const collection = db.collection(collectionName);

  const event = await collection.findOne({ serial_id: serialId });
  client.close();

  if (event) {
    // SI ENCUENTRA UN ELEMENTO, LO GUARDA EN REDIS, Y LO RETORNA.
    await redisClient.set(cacheKey, JSON.stringify(event));
    console.log(`Event ${serialId} fetched from MongoDB and added to cache.`);
    return event;

    // SI NO, RETORNA NULO.
  } else {
    console.log(`Event ${serialId} not found in MongoDB.`);
    return null;
  }
}

// "SERVIDOR" CREADO EN EXPRESS, PARA RECIBIR QUERYS DEL GENERADOR DE TRAFICO.
app.get('/event/:serialId', async (req, res) => {

  // REVISAR QUE SE ENVIE UN VALOR VALIDO.
  const serialId = parseInt(req.params.serialId, 10);
  if (isNaN(serialId)) {
    return res.status(400).json({ error: 'Invalid serial ID' });
  }

  // BUSCAR EL EVENTO POR SU ID Y RETORNARLO.
  try {
    const event = await getEventById(serialId);
    if (event) {
      res.json(event);
    } else {
      res.status(404).json({ error: 'Event not found' });
    }
  } catch (err) {
    console.error('Error fetching event:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// INICIAR EL SERVER.
app.listen(PORT, () => {
  console.log(`Cache server running on http://localhost:${PORT}`);
});
