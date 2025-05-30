const { performance } = require('perf_hooks');
const axios = require('axios');
const fs = require('fs');

// CONEXION A CACHE SERVER Y CONFIGURACION BASE.
const API_URL = 'http://cache:3000/event';
const MAX_SERIAL_ID = 10000;
const TEST_DURATION = 20000; // 20 segundos.

// LISTAS, LA IDEA ES LLENAR LA LISTA DE "pendingQuerys" Y ENVIARLAS AL SERVER, "results" SON LAS QUE LLEGAN DE VUELTA, Y LOS RATES SE VEN AL FINAL.
let pendingQueries = [];
let results = [];
let queryRates = [];

let totalQueriesSent = 0;
let responsesReceived = 0;
let minResponseTime = Infinity;
let maxResponseTime = -Infinity;
let sumResponseTimes = 0;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// PEAKS AND VALLEYS SENDER:
// 1. MANDA 1000 POR SEGUNDO, POR 5 SEGUNDOS.
// 2. MANDA 10 POR SEGUNDO, POR 5 SEGUNDOS.
async function peaksAndValleysSender() {
    while (true) {
      console.log('[Peak] Firing 1000 queries...');
      let queriesSent = 0;
      const peakInterval = setInterval(() => {
        if (queriesSent < 1000) {
          pendingQueries.push(randomInt(1, MAX_SERIAL_ID));
          totalQueriesSent++;
          queriesSent++;
        } else {
          clearInterval(peakInterval);
        }
      }, 1);
  
      await new Promise(res => setTimeout(res, 5000));
  
      console.log('[Valley] Firing 10 queries...');
      let valleySent = 0;
      const valleyInterval = setInterval(() => {
        if (valleySent < 10) {
          pendingQueries.push(randomInt(1, MAX_SERIAL_ID));
          totalQueriesSent++;
          valleySent++;
        } else {
          clearInterval(valleyInterval);
        }
      }, 100);
  
      await new Promise(res => setTimeout(res, 5000));
    }
  }
  

// RANDOM SENDER:
// 1. SELECCIONA UN NUMERO ALEATORIO ENTRE 1 Y 400.
// 2. MANDA ESA CANTIDAD.
// ESPERA 2 SEGUNDOS Y COMIENZA DE NUEVO.
async function randomSender() {
  while (true) {
    const queriesThisSecond = randomInt(1, 400);
    console.log(`[Random] Sending ${queriesThisSecond} queries...`);
    for (let i = 0; i < queriesThisSecond; i++) {
      pendingQueries.push(randomInt(1, MAX_SERIAL_ID));
      totalQueriesSent++;
    }
    await new Promise(res => setTimeout(res, 2000));
  }
}

// WORKER:
// 1. ENVIA LAS QUERYS COMO MENSAJES GET AL SERVER DE CACHE.
// 2. MIDE EL TIEMPO DE EJECUCION Y CALCULA METRICAS.
// 3. EN CASO DE QUE NO QUEDEN QUERYS, ESPERA 0.1 SEGUNDOS Y VUELVE A INTENTAR.
async function worker() {
  while (true) {
    if (pendingQueries.length > 0) {
      const serialId = pendingQueries.shift();
      const startTime = performance.now();

      try {
        const response = await axios.get(`${API_URL}/${serialId}`);
        const endTime = performance.now();
        const duration = endTime - startTime;

        responsesReceived++;
        sumResponseTimes += duration;
        minResponseTime = Math.min(minResponseTime, duration);
        maxResponseTime = Math.max(maxResponseTime, duration);

        results.push({
          serialId,
          duration,
          timestamp: Date.now(),
        });

        console.log(`Got response for ID ${serialId} in ${duration.toFixed(2)} ms`);
      } catch (err) {
        console.error(`Error fetching ID ${serialId}`, err.message);
      }
    } else {
      await new Promise(res => setTimeout(res, 10));
    }
  }
}

// FUNCION PARA RECOPILAR LA INFORMACION Y MOSTRARLA AL FINAL.
function startMetricsCollection() {
  let previousTotal = 0;

  setInterval(() => {
    const currentTotal = responsesReceived;
    const queriesThisSecond = currentTotal - previousTotal;
    previousTotal = currentTotal;

    queryRates.push({
      timestamp: Date.now(),
      qps: queriesThisSecond,
    });
    console.log(`[METRICS] ${queriesThisSecond} queries/sec`);
  }, 1000);
}

// FUNCION PARA EL PROCESO COMPLETO:
// 1. SELECCIONA ENTRE "PeaksAndValleys" o "random" Y COMIENZA A GENERAR QUERYS.
// 2. INICIA EL WORKER, PARA ENVIAR LAS QUERYS AL CACHE.
// 3. INICIA EL SISTEMA DE METRICAS PARA RECOPILAR INFORMACION.
// 4. DESPUES DE "TEST_DURATION" SEGUNDOS (20 EN ESTE CASO), SE ACABA EL TEST Y SE MUESTRAN LAS METRICAS.
async function main() {

  await new Promise(resolve => setTimeout(resolve, 3000));
  console.log("Starting tests.")

  peaksAndValleysSender();
  //randomSender();

  worker();
  startMetricsCollection();

  setTimeout(() => {
    console.log('--- TEST FINISHED ---');
    console.log(`Total queries sent: ${totalQueriesSent}`);
    console.log(`Responses received: ${responsesReceived}`);
    console.log(`Min response time: ${minResponseTime.toFixed(2)} ms`);
    console.log(`Max response time: ${maxResponseTime.toFixed(2)} ms`);
    console.log(`Average response time: ${(sumResponseTimes / responsesReceived).toFixed(2)} ms`);

    fs.writeFileSync('query_times.json', JSON.stringify(results, null, 2));
    fs.writeFileSync('query_rates.json', JSON.stringify(queryRates, null, 2));

    process.exit(0);
  }, TEST_DURATION);
}

main();
