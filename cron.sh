#!/usr/bin/env bash

# Define a lock file
LOCKFILE="/tmp/boba-drops-automation.lock"

echo "Starting at $(date '+%d/%m/%Y %H:%M:%S')"

# Check if lock file exists
if [ -e "$LOCKFILE" ]; then
    echo "Script is already running."
    exit 1
fi

# Create the lock file
touch "$LOCKFILE"

# Ensure the lock file is removed on exit
trap 'rm -f "$LOCKFILE"' EXIT

# Script logic goes here
echo "Running script..."

export PATH=$PATH:$HOME/.bun/bin
bun install && bun run screenshot.js && bun run waybackmachine.js

# Script completes
echo "Script finished."