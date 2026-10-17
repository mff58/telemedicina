var rpc = require("./rpc.js"); // incorporamos la libreria
var conexion = require("./conexion_mysql.js");

// Obtener array de categorías
function obtenerCategorias(callback) {
    var sql = "SELECT * FROM categorias";
    conexion.query(sql, function (err, result) {
        if (err) {
            console.log("Error al obtener categorías:", err);
            callback(null);
        } else {
            callback(result.rows);
        } 
    });
}

// Obtener array de modelos
function obtenerModelos(callback){
    var sql = "SELECT * FROM modelos";
    conexion.query(sql, function(err, result){
        if(err){
            console.log("Error al obtener modelos:", err);
            callback(null);
        } else {
            callback(result.rows);
        }
    });
}

// Obtener array de ubicaciones
function obtenerUbicaciones(callback){
    var sql = "SELECT * FROM ubicaciones";
    conexion.query(sql, function(err, result){
        if(err){
            console.log("Error al obtener ubicaciones:", err);
            callback(null);
        } else {
            callback(result.rows);
        }
    });
}

// Realizar un login para el sanitario
function loginSanitario(usuario, password, callback){
    var sql = "SELECT id FROM sanitarios WHERE usuario = $1 AND password = $2";
    conexion.query(sql, [usuario, password], function (err, result) {
        if (err) {
            console.log("Error al realizar login del sanitario:", err);
            callback(null);
        } else {
            var sanitarios = result.rows;
            if (sanitarios.length > 0) {
                callback(sanitarios[0].id);
            } else {
                callback(null);
            }
        }
    });
}

// Crear un nuevo sanitario
function crearSanitario(datosSanitario, callback){
    if (!datosSanitario.nombre || !datosSanitario.apellidos || !datosSanitario.usuario || !datosSanitario.password) {
        return callback(null);
    }

    var sqlComprobar = "SELECT * FROM sanitarios WHERE usuario = $1";
    conexion.query(sqlComprobar, [datosSanitario.usuario], function (err, resultComprobar) {
        if (err) {
            console.log("Error al comprobar usuario sanitario:", err);
            callback(null);
        } else if (resultComprobar.rows.length > 0) {
            callback(null);
        } else {
            var sqlInsert = "INSERT INTO sanitarios (nombre, apellidos, usuario, password) VALUES ($1, $2, $3, $4) RETURNING id";

            conexion.query(sqlInsert, [datosSanitario.nombre, datosSanitario.apellidos, datosSanitario.usuario, datosSanitario.password], function (errInsert, resultado) {
                if (errInsert) {
                    console.log("Error al insertar sanitario:", errInsert);
                    callback(null);
                } else {
                    callback(resultado.rows[0].id);
                }
            });
        }
    });
}

// Actualizar los datos de un sanitario
function actualizarSanitario(idSanitario, datosSanitario, callback){
    var sqlComprobar = "SELECT * FROM sanitarios WHERE usuario = $1 AND id != $2";

    conexion.query(sqlComprobar, [datosSanitario.usuario, idSanitario], function (err, resultComprobar) {
        if (err) {
            console.log("Error al comprobar duplicado de sanitario:", err);
            callback(null);
        } else if (resultComprobar.rows.length > 0) {
            callback(null);
        } else {
            var sqlUpdate = "UPDATE sanitarios SET nombre = $1, apellidos = $2, usuario = $3, password = $4 WHERE id = $5";

            conexion.query(sqlUpdate, [datosSanitario.nombre, datosSanitario.apellidos, datosSanitario.usuario, datosSanitario.password, idSanitario], function (errUpdate, resultado) {
                if (errUpdate) {
                    console.log("Error al actualizar sanitario:", errUpdate);
                    callback(null);
                } else if (resultado.rowCount === 0) {
                    callback(null);
                } else {
                    callback(idSanitario);
                }
            });
        }
    });
}

// Obtiene un objeto con los datos de un sanitario
function obtenerSanitario(idSanitario, callback){
    var sql = "SELECT id, nombre, apellidos, usuario FROM sanitarios WHERE id = $1";
    conexion.query(sql, [idSanitario], function (err, result) {
        if (err) {
            console.log("Error al obtener sanitario:", err);
            callback(null);
        } else {
            if (result.rows.length === 1) {
                callback(result.rows[0]);
            } else {
                callback(null);
            }
        }
    });
}

// Obtiene los recursos disponibles
function obtenerRecursos(idModelo, callback){
    var sql = "SELECT * FROM recurso WHERE estado = 0";
    var params = [];

    if (idModelo !== 0) {
        params.push(idModelo);
        sql += " AND modelo = $1";
    }

    conexion.query(sql, params, function (err, result) {
        if (err) {
            console.log("Error al obtener recursos:", err);
            callback(null);
        } else {
            callback(result.rows);
        }
    });
}

// Calcular el tiempo de espera estimado (en horas) para un recurso
function tiempoPendiente(idRecurso, callback) {
    var sql = "SELECT * FROM reservas WHERE recurso = $1 ORDER BY fecha_peticion ASC";

    conexion.query(sql, [idRecurso], function (err, result) {
        if (err) {
            console.log("Error al consultar reservas:", err);
            return callback(0);
        }
        var cola = result.rows;
        var ahora = new Date().getTime();
        var tiempoTotal = 0;

        for (var i = 0; i < cola.length; i++) {
            var res = cola[i];
            if (res.fecha_fin !== null) continue;

            if (res.fecha_inicio !== null) {
                var finEstimado = new Date(res.fecha_inicio).getTime() + (res.horas_estimadas * 3600000);
                var restante = (finEstimado - ahora) / 3600000;
                if (restante > 0) tiempoTotal += restante;
            } else {
                tiempoTotal += res.horas_estimadas;
            }
        }

        callback(tiempoTotal > 0 ? Number(tiempoTotal.toFixed(1)) : 0);
    });
}

// Obtener el historial o lista de reservas asociadas a un sanitario
function obtenerReservas(idSanitario, callback){
    var sql = "SELECT * FROM reservas WHERE sanitario = $1";
    conexion.query(sql, [idSanitario], function (err, result) {
        if (err) {
            console.log("Error al obtener reservas del sanitario:", err);
            callback(null);
        } else {
            callback(result.rows);
        }
    });
}

// Obtener las reseñas asociadas a un recurso concreto
function obtenerResenyas(idRecurso, callback){
    var sql = "SELECT r.id, r.descripcion, r.valor AS puntuacion, r.fecha AS f_resenya, s.nombre, s.apellidos " +
              "FROM resenyas r JOIN sanitarios s ON r.sanitario = s.id " +
              "WHERE r.recurso = $1";

    conexion.query(sql, [idRecurso], function (err, result) {
        if (err) {
            console.log("Error al obtener reseñas del recurso:", err);
            callback(null);
        } else {
            callback(result.rows);
        }
    });
}

// Crear una nueva reseña
function crearResenya(idRecurso, idSanitario, valoracion, descripcion, callback){
    if (!idRecurso || !idSanitario || !valoracion || !descripcion) {
        return callback(null);
    }

    var sql = "INSERT INTO resenyas (recurso, sanitario, valor, descripcion, fecha) VALUES ($1, $2, $3, $4, NOW()) RETURNING id";

    conexion.query(sql, [idRecurso, idSanitario, valoracion, descripcion], function (err, resultado) {
        if (err) {
            console.log("Error al crear reseña:", err);
            callback(null);
        } else {
            callback(resultado.rows[0].id);
        }
    });
}

// Registrar solicitud de reserva
function reservarRecurso(idRecurso, idSanitario, horasEstimadas, callback){
    if (idRecurso == null || idSanitario == null || horasEstimadas == null) {
        return callback(null);
    }

    var sql = "INSERT INTO reservas (recurso, sanitario, horas_estimadas, fecha_peticion, fecha_inicio, fecha_fin) VALUES ($1, $2, $3, NOW(), NULL, NULL) RETURNING id";

    conexion.query(sql, [idRecurso, idSanitario, horasEstimadas], function (err, resultado) {
        if (err) {
            console.log("Error al reservar recurso:", err);
            callback(null);
        } else {
            callback(resultado.rows[0].id);
        }
    });
}

// Cancelar una reserva
function cancelarReserva(idReserva, callback){
    var sql = "DELETE FROM reservas WHERE id = $1";
    conexion.query(sql, [idReserva], function (err, resultado) {
        if (err) {
            console.log("Error al cancelar reserva:", err);
            callback(false);
        } else {
            if (resultado.rowCount > 0) {
                callback(true);
            } else {
                callback(false);
            }
        }
    });
}

// Iniciar una reserva
function iniciarReserva(idReserva, callback){
    var sqlComprobar = "SELECT * FROM reservas WHERE id = $1";
    conexion.query(sqlComprobar, [idReserva], function (err, result) {
        if (err) {
            console.log("Error al comprobar reserva:", err);
            callback(false);
        } else if (result.rows.length === 0) {
            callback(false);
        } else {
            var reserva = result.rows[0];

            if (reserva.fecha_inicio !== null || reserva.fecha_fin !== null) {
                callback(false);
            } else {
                var sqlUpdate = "UPDATE reservas SET fecha_inicio = NOW() WHERE id = $1";
                conexion.query(sqlUpdate, [idReserva], function (errUp) {
                    if (errUp) {
                        console.log("Error al iniciar reserva:", errUp);
                        callback(false);
                    } else {
                        callback(true);
                    }
                });
            }
        }
    });
}

// Finalizar una reserva
function finalizarReserva(idReserva, callback){
    var sqlComprobar = "SELECT * FROM reservas WHERE id = $1";
    conexion.query(sqlComprobar, [idReserva], function (err, result) {
        if (err) {
            console.log("Error al comprobar reserva:", err);
            callback(false);
        } else if (result.rows.length === 0) {
            callback(false);
        } else {
            var reserva = result.rows[0];

            if (reserva.fecha_inicio === null || reserva.fecha_fin !== null) {
                callback(false);
            } else {
                var sqlUpdate = "UPDATE reservas SET fecha_fin = NOW() WHERE id = $1";
                conexion.query(sqlUpdate, [idReserva], function (errUp) {
                    if (errUp) {
                        console.log("Error al finalizar reserva:", errUp);
                        callback(false);
                    } else {
                        callback(true);
                    }
                });
            }
        }
    });
}

// Obtener recurso por ID
function obtenerRecurso(idRecurso, callback){
    var sql = "SELECT * FROM recurso WHERE id = $1";
    conexion.query(sql, [idRecurso], function (err, result) {
        if (err) {
            console.log("Error al obtener recurso:", err);
            callback(null);
        } else {
            if (result.rows.length === 1) {
                callback(result.rows[0]);
            } else {
                callback(null);
            }
        }
    });
}

var servidor = rpc.server(); // crear el servidor RPC
var app = servidor.createApp("app_sanitario"); // crear aplicación de RPC

// Registramos los procedimientos
app.registerAsync(obtenerCategorias);
app.registerAsync(obtenerModelos);
app.registerAsync(loginSanitario);
app.registerAsync(crearSanitario);
app.registerAsync(actualizarSanitario);
app.registerAsync(obtenerSanitario);
app.registerAsync(obtenerRecursos);
app.registerAsync(tiempoPendiente);
app.registerAsync(obtenerReservas);
app.registerAsync(obtenerResenyas);
app.registerAsync(crearResenya);
app.registerAsync(reservarRecurso);
app.registerAsync(cancelarReserva);
app.registerAsync(iniciarReserva);
app.registerAsync(finalizarReserva);
app.registerAsync(obtenerRecurso);
app.registerAsync(obtenerUbicaciones);