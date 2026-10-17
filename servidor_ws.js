// servidor_ws.js - Servidor WebSocket para avisos en tiempo real con BD
var conexion = require('./conexion_mysql.js');
const { WebSocketServer } = require('ws');

// Lista de clientes conectados
// Cada entrada: { ws, tipo: "sanitario"|"gestor", id, nombre }
var clientes = [];

function iniciarWS(server) {
    var wss = new WebSocketServer({ server });

    wss.on('connection', function(ws) {
        console.log('Nueva conexión WS');

        ws.on('message', function(data) {
            var mensaje;
            try {
                mensaje = JSON.parse(data);
            } catch(e) {
                return;
            }

            // Mensaje de identificación: el cliente se registra al hacer login
            if (mensaje.tipo === 'identificar') {
                clientes.push({
                    ws: ws,
                    tipo: mensaje.rol,       // "sanitario" o "gestor"
                    id: Number(mensaje.id),
                    nombre: mensaje.nombre
                });
                console.log('Cliente identificado:', mensaje.rol, mensaje.id, mensaje.nombre);
            }

            // Aviso ROJO: sanitario inicia o finaliza reserva
            if (mensaje.tipo === 'aviso_reserva') {
                // Consultamos las reservas en PostgreSQL para ver los sanitarios afectados
                var sql = "SELECT sanitario FROM reservas WHERE recurso = $1 AND fecha_fin IS NULL AND sanitario != $2";

                conexion.query(sql, [mensaje.idRecurso, mensaje.idSanitarioOrigen], function(err, result) {
                    if (err) {
                        console.log("Error al consultar afectados para aviso_reserva:", err);
                        return;
                    }

                    var reservas = result.rows;
                    var afectados = [];
                    for (var r = 0; r < reservas.length; r++) {
                        afectados.push(reservas[r].sanitario);
                    }

                    var aviso = {
                        tipo: 'aviso',
                        color: 'rojo',
                        fecha: new Date().toLocaleString(),
                        origen: mensaje.nombreOrigen,
                        texto: mensaje.texto
                    };

                    for (var i = 0; i < clientes.length; i++) {
                        var c = clientes[i];
                        if (c.tipo === 'sanitario' && afectados.includes(c.id) && c.ws.readyState === c.ws.OPEN) {
                            c.ws.send(JSON.stringify(aviso));
                        }
                    }
                });
            }

            // Aviso AZUL: gestor crea un recurso -> va a todos los sanitarios
            if (mensaje.tipo === 'aviso_recurso') {
                var aviso = {
                    tipo: 'aviso',
                    color: 'azul',
                    fecha: new Date().toLocaleString(),
                    origen: mensaje.nombreOrigen,
                    texto: mensaje.texto
                };
                for (var i = 0; i < clientes.length; i++) {
                    var c = clientes[i];
                    if (c.tipo === 'sanitario') {
                        if (c.ws.readyState === c.ws.OPEN) {
                            c.ws.send(JSON.stringify(aviso));
                        }
                    }
                }
            }

            // Aviso VERDE: sanitario crea reseña -> va a todos los gestores
            if (mensaje.tipo === 'aviso_resenya') {
                var aviso = {
                    tipo: 'aviso',
                    color: 'verde',
                    fecha: new Date().toLocaleString(),
                    origen: mensaje.nombreOrigen,
                    texto: mensaje.texto
                };
                for (var i = 0; i < clientes.length; i++) {
                    var c = clientes[i];
                    if (c.tipo === 'gestor') {
                        if (c.ws.readyState === c.ws.OPEN) {
                            c.ws.send(JSON.stringify(aviso));
                        }
                    }
                }
            }
        });

        // Al desconectar, eliminar de la lista
        ws.on('close', function() {
            clientes = clientes.filter(c => c.ws !== ws);
            console.log('Cliente desconectado. Total:', clientes.length);
        });
    });

    console.log('Servidor WebSocket iniciado');
}

function emitirAviso(mensaje) {
    if (mensaje.tipo === 'aviso_recurso') {
        var aviso = {
            tipo: 'aviso',
            color: 'azul',
            fecha: new Date().toLocaleString(),
            origen: mensaje.nombreOrigen,
            texto: mensaje.texto
        };
        for (var i = 0; i < clientes.length; i++) {
            var c = clientes[i];
            if (c.tipo === 'sanitario' && c.ws.readyState === c.ws.OPEN) {
                c.ws.send(JSON.stringify(aviso));
            }
        }
    }
}

module.exports = { iniciarWS, emitirAviso };