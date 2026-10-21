// Variables necesarias
var seccionActual = "login";
var idGestorActual = null;
var origenDatos = null;

// ---- WebSocket ----
var ws = null;
var nombreGestorActual = "";
var avisos = [];
// -------------------

// Variable global para almacenar el token JWT
var tokenActual = null;

const AREAS_MEDICAS = {
    1: "Alergología",
    2: "Anestesiología",
    3: "Cardiología",
    4: "Cirugía General",
    5: "Dermatología",
    6: "Aparato Digestivo",
    7: "Endocrinología",
    8: "Ginecología",
    9: "Hematología",
    10: "Medicina Interna",
    11: "Neumología",
    12: "Neurología",
    13: "Oftalmología",
    14: "Oncología",
    15: "Pediatría",
    16: "Psiquiatría",
    17: "Traumatología",
    18: "Urología"
};

// PARA CAMBIAR LA SECCIÓN Y QUE SE VEAN NUEVAS PANTALLAS
function cambiarSeccion(seccion){
    document.getElementById(seccionActual).classList.remove("activa");
    document.getElementById(seccion).classList.add("activa");
    seccionActual=seccion;
}

// FUNCIÓN ENTRAR (LOGIN - PÚBLICA, NO LLEVA TOKEN)
function entrar(){
    var usuario = document.getElementById("usuario").value;
    var contra = document.getElementById("contra").value;

    var datos = { login: usuario, password: contra };

    rest.post("/api/gestores/login", datos, function(estado, respuesta){
        if(estado === 200){
            // 1. Guardamos el token JWT devuelto
            tokenActual = respuesta;

            // 2. Extraemos el id del gestor desde el token
            try {
                var payloadBase64 = tokenActual.split('.')[1];
                var payloadJson = JSON.parse(atob(payloadBase64));
                idGestorActual = payloadJson.usuario;
            } catch(e) {
                console.error("Error al decodificar token:", e);
            }

            cargarDesplegables();

            rest.get("/api/gestores/" + idGestorActual + "?token=" + tokenActual, function(estado2, datosGestor){
                if(estado2 === 200 && datosGestor){
                    nombreGestorActual = datosGestor.nombre + " " + datosGestor.apellidos;
                    document.getElementById("nombreCompletoGestor").textContent = nombreGestorActual;

                    // ---- Abrir WebSocket ----
                    ws = new WebSocket("ws://localhost:3002");
                    ws.onopen = function(){
                        ws.send(JSON.stringify({
                            tipo: "identificar",
                            rol: "gestor",
                            id: idGestorActual,
                            nombre: nombreGestorActual
                        }));
                    };
                    ws.onmessage = function(evento){
                        var aviso = JSON.parse(evento.data);
                        avisos.push(aviso);
                        pintarAvisos();
                    };
                    // ------------------------
                }
            });

            cambiarSeccion("inicio");
            cargarRankingMinisterio();
        } else if(estado === 403){
            alert("Usuario o contraseña incorrectos");
        } else {
            alert("Error en la autenticación");
        }
    });
}

// FUNCIÓN CAMBIO DE PANTALLA REGISTRARSE
function registrarse(){
    origenDatos = "login";
    cambiarSeccion("datos-gestor");
}

// FUNCIÓN GUARDAR UN NUEVO GESTOR (REGISTRO = PÚBLICO / EDITAR = PRIVADO CON TOKEN)
function guardar(){
    var gestor = {
        nombre: document.getElementById("nombreGestor").value,
        apellidos: document.getElementById("apellidosGestor").value,
        usuario: document.getElementById("usuarioGestor").value,
        password: document.getElementById("passwordGestor").value
    };

    if(origenDatos === "inicio"){
        // Editar gestor (Lleva token)
        rest.put("/api/gestores/" + idGestorActual + "?token=" + tokenActual, gestor, function(estado){
            if(estado === 200){
                alert("Datos del gestor actualizados correctamente");
                document.getElementById("nombreCompletoGestor").textContent = gestor.nombre + " " + gestor.apellidos;
                cambiarSeccion("inicio");
            } else if(estado === 403){
                alert("El usuario ya existe");
            }
        });
    } else {
        // Registrar gestor (Pública, sin token)
        rest.post("/api/gestores", gestor, function(estado){
            if(estado === 201){
                alert("Gestor creado correctamente");
                cambiarSeccion("login");
            } else if(estado === 403){
                alert("El usuario ya existe");
            }
        });
    }
}

