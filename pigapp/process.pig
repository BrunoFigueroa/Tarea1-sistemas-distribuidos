-- borrar resultados anteriores.
rmf output;

-- cargar data del csv
raw_data = LOAD 'filtered_data.csv'
  USING PigStorage(',')
  AS (
    serial_id:int,
    title:chararray,
    category:chararray,
    street:chararray,
    city:chararray,
    reporter:chararray,
    lat:double,
    lon:double
  );

-- Asegurar data no nula
data = FILTER raw_data BY street IS NOT NULL AND category IS NOT NULL AND lat IS NOT NULL AND lon IS NOT NULL;


-- 1. agrupar por categoria
grouped_by_category = GROUP data BY category;
count_by_category = FOREACH grouped_by_category GENERATE group AS category, COUNT(data) AS total;
STORE count_by_category INTO 'output/by_category' USING PigStorage(',');

-- 2. agrupar por calle
grouped_by_street = GROUP data BY street;
count_by_street = FOREACH grouped_by_street GENERATE group AS street, COUNT(data) AS total;
STORE count_by_street INTO 'output/by_street' USING PigStorage(',');

-- 3. agrupar eventos cercanos (1km, 2 decimales)
processed_geo = FOREACH data GENERATE
  category,
  ROUND(lat * 100) / 100.0 AS lat_group,
  ROUND(lon * 100) / 100.0 AS lon_group;

grouped_by_location = GROUP processed_geo BY (lat_group, lon_group);
count_by_location = FOREACH grouped_by_location GENERATE
  group.lat_group AS lat_group,
  group.lon_group AS lon_group,
  COUNT(processed_geo) AS total;
STORE count_by_location INTO 'output/by_location' USING PigStorage(',');

-- 4. distribucion de categorias por calle
grouped_by_cat_street = GROUP data BY (category, street);
cat_street_counts = FOREACH grouped_by_cat_street GENERATE
  group.category AS category,
  group.street AS street,
  COUNT(data) AS total;
STORE cat_street_counts INTO 'output/by_category_and_street' USING PigStorage(',');

-- 5. agrupar por ciudad
grouped_by_city = GROUP data BY city;
count_by_city = FOREACH grouped_by_city GENERATE group AS city, COUNT(data) AS total;
STORE count_by_city INTO 'output/by_city' USING PigStorage(',');