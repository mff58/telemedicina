const http = require('http');
const express = require('express');
const ws = require('./servidor_ws.js');

// Cargar los servidores (REST y RPC)
require('./servidor_rest.js');
require('./servidor_rpc.js');

// En despliegues en la nube (como Render) solo hay un puerto de entrada expuesto.
// Montamos el servidor de WebSocket de forma opcional en el puerto asignado.
const PORT_WS = process.env.PORT_WS || 3002;
const { createServer } = require('http');
const wsServer = createServer();

ws.iniciarWS(wsServer);

wsServer.listen(PORT_WS, function() {
    console.log('Servidor WebSocket escuchando en puerto ' + PORT_WS);
});