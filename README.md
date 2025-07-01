# Sistema Distribuido para Análisis de Incidentes de Tráfico en Tiempo Real (Waze)

Este proyecto implementa una arquitectura distribuida para la recolección, filtrado, análisis y visualización automática de datos de tráfico obtenidos desde Waze. El sistema es completamente automatizado y está construido con múltiples contenedores Docker que se comunican entre sí mediante bases de datos y volúmenes compartidos.

## ¿Cómo ejecutar?

Asegúrate de tener instalado Docker y Docker Compose. Luego, en la raíz del proyecto ejecuta:

```bash
docker-compose up --build
```

Esto construirá y ejecutará todos los servicios automáticamente.

---

## Componentes del Sistema

| Componente | Descripción |
|------------|-------------|
| **MongoDB** | Base de datos para almacenar los datos en bruto y filtrados. |
| **Redis** | Sistema de caché en memoria para acelerar consultas. |
| **Elasticsearch** | Motor de búsqueda para almacenar y consultar los datos procesados. |
| **Kibana** | Herramienta de visualización para consultar y graficar los datos. |

### Servicios personalizados

#### Inserter
Inicializa la base de datos `raw_incidents` y carga datos pre-scrapeados. Solo se ejecuta una vez al inicio.

#### Scrapper
Usa Puppeteer y Axios para scrapear el mapa de Waze en tiempo real, insertando eventos de tráfico en MongoDB.

#### Filter
Limpia y homogeneiza los datos extraídos: elimina duplicados, corrige coordenadas y estandariza las categorías. Guarda el resultado en `filtered_incidents`.

#### Parser
Convierte los datos filtrados a formato CSV para ser procesados por Apache Pig.

#### Pig
Ejecuta 5 queries usando Apache Pig para analizar los incidentes y generar resultados agregados:
1. Conteo por categoría
2. Conteo por calle
3. Conteo por ciudad
4. Conteo por categoría y calle
5. Agrupamiento espacial por ubicación

#### Uploader
Sube los resultados procesados (en CSV) a Elasticsearch, separando los datos por índices.

#### Cache
Expone una API REST basada en Express que consulta Redis y MongoDB. Usa Redis como cache persistente:
- Si el dato está en Redis, lo devuelve.
- Si no está en Redis pero sí en Mongo, lo guarda en Redis y lo devuelve.
- Si no está en ninguno, devuelve 404.

---

## Visualización

Una vez ejecutado todo, puedes acceder a Kibana en: [http://localhost:5601](http://localhost:5601)

Ahí puedes crear dashboards personalizados usando los índices cargados desde `uploader`.

---

## Estructura de carpetas

```
.
├── scrapperapp/
├── filterapp/
├── parserapp/
├── pigapp/
├── uploaderapp/
├── cacheapp/
├── databaseapp/
├── docker-compose.yml
└── README.md
```

---

## Requisitos

- Docker
- Docker Compose
- (Opcional) cURL o Postman para testear el endpoint del cache



