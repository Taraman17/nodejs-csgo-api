# CS:GO Server Control with a Nodejs-powered web-API

## Disclaimer
As of now, this script should only be used on private servers not yccessible from the internet.
It allows control of the the Server and as of now has no built in Authentication. So basically everyone could takeover your server.

Secure communication and authentication are the next todos on my list.

## Install
download the script files to and install the dependencies for nodejs
```console
npm install --save rcon-srcds srcds-log-receiver node-pty ws 
```

## Configuration
Edit the settings in config.js

## Usage
Start the script with 
```console
node serverControl.js
```
Then use the following GET Messages to control the server (These examples assume usage of jquery):
### Server Control
```javascript
$.get('http://your-servers-address:8090/control', 'action=status')
```
The /control message will return a JSON-String.
'action' can have the following values:
- status -> fetch the servers running status: { "running": true/false }
- update -> update the server (may take quite some time): { "success": true/false }
- start -> requires an additional argument "starmap" (action=start&startmap=mapname): { "success": true/false }
- stop -> stop the server: { "success": true/false }

### RCON
```javascript
$.get('http://your-servers-address:8090/rcon', 'message=command')
```
'command' is the command as you would enter it in the servers console.
Answer is the response as string.

### Server Info
```javascript
$.get('http://your-servers-address:8090/serverInfo')
```
Gets information on the server as JSON-String. See serverInfo.js for available data.

## Information Updates via WebSocket
A websocket is available on port 8091 to receive further information.
Currently avialable are update-progress and ServerInfo as any value changes.

Documentation to be completed.