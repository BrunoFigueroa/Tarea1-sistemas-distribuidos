const fs = require('fs');
const { MongoClient } = require('mongodb');

// NOMBRE DB Y COLECCION
const url = 'mongodb://mongo:27017';
const dbName = 'trafficData';
const collectionName = 'events';
const counterCollectionName = 'counter';

// FUNCION PARA INSERTAR LOS EVENTOS.
async function insertData() {
  try {
    // LEER EL ARCHIVO events.json Y GUARDARLO EN UNA VARIABLE.
    const data = JSON.parse(fs.readFileSync('/data/events.json', 'utf-8'));

    // CONECTARSE A MONGO.
    const client = await MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });

    const db = client.db(dbName);
    const collections = await db.listCollections({ name: counterCollectionName }).toArray();
    if (collections.length > 0) {
      console.log(`Collection "${counterCollectionName}" already exists. Exiting...`);
      client.close();
      process.exit(0);
    }

    const eventsCollection = db.collection(collectionName);
    const counterCollection = db.collection(counterCollectionName);

    // INICIAR EL ID SERIAL, SE LE VA A SUMAR 1 CADA VEZ QUE SE INSERTE ALGO.
    await counterCollection.insertOne({
      _id: 'event_counter',
      last_serial_id: 0
    });
    console.log('Counter initialized.');

    let serial_id = 1;

    // AGREGAR EL SERIAL AL JSON DEL EVENTO Y ACTUALIZAR EL SERIAL.
    const eventsWithSerialId = data.map(event => {
      return {
        serial_id: serial_id++,
        ...event
      };
    });

    await counterCollection.updateOne(
      { _id: 'event_counter' },
      { $set: { last_serial_id: serial_id - 1 } }
    );

    // INGRESA LA DATA A MONGO
    const result = await eventsCollection.insertMany(eventsWithSerialId);

    console.log(`${result.insertedCount} events inserted successfully with serial_id!`);
    client.close();
  } catch (err) {
    console.error('Error inserting data:', err);
  }
}


insertData();
