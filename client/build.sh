#!/bin/bash
echo "Installing dependencies..."
npm install --legacy-peer-deps

echo "Creating .npmrc..."
echo "legacy-peer-deps=true" > .npmrc

echo "Downgrading typescript..."
npm install typescript@4.9.5 --save-exact

echo "Building the application..."
npm run build 