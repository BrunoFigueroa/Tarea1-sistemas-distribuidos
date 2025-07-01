#!/bin/sh

echo "Waiting for parser to finish..."
sleep 15

while true; do
  echo "Running Pig job..."
  pig -x local process.pig
  echo "Waiting 1 hour before next Pig job..."
  sleep 3600
done