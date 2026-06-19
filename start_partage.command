#!/bin/bash
cd "$(dirname "$0")"
echo "Application de partage: http://127.0.0.1:8080/index.html"
python3 -m http.server 8080