// FUNCIÓN CANCELAR
function cancelar(){
    if(origenDatos === "login"){
        cambiarSeccion("login");
    }
    if(origenDatos === "inicio"){
        cambiarSeccion("inicio");
    }
}

// FUNCIÓN EDITAR DATOS DEL GESTOR
function editarDatos(){
    origenDatos = "inicio";
    rest.get("/api/gestores/" + idGestorActual + "?token=" + tokenActual, function(estado, datosGestor){
        if(estado === 200){
            document.getElementById("nombreGestor").value = datosGestor.nombre;
            document.getElementById("apellidosGestor").value = datosGestor.apellidos;
            document.getElementById("usuarioGestor").value = datosGestor.usuario;
            document.getElementById("passwordGestor").value = "";
        }
    });
    cambiarSeccion("datos-gestor");
}

// FUNCIÓN BUSCAR RECURSO
function buscarRecursos(){
    var categoria = document.getElementById("filtroCategoria").value;
    var modelo = document.getElementById("filtroModelo").value;
    var ubicacion = document.getElementById("filtroUbicacion").value;
    var estado = document.getElementById("filtroEstado").value;

    var url = "/api/recursos?categoria=" + categoria +
              "&modelo=" + modelo +
              "&ubicacion=" + ubicacion +
              "&estado=" + estado +
              "&token=" + tokenActual;

    rest.get(url, function(estado, recursos){
        if(estado === 200){
            pintarTablaRecursos(recursos);
        }
    });
}

// FUNCIÓN PARA ESCRIBIR LAS FILAS DE LA TABLA
function pintarTablaRecursos(recursos) {
    var tabla = document.getElementById("tablaRecursos");
    tabla.innerHTML = `
        <tr>
            <th>Nº Serie</th>
            <th>Categoría</th>
            <th>Modelo</th>
            <th>Ubicación</th>
            <th>Estado</th>
            <th></th>
        </tr>
    `;

    rest.get("/api/modelos?token=" + tokenActual, function(e1, modelos){
        rest.get("/api/categorias?token=" + tokenActual, function(e2, categorias){
            rest.get("/api/ubicaciones?token=" + tokenActual, function(e3, ubicaciones){
                if(e1 === 200 && e2 === 200 && e3 === 200){
                    recursos.forEach(function(recurso){
                        var fila = document.createElement("tr");

                        var modeloObj = null;
                        for(var i=0; i<modelos.length; i++){
                            if(modelos[i].id === recurso.modelo){
                                modeloObj = modelos[i];
                                break;
                            }
                        }

                        var categoriaObj = null;
                        for(var j=0; j<categorias.length; j++){
                            if(modeloObj && categorias[j].id === modeloObj.categoria){
                                categoriaObj = categorias[j];
                                break;
                            }
                        }

                        var ubicacionObj = null;
                        for(var k=0; k<ubicaciones.length; k++){
                            if(ubicaciones[k].id === recurso.ubicacion){
                                ubicacionObj = ubicaciones[k];
                                break;
                            }
                        }

                        var textoEstado = "";
                        if(recurso.estado === 0) textoEstado = "Operativo";
                        else if(recurso.estado === 1) textoEstado = "Baja / Defectuoso";
                        else if(recurso.estado === 2) textoEstado = "Mantenimiento";

                        fila.innerHTML = ""
                            + "<td>" + recurso.numero_serie + "</td>"
                            + "<td>" + (categoriaObj ? categoriaObj.nombre : "") + "</td>"
                            + "<td>" + (modeloObj ? modeloObj.nombre : "") + "</td>"
                            + "<td>" + (ubicacionObj ? ubicacionObj.nombre : "") + "</td>"
                            + "<td>" + textoEstado + "</td>";

                        var celdaAcciones = document.createElement("td");

                        var btnAbrir = document.createElement("button");
                        btnAbrir.textContent = "Abrir";
                        (function(id){
                            btnAbrir.onclick = function(){ abrirRecurso(id); };
                        })(recurso.id);

                        var btnBorrar = document.createElement("button");
                        btnBorrar.textContent = "X";
                        (function(id){
                            btnBorrar.onclick = function(){ borrarRecurso(id); };
                        })(recurso.id);

                        celdaAcciones.appendChild(btnAbrir);
                        celdaAcciones.appendChild(btnBorrar);

                        fila.appendChild(celdaAcciones);
                        tabla.appendChild(fila);
                    });
                }
            });
        });
    });
}

