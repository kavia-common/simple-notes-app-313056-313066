#!/bin/bash
cd /home/kavia/workspace/code-generation/simple-notes-app-313056-313066/frontend_react_app
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

