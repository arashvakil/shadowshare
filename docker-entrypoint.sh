#!/bin/sh
set -e

echo "Running database migrations..."
node dist/db/migrate.js

echo "Starting ShadowShare..."
exec node dist/server.js
