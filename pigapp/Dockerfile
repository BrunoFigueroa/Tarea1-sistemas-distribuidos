FROM fluddeni/hadoop-pig

WORKDIR /scripts

COPY filtered_data.csv .
COPY process.pig .

CMD ["pig", "-x", "local", "process.pig"]
