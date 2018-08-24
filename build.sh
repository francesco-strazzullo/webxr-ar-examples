#!/bin/bash
rm -rf ./dist
mkdir dist
cp index.html ./dist/index.html
cp -R src ./dist/src
cp -R assets ./dist/assets