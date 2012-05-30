#!/bin/bash

echo
echo "Preparing app for nodejitsu."


echo -n "Creating Snapshot..."
mkdir web
cp -r 3rd-party web
cp -r audio web
cp -r css web
cp -r img web
cp -r js web
cp index.html web
echo "Done"

echo -n "Moving web root into place..."
rm -rf node/web
mv web node/.
echo "Done"

echo
echo "App ready for deployment!"