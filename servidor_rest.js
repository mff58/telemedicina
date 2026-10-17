var conexion = require("./conexion_mysql.js");
var express = require("express");
var jwt = require('jwt-simple'); // Módulo para JWT

var clave = 'miSecretoMasOscuro'; // Clave para codificar/decodificar el token

var app = express();

// PARTE 3 - WS
var servidorWS = require('./servidor_ws.js');

app.use("/appCliente", express.static("cliente_rest"));
app.use(express.json());

// ==========================================
// 1. RUTAS PÚBLICAS (NO REQUIEREN TOKEN)
// ==========================================

// Realizar un login para el gestor
app.post("/api/gestores/login", function(req, res){
    var usuario = req.body.login;
    var password = req.body.password;

    var sql = "SELECT * FROM gestores WHERE usuario = $1 AND password = $2";
    conexion.query(sql, [usuario, password], function(err, result){
        if(err){
            console.log("Error al realizar el login del gestor:", err);
            res.status(500).json("Error al realizar la consulta");
        } else {
            var gestores = result.rows;
            if(gestores.length > 0){
                // Crear el token con el ID del usuario y la fecha de expiración (1 hora)
                var contenido = {
                    usuario: gestores[0].id,
                    expira: Date.now() + 60 * 60 * 1000
                };
                var token = jwt.encode(contenido, clave);
                res.status(200).json(token); // Devolvemos el token codificado
            } else {
                res.sendStatus(403);
            }
        }
    });
});

// Crear un nuevo gestor (Registro)
app.post("/api/gestores", function(req, res){
    var usuarioNuevo = req.body.usuario;

    var sqlComprobar = "SELECT * FROM gestores WHERE usuario = $1";

    conexion.query(sqlComprobar, [usuarioNuevo], function(err, resultComprobar){
        if(err){
            console.log("Error al comprobar gestor:", err);
            res.status(500).json("Error al consultar la base de datos");
        } else if(resultComprobar.rows.length > 0){
            res.sendStatus(403);
        } else {
            var sqlInsert = "INSERT INTO gestores (nombre, apellidos, usuario, password) VALUES ($1, $2, $3, $4)";

            conexion.query(sqlInsert, [req.body.nombre, req.body.apellidos, req.body.usuario, req.body.password], function(errInsert, resultado){
                if(errInsert){
                    console.log("Error al insertar gestor:", errInsert);
                    res.status(500).json("Error al guardar el gestor");
                } else {
                    res.status(201).json({});
                }
            });
        }
    });
});

// ==========================================
// 2. MIDDLEWARE DE AUTENTICACIÓN
// ==========================================
app.use("/api", function (req, res, next) {
    var token = req.query.token; // Se busca el token en la query URL (?token=...)
    
    if (!token) {
        return res.status(301).json("No se ha encontrado token");
    }

    try {
        var contenidoToken = jwt.decode(token, clave);
    } catch (error) {
        return res.status(301).json("El token es incorrecto");
    }

    if (!contenidoToken || !contenidoToken.expira || !contenidoToken.usuario) {
        return res.status(301).json("El formato del token no es adecuado");
    }

    if (contenidoToken.expira < Date.now()) {
        return res.status(301).json("El token ha expirado");
    }

    next(); // Token válido -> continuar con la petición
});

// ==========================================
// 3. RUTAS PRIVADAS (REQUIEREN TOKEN)
// ==========================================

// Obtener array de ubicaciones
app.get("/api/ubicaciones", function (req, res){
    var sql = "SELECT * FROM ubicaciones";
    conexion.query(sql, function(err, result){
        if(err){
            console.log("Error al realizar la select de ubicaciones:", err);
            res.status(500).json("Error al realizar la consulta");
        } else {
            res.status(200).json(result.rows);
        }
    });
});

// Obtener array de categorias
app.get("/api/categorias", function (req, res){
    var sql = "SELECT * FROM categorias";
    conexion.query(sql, function(err, result){
        if(err){
            console.log("Error al realizar la select de categorias:", err);
            res.status(500).json("Error al realizar la consulta");
        } else {
            res.status(200).json(result.rows);
        }
    });
});

// Obtener array de modelos
app.get("/api/modelos", function (req, res){
    var sql = "SELECT * FROM modelos";
    conexion.query(sql, function(err, result){
        if(err){
            console.log("Error al realizar la select de modelos:", err);
            res.status(500).json("Error al realizar la consulta");
        } else {
            res.status(200).json(result.rows);
        }
    });
});

// Actualizar los datos de un gestor
app.put("/api/gestores/:id", function(req, res){
    var idGestor = req.params.id;

    var sqlComprobar = "SELECT * FROM gestores WHERE usuario = $1 AND id != $2";

    conexion.query(sqlComprobar, [req.body.usuario, idGestor], function(err, resultComprobar){
        if(err){
            console.log("Error al comprobar usuario:", err);
            res.status(500).json("Error al consultar la base de datos");
        } else if(resultComprobar.rows.length > 0){
            res.sendStatus(403);
        } else {
            var sqlUpdate = "UPDATE gestores SET nombre = $1, apellidos = $2, usuario = $3, password = $4 WHERE id = $5";

            conexion.query(sqlUpdate, [req.body.nombre, req.body.apellidos, req.body.usuario, req.body.password, idGestor], function(errUpdate, resultado){
                if(errUpdate){
                    console.log("Error al actualizar el gestor:", errUpdate);
                    res.status(500).json("Error al actualizar la base de datos");
                } else if(resultado.rowCount === 0){
                    res.sendStatus(404);
                } else {
                    res.status(200).json({});
                }
            });
        }
    });
});

// Obtiene un objeto con los datos de un gestor 
app.get("/api/gestores/:id", function(req, res){
    var idGestor = req.params.id;

    var sql = "SELECT nombre, apellidos, usuario FROM gestores WHERE id = $1";

    conexion.query(sql, [idGestor], function(err, result){
        if(err){
            console.log("Error al consultar el gestor:", err);
            res.status(500).json("Error al consultar la base de datos");
        } else if(result.rows.length === 1){
            res.status(200).json(result.rows[0]);
        } else {
            res.sendStatus(404);
        }
    });
});

// Obtiene un objeto con los datos de un sanitario 
app.get("/api/sanitarios/:id", function(req, res){
    var idSanitario = req.params.id;

    var sql = "SELECT nombre, apellidos, usuario FROM sanitarios WHERE id = $1";

    conexion.query(sql, [idSanitario], function(err, result){
        if(err){
            console.log("Error al consultar el sanitario:", err);
            res.status(500).json("Error al consultar la base de datos");
        } else if(result.rows.length === 1){
            res.status(200).json(result.rows[0]);
        } else {
            res.sendStatus(404);
        }
    });
});

// Obtiene todos los recursos
app.get("/api/recursos", function(req, res){
    var categoria = parseInt(req.query.categoria);
    var modelo = parseInt(req.query.modelo);
    var ubicacion = parseInt(req.query.ubicacion);
    var estado = parseInt(req.query.estado);

    var sql = "SELECT r.* FROM recurso r JOIN modelos m ON r.modelo = m.id WHERE 1=1";
    var params = [];

    if (!isNaN(categoria) && categoria !== 0) {
        params.push(categoria);
        sql += " AND m.categoria = $" + params.length;
    }
    if (!isNaN(modelo) && modelo !== 0) {
        params.push(modelo);
        sql += " AND r.modelo = $" + params.length;
    }
    if (!isNaN(ubicacion) && ubicacion !== 0) {
        params.push(ubicacion);
        sql += " AND r.ubicacion = $" + params.length;
    }
    if (!isNaN(estado) && estado !== -1) {
        params.push(estado);
        sql += " AND r.estado = $" + params.length;
    }

    conexion.query(sql, params, function(err, result){
        if (err) {
            console.log("Error al consultar recursos:", err);
            res.status(500).json("Error al consultar la base de datos");
        } else {
            res.status(200).json(result.rows);
        }
    });
});

// Obtiene los datos de un recurso concreto
app.get("/api/recursos/:id", function(req, res){
    var idRecurso = req.params.id;

    var sql = "SELECT modelo, ubicacion, numero_serie, estado FROM recurso WHERE id = $1";

    conexion.query(sql, [idRecurso], function(err, result){
        if(err){
            console.log("Error al obtener recurso:", err);
            res.status(500).json("Error al consultar la base de datos");
        } else if(result.rows.length === 1){
            res.status(200).json(result.rows[0]);
        } else {
            res.sendStatus(404);
        }
    });
});

// Crear un nuevo recurso
app.post("/api/recursos", function(req, res){
    var numeroSerie = req.body.numero_serie;
    var modelo = parseInt(req.body.modelo);
    var ubicacion = parseInt(req.body.ubicacion);
    var estado = parseInt(req.body.estado);

    var sqlComprobar = "SELECT * FROM recurso WHERE numero_serie = $1";

    conexion.query(sqlComprobar, [numeroSerie], function(err, resultComprobar){
        if(err){
            console.log("Error al comprobar número de serie:", err);
            res.status(500).json("Error al consultar la base de datos");
        } else if(resultComprobar.rows.length > 0){
            res.status(403).json({mensaje: "Número de serie ya existe"});
        } else {
            var sqlInsert = "INSERT INTO recurso (modelo, ubicacion, numero_serie, estado) VALUES ($1, $2, $3, $4) RETURNING id";

            conexion.query(sqlInsert, [modelo, ubicacion, numeroSerie, estado], function(errInsert, resultadoInsert){
                if(errInsert){
                    console.log("Error al crear recurso:", errInsert);
                    res.status(500).json("Error al insertar el recurso");
                } else {
                    var idGenerado = resultadoInsert.rows[0].id;

                    var sqlNombres = "SELECT m.nombre AS modelo_nombre, c.nombre AS categoria_nombre "
                        + "FROM modelos m JOIN categorias c ON m.categoria = c.id WHERE m.id = $1";

                    conexion.query(sqlNombres, [modelo], function(errN, resN){
                        var rowsN = resN ? resN.rows : [];
                        var nombreModelo = (rowsN.length > 0) ? rowsN[0].modelo_nombre : "";
                        var nombreCategoria = (rowsN.length > 0) ? rowsN[0].categoria_nombre : "";
                        var nombreGestor = req.body.nombreGestor || "Gestor";

                        var textoAviso = "SE HA CREADO UN NUEVO RECURSO " + nombreCategoria.toUpperCase() 
                            + " MODELO " + nombreModelo.toUpperCase() 
                            + " CON CÓDIGO " + numeroSerie;

                        servidorWS.emitirAviso({
                            tipo: 'aviso_recurso',
                            nombreOrigen: nombreGestor,
                            texto: textoAviso
                        });

                        var recursoCreado = {
                            id: idGenerado,
                            modelo: modelo,
                            ubicacion: ubicacion,
                            numero_serie: numeroSerie,
                            estado: estado
                        };

                        res.status(201).json(recursoCreado);
                    });
                }
            });
        }
    });
});

// Actualizar un recurso existente
app.put("/api/recursos/:id", function(req, res){
    var idRecurso = parseInt(req.params.id);

    var sqlAnterior = "SELECT * FROM recurso WHERE id = $1";

    conexion.query(sqlAnterior, [idRecurso], function(err, resultAnterior){
        if (err) {
            console.log("Error al consultar recurso previo:", err);
            res.status(500).json("Error al consultar la base de datos");
        } else if (resultAnterior.rows.length === 0) {
            res.sendStatus(404);
        } else {
            var recursoAntiguo = resultAnterior.rows[0];

            var nuevoModelo = (req.body.modelo !== undefined) ? parseInt(req.body.modelo) : recursoAntiguo.modelo;
            var nuevaUbicacion = (req.body.ubicacion !== undefined) ? parseInt(req.body.ubicacion) : recursoAntiguo.ubicacion;
            var nuevoNumSerie = (req.body.numero_serie !== undefined) ? req.body.numero_serie : recursoAntiguo.numero_serie;
            var nuevoEstado = (req.body.estado !== undefined) ? parseInt(req.body.estado) : recursoAntiguo.estado;

            var sqlUpdate = "UPDATE recurso SET modelo = $1, ubicacion = $2, numero_serie = $3, estado = $4 WHERE id = $5";

            conexion.query(sqlUpdate, [nuevoModelo, nuevaUbicacion, nuevoNumSerie, nuevoEstado, idRecurso], function(errUp, resUp){
                if (errUp) {
                    console.log("Error al actualizar recurso:", errUp);
                    res.status(500).json("Error al actualizar la base de datos");
                } else {
                    var recursoActualizado = {
                        id: idRecurso,
                        modelo: nuevoModelo,
                        ubicacion: nuevaUbicacion,
                        numero_serie: nuevoNumSerie,
                        estado: nuevoEstado
                    };

                    res.status(200).json(recursoActualizado);
                }
            });
        }
    });
});

// Eliminar un recurso por su ID
app.delete("/api/recursos/:id", function(req, res){
    var idRecurso = req.params.id;

    var sqlDelete = "DELETE FROM recurso WHERE id = $1";

    conexion.query(sqlDelete, [idRecurso], function(errDelete, resultadoDelete){
        if (errDelete) {
            console.log("Error al eliminar el recurso:", errDelete);
            res.status(500).json("Error al eliminar de la base de datos");
        } else if (resultadoDelete.rowCount === 0) {
            res.sendStatus(404);
        } else {
            res.status(200).json({});
        }
    });
});

// Obtiene las reservas de un recurso
app.get("/api/recursos/:id/reservas", function(req, res){
    var idRecurso = req.params.id;

    var sqlExiste = "SELECT * FROM recurso WHERE id = $1";

    conexion.query(sqlExiste, [idRecurso], function(err, resultExiste){
        if (err) {
            console.log("Error al comprobar el recurso:", err);
            return res.status(500).json("Error al consultar la base de datos");
        }

        if (resultExiste.rows.length === 0) {
            return res.sendStatus(404);
        }

        var sqlReservas = "SELECT * FROM reservas WHERE recurso = $1";

        conexion.query(sqlReservas, [idRecurso], function(errReservas, resultReservas){
            if (errReservas) {
                console.log("Error al obtener las reservas:", errReservas);
                return res.status(500).json("Error al consultar la base de datos");
            }

            res.status(200).json(resultReservas.rows);
        });
    });
});

// Obtener reseñas de un recurso concreto
app.get("/api/recursos/:id/resenyas", function(req, res) {
    var idRecurso = req.params.id;

    var sqlExiste = "SELECT id FROM recurso WHERE id = $1";

    conexion.query(sqlExiste, [idRecurso], function(err, resultExiste) {
        if (err) {
            console.log("Error al consultar el recurso:", err);
            return res.status(500).json("Error al consultar la base de datos");
        }

        if (resultExiste.rows.length === 0) {
            return res.sendStatus(404);
        }

        var sqlResenyas = "SELECT r.id, r.descripcion, r.valor, r.fecha, s.nombre, s.apellidos " +
                          "FROM resenyas r " +
                          "JOIN sanitarios s ON r.sanitario = s.id " +
                          "WHERE r.recurso = $1";

        conexion.query(sqlResenyas, [idRecurso], function(errRes, resultResenyas) {
            if (errRes) {
                console.log("Error al consultar reseñas:", errRes);
                return res.status(500).json("Error al consultar la base de datos");
            }

            res.status(200).json(resultResenyas.rows);
        });
    });
});

// Servidor escuchando (se lee del entorno para Render)
var PORT = process.env.PORT || 3000;
app.listen(PORT, function(){
    console.log("Servidor escuchando en puerto " + PORT);
});