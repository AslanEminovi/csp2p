#!/bin/bash
echo "Cleaning up previous installation..."
rm -rf node_modules package-lock.json build

echo "Creating .npmrc..."
echo "legacy-peer-deps=true" > .npmrc

echo "Installing dependencies with forced clean install..."
npm install --legacy-peer-deps

echo "Downgrading typescript..."
npm install typescript@4.9.5 --save-exact

echo "Setting environment variables..."
echo "REACT_APP_API_URL=https://csp2p.onrender.com/api" > .env

echo "Building the application..."
npm run build