// FUNCIÓN BORRAR RECURSO
function borrarRecurso(id){
    if(!id){
        alert("ID de recurso inválido");
        return;
    }

    if(confirm("¿Desea eliminar este recurso?")){
        rest.delete("/api/recursos/" + id + "?token=" + tokenActual, function(estado){
            if(estado === 200){
                alert("Recurso borrado correctamente");
                buscarRecursos();
            } else if(estado === 404){
                alert("No se ha encontrado el recurso");
            }
        });
    }
}

var recursoActualId = null;

// FUNCIÓN AÑADIR NUEVO RECURSO
function anyadirRecurso() {
    recursoActualId = null;
    document.getElementById("recursoCategoria").value = 0;
    document.getElementById("recursoModelo").value = 0;
    document.getElementById("recursoNumSerie").value = "";
    document.getElementById("recursoUbicacion").value = 0;
    document.getElementById("recursoEstado").value = 0;
    
    document.getElementById("tablaReservas").innerHTML = `<tr>
        <th>Sanitario</th>
        <th>Hora estimada</th>
        <th>Fecha petición</th>
        <th>Fecha inicio</th>
        <th>Fecha fin</th>
    </tr>`;
    document.getElementById("tablaResenyas").innerHTML = `<tr>
        <th>Fecha</th>
        <th>Sanitario</th>
        <th>Valoración</th>
        <th>Comentario</th>
    </tr>`;
    
    cargarSelectsRecurso();
    cambiarSeccion("recurso");
}

// CARGAR SELECTS DE CATEGORIA, MODELO Y UBICACIÓN PARA LA FICHA
function cargarSelectsRecurso(callback) {
    rest.get("/api/categorias?token=" + tokenActual, function(estado, categorias){
        if(estado === 200){
            var selectCat = document.getElementById("recursoCategoria");
            selectCat.innerHTML = '<option value="0">Todos</option>';
            for(var i=0; i<categorias.length; i++){
                var opt = document.createElement("option");
                opt.value = categorias[i].id;
                opt.textContent = categorias[i].nombre;
                selectCat.appendChild(opt);
            }

            rest.get("/api/modelos?token=" + tokenActual, function(eMod, modelos){
                if(eMod === 200){
                    var selectMod = document.getElementById("recursoModelo");
                    selectMod.innerHTML = '<option value="0">Todos</option>';
                    for(var j=0; j<modelos.length; j++){
                        if(selectCat.value == 0 || modelos[j].categoria == selectCat.value){
                            var opt = document.createElement("option");
                            opt.value = modelos[j].id;
                            opt.textContent = modelos[j].nombre;
                            selectMod.appendChild(opt);
                        }
                    }

                    rest.get("/api/ubicaciones?token=" + tokenActual, function(eUbi, ubicaciones){
                        if(eUbi === 200){
                            var selectUbi = document.getElementById("recursoUbicacion");
                            selectUbi.innerHTML = '<option value="0">Todos</option>';
                            for(var k=0; k<ubicaciones.length; k++){
                                var opt = document.createElement("option");
                                opt.value = ubicaciones[k].id;
                                opt.textContent = ubicaciones[k].nombre;
                                selectUbi.appendChild(opt);
                            }

                            if(callback) callback();
                        }
                    });
                }
            });
        }
    });
}

// ACTUALIZAR MODELOS SEGÚN CATEGORÍA SELECCIONADA
function actualizarModelosRecurso() {
    var idCategoriaSel = parseInt(document.getElementById("recursoCategoria").value);

    rest.get("/api/modelos?token=" + tokenActual, function(estado, modelos){
        if(estado === 200){
            var select = document.getElementById("recursoModelo");
            select.innerHTML = '<option value="0">Todos</option>';
            for(var i=0; i<modelos.length; i++){
                if(idCategoriaSel === 0 || modelos[i].categoria === idCategoriaSel){
                    var opt = document.createElement("option");
                    opt.value = modelos[i].id;
                    opt.textContent = modelos[i].nombre;
                    select.appendChild(opt);
                }
            }
        }
    });
}

// FUNCIÓN GUARDAR RECURSO (CREAR O EDITAR)
function guardarRecurso() {
    var categoria = parseInt(document.getElementById("recursoCategoria").value);
    var modelo = parseInt(document.getElementById("recursoModelo").value);
    var numero_serie = document.getElementById("recursoNumSerie").value.trim();
    var ubicacion = parseInt(document.getElementById("recursoUbicacion").value);
    var estado = parseInt(document.getElementById("recursoEstado").value);

    if(!numero_serie){
        alert("Debes introducir un número de serie");
        return;
    }

    var recursoObj = {
        modelo: modelo,
        numero_serie: numero_serie,
        ubicacion: ubicacion,
        estado: estado,
        nombreGestor: nombreGestorActual
    };

    if(recursoActualId === null){
        rest.post("/api/recursos?token=" + tokenActual, recursoObj, function(estado, respuesta){
            if(estado === 201){
                alert("Recurso creado correctamente");
                buscarRecursos();
                cambiarSeccion("inicio");
            } else {
                alert("Error al crear recurso");
            }
        });
    } else {
        rest.put("/api/recursos/" + recursoActualId + "?token=" + tokenActual, recursoObj, function(estado, respuesta){
            if(estado === 200){
                alert("Recurso actualizado correctamente");
                buscarRecursos();
                cambiarSeccion("inicio");
            } else {
                alert("Error al actualizar recurso");
            }
        });
    }
}

// FUNCIÓN ABRIR RECURSO EXISTENTE
function abrirRecurso(id) {
    recursoActualId = id;
    rest.get("/api/recursos/" + id + "?token=" + tokenActual, function(estado, rec){
        if(estado === 200){
            cargarSelectsRecurso(function() {
                document.getElementById("recursoNumSerie").value = rec.numero_serie;
                document.getElementById("recursoEstado").value = rec.estado;
                document.getElementById("recursoModelo").value = rec.modelo;

                rest.get("/api/modelos?token=" + tokenActual, function(eMod, modelos){
                    if(eMod === 200){
                        var modeloObj = modelos.find(m => m.id === rec.modelo);
                        if(modeloObj) {
                            document.getElementById("recursoCategoria").value = modeloObj.categoria;
                        }
                    }
                });

                document.getElementById("recursoUbicacion").value = rec.ubicacion;

                cambiarSeccion("recurso");
                cargarReservas(id);
                cargarResenyas(id);
            });
        } else {
            alert("No se pudo cargar el recurso");
        }
    });
}

// FUNCIÓN PARA CARGAR LAS RESERVAS
function cargarReservas(idRecurso){
    rest.get("/api/recursos/" + idRecurso + "/reservas?token=" + tokenActual, function(estado, reservas){
        if(estado === 200){
            pintarTablaReservas(reservas);
        }
    });
}

// FUNCIÓN PARA TABLA RESERVAS
function pintarTablaReservas(reservas){
    var tabla = document.getElementById("tablaReservas");
    tabla.innerHTML = `
        <tr>
            <th>Sanitario</th>
            <th>Hora estimada</th>
            <th>Fecha petición</th>
            <th>Fecha inicio</th>
            <th>Fecha fin</th>
        </tr>
    `;

    for(let i = 0; i < reservas.length; i++){
        let reserva = reservas[i];

        rest.get("/api/sanitarios/" + reserva.sanitario + "?token=" + tokenActual, function(estado, sanitario){
            if(estado === 200){
                var fila = document.createElement("tr");

                var ahora = new Date();
                var color = "white";

                if(reserva.fecha_fin){
                    color = "white";
                } else {
                    if(!reserva.fecha_inicio){
                        color = "lightgreen";
                    } else {
                        var inicio = new Date(reserva.fecha_inicio);
                        var horasUsadas = (ahora - inicio) / (1000*60*60);

                        if(horasUsadas > reserva.horas_estimadas){
                            color = "red";
                        } else {
                            color = "lightblue";
                        }
                    }
                }

                fila.style.backgroundColor = color;

                fila.innerHTML =
                    "<td>" + sanitario.nombre + " " + sanitario.apellidos + "</td>" + 
                    "<td>" + reserva.horas_estimadas + "</td>" +
                    "<td>" + new Date(reserva.fecha_peticion).toLocaleString() + "</td>" +
                    "<td>" + (reserva.fecha_inicio ? new Date(reserva.fecha_inicio).toLocaleString() : "") + "</td>" +
                    "<td>" + (reserva.fecha_fin ? new Date(reserva.fecha_fin).toLocaleString() : "") + "</td>";
                
                tabla.appendChild(fila);
            }
        });
    }
}

// FUNCIÓN PARA CARGAR LAS RESEÑAS
function cargarResenyas(idRecurso){
    rest.get("/api/recursos/" + idRecurso + "/resenyas?token=" + tokenActual, function(estado, resenyas){
        if(estado === 200){
            pintarTablaResenyas(resenyas);
        }
    });
}

// FUNCIÓN PARA CREAR LA TABLA DE RESEÑAS
function pintarTablaResenyas(resenyas){
    var tabla = document.getElementById("tablaResenyas");

    tabla.innerHTML = `
        <tr>
            <th>Fecha</th>
            <th>Sanitario</th>
            <th>Valoración</th>
            <th>Comentario</th>
        </tr>
    `;

    for(let i = 0; i < resenyas.length; i++){
        let resenya = resenyas[i];
        var fila = document.createElement("tr");

        fila.innerHTML = 
            "<td>" + new Date(resenya.fecha).toLocaleString() + "</td>" + 
            "<td>" + resenya.nombre + " " + resenya.apellidos + "</td>" + 
            "<td>" + resenya.valor + "</td>" + 
            "<td>" + resenya.descripcion + "</td>";
        
        tabla.appendChild(fila);
    }
}

// FUNCIÓN VOLVER AL LISTADO
function volverAlListado(){
    cambiarSeccion("inicio");
}

// FUNCIÓN SALIR
function salir(){
    if(ws){ ws.close(); ws = null; }
    avisos = [];
    document.getElementById("tablaAvisos").innerHTML = "";

    idGestorActual = null;
    tokenActual = null; // Se borra el token al salir
    nombreGestorActual = "";
    cambiarSeccion("login");

    document.getElementById("tablaRecursos").innerHTML = `
        <tr>
            <th>Nº Serie</th>
            <th>Categoría</th>
            <th>Modelo</th>
            <th>Ubicación</th>
            <th>Estado</th>
            <th></th>
        </tr>
    `;
}

// FUNCIÓN PARA CARGAR LOS DESPLEGABLES Y QUE APAREZCAN EN EL INDEX
function cargarDesplegables(){
    rest.get("/api/categorias?token=" + tokenActual, function(estado, categorias){
        if(estado === 200){
            var select = document.getElementById("filtroCategoria");
            select.innerHTML = '<option value="0">Todos</option>';

            for(var i = 0; i < categorias.length; i++){
                var opt = document.createElement("option");
                opt.value = categorias[i].id;
                opt.textContent = categorias[i].nombre;
                select.appendChild(opt);
            }
        }
    });

    rest.get("/api/ubicaciones?token=" + tokenActual, function(estado, ubicaciones){
        if(estado === 200){
            var select = document.getElementById("filtroUbicacion");
            select.innerHTML = '<option value="0">Todos</option>';

            for(var i = 0; i < ubicaciones.length; i++){
                var opt = document.createElement("option");
                opt.value = ubicaciones[i].id;
                opt.textContent = ubicaciones[i].nombre;
                select.appendChild(opt);
            }
        }
    });

    actualizarModelos();
}

// ACTUALIZAR MODELOS SEGÚN CATEGORÍA SELECCIONADA
function actualizarModelos() {
    var idCategoriaSel = parseInt(document.getElementById("filtroCategoria").value);
    
    rest.get("/api/modelos?token=" + tokenActual, function(estado, modelos) {
        if (estado === 200) {
            var select = document.getElementById("filtroModelo");
            select.innerHTML = '<option value="0">Todos</option>';

            for (var i = 0; i < modelos.length; i++) {
                if (idCategoriaSel === 0 || modelos[i].categoria === idCategoriaSel) {
                    var opt = document.createElement("option");
                    opt.value = modelos[i].id;
                    opt.textContent = modelos[i].nombre;
                    select.appendChild(opt);
                }
            }
        }
    });
}

// FUNCIÓN PARA PINTAR LA TABLA DE AVISOS
function pintarAvisos(){
    var tabla = document.getElementById("tablaAvisos");
    tabla.innerHTML = "";
    for(var i = 0; i < avisos.length; i++){
        var fila = document.createElement("tr");
        if(avisos[i].color === "verde") fila.style.backgroundColor = "lightgreen";
        else if(avisos[i].color === "azul") fila.style.backgroundColor = "lightblue";
        else if(avisos[i].color === "rojo") fila.style.backgroundColor = "salmon";

        fila.innerHTML = "<td>" + avisos[i].fecha + "</td>"
                       + "<td>" + avisos[i].origen + "</td>"
                       + "<td>" + avisos[i].texto + "</td>";
        tabla.appendChild(fila);
    }
}

// PRÁCTICA - 3: PARTE 1
function enviarDatosMinisterio(){
    // 1. Obtenemos primero los modelos y las categorías para saber la categoría de cada recurso
    rest.get("/api/modelos?token=" + tokenActual, function(eMod, modelos){
        rest.get("/api/categorias?token=" + tokenActual, function(eCat, categorias){
            if(eMod !== 200 || eCat !== 200){
                alert("Error al cargar datos auxiliares de modelos y categorías.");
                return;
            }

            // Mapas para buscar rápidamente el nombre de la categoría por ID de modelo
            var mapaModelos = {};
            for(var m = 0; m < modelos.length; m++){
                mapaModelos[modelos[m].id] = modelos[m].categoria; // Guarda id_categoria
            }

            var mapaCategorias = {};
            for(var c = 0; c < categorias.length; c++){
                mapaCategorias[categorias[c].id] = categorias[c].nombre; // Guarda nombre_categoria
            }

            // 2. Obtenemos los recursos
            rest.get("/api/recursos?token=" + tokenActual, function(estado, recursos){
                if(estado === 200 && recursos){
                    
                    var todasLasReservas = [];
                    var recursosProcesados = 0;

                    if(recursos.length === 0){
                        alert("No hay recursos en la base de datos");
                        return;
                    }

                    for(var i = 0; i < recursos.length; i++){
                        (function(recursoActual){
                            rest.get("/api/recursos/" + recursoActual.id + "/reservas?token=" + tokenActual, function(estRes, reservasRecurso){
                                recursosProcesados++;

                                if(estRes === 200 && reservasRecurso){
                                    for(var r = 0; r < reservasRecurso.length; r++){
                                        // Guardamos también el ID del modelo dentro del objeto de reserva para saber su categoría luego
                                        var resConModelo = reservasRecurso[r];
                                        resConModelo.modeloRecurso = recursoActual.modelo;
                                        todasLasReservas.push(resConModelo);
                                    }
                                }

                                if(recursosProcesados === recursos.length){
                                    
                                    if(todasLasReservas.length === 0){
                                        alert("No hay reservas asociadas a los recursos");
                                        return;
                                    }

                                    var arregloDatos = [];
                                    var reservasProcesadas = 0;

                                    for(var j = 0; j < todasLasReservas.length; j++){
                                        (function(reservaActual){
                                            rest.get("/api/sanitarios/" + reservaActual.sanitario + "?token=" + tokenActual, function(estSan, sanitario){
                                                reservasProcesadas++;

                                                // Buscamos el nombre de la categoría del recurso
                                                var idCategoria = mapaModelos[reservaActual.modeloRecurso];
                                                var nombreCategoria = mapaCategorias[idCategoria] || "Sin categoría";

                                                var datoReserva = {
                                                    nombre: (estSan === 200 && sanitario) ? sanitario.nombre : "Desconocido",
                                                    apellidos: (estSan === 200 && sanitario) ? sanitario.apellidos : "",
                                                    "categoría": nombreCategoria,
                                                    horas_estimadas: reservaActual.horas_estimadas,
                                                    fec_pet: reservaActual.fecha_peticion,
                                                    fec_ini: reservaActual.fecha_inicio ? reservaActual.fecha_inicio : null,
                                                    fecha_fin: reservaActual.fecha_fin ? reservaActual.fecha_fin : null
                                                };

                                                arregloDatos.push(datoReserva);

                                                if(reservasProcesadas === todasLasReservas.length){
                                                    var hoy = new Date().toISOString().split('T')[0];

                                                    var cuerpoEnvio = {
                                                        id_area: 5, // Tu ID de área (Dermatología)
                                                        fecha: hoy,
                                                        datos: arregloDatos
                                                    };

                                                    var urlMinisterio = "https://undefined.ua.es/telemedicina/api/datos";
                                                    
                                                    rest.post(urlMinisterio, cuerpoEnvio, function(estadoMin){
                                                        if(estadoMin === 200 || estadoMin === 201){
                                                            var totalEnviadas = arregloDatos.length;
                                                            alert("Se han subido " + totalEnviadas + " reservas del Área de Dermatología al Ministerio.");
                                                            cargarRankingMinisterio();
                                                        } else {
                                                            alert("Error al subir los datos al Ministerio. Código: " + estadoMin);
                                                        }
                                                    });
                                                }
                                            });
                                        })(todasLasReservas[j]);
                                    }
                                }
                            });
                        })(recursos[i]);
                    }
                } else {
                    alert("Error al consultar recursos.");
                }
            });
        });
    });
}

function cargarRankingMinisterio(){
    var urlMinisterio = "https://undefined.ua.es/telemedicina/api/datos";

    // Petición externa al Ministerio (sin token)
    rest.get(urlMinisterio, function(estado, datosMinisterio){
        if(estado === 200 && datosMinisterio){

            var conteoPorArea = {};
            for(var id in AREAS_MEDICAS){
                conteoPorArea[id] = 0;
            }

            for(var i = 0; i < datosMinisterio.length; i++){
                var registro = datosMinisterio[i];
                var idArea = registro.id_area;

                var cantidadReservas = (registro.datos && registro.datos.length) ? registro.datos.length : 0;

                if(conteoPorArea[idArea] !== undefined){
                    conteoPorArea[idArea] += cantidadReservas;
                } else {
                    conteoPorArea[idArea] = cantidadReservas;
                }
            }

            var listaRanking = [];
            for(var areaId in conteoPorArea){
                var idNum = parseInt(areaId);
                var nombreArea = AREAS_MEDICAS[idNum] ? AREAS_MEDICAS[idNum] : "Área " + idNum;

                listaRanking.push({
                    id_area: idNum,
                    nombre: nombreArea,
                    totales: conteoPorArea[areaId]
                });
            }

            listaRanking.sort(function(a, b){
                return b.totales - a.totales;
            });

            var tbody = document.getElementById("cuerpoTablaRanking");
            tbody.innerHTML = "";

            for(var k = 0; k < listaRanking.length; k++){
                var fila = document.createElement("tr");
                
                // (k + 1) nos dará el número de posición: 1, 2, 3, 4, 5...
                var posicion = k + 1;

                fila.innerHTML = "<td>" + posicion + "</td>" +
                                "<td>" + listaRanking[k].nombre + "</td>" +
                                "<td>" + listaRanking[k].totales + "</td>";
                                
                tbody.appendChild(fila);
            }
        }
    });
}
