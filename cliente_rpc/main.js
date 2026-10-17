//Vinculamos cliente - servidor. Obtener una referencia a la app RPC (instancia de la aplicación gestion pacientes del servidor localhost)
var app = rpc("localhost", "app_sanitario");

//Obtener referencias a los procedimientos remotos registrados por el servidor.
var obtenerCategorias = app.procedure("obtenerCategorias");
var obtenerModelos = app.procedure("obtenerModelos");
var loginSanitario = app.procedure("loginSanitario"); 
var crearSanitario = app.procedure("crearSanitario");
var actualizarSanitario = app.procedure("actualizarSanitario");
var obtenerSanitario = app.procedure("obtenerSanitario");
var obtenerRecursos = app.procedure("obtenerRecursos");
var tiempoPendiente = app.procedure("tiempoPendiente");
var obtenerReservas = app.procedure("obtenerReservas");
var obtenerResenyas = app.procedure("obtenerResenyas");
var crearResenya = app.procedure("crearResenya");
var reservarRecurso = app.procedure("reservarRecurso");
var cancelarReserva = app.procedure("cancelarReserva");
var iniciarReserva = app.procedure("iniciarReserva");
var finalizarReserva = app.procedure("finalizarReserva");
var obtenerRecurso = app.procedure("obtenerRecurso");
var obtenerUbicaciones = app.procedure("obtenerUbicaciones");

// Variables necesarias
var seccionActual = "login";
var idSanitarioActual = null;
var origenDatos = null;

// ---- WebSocket ----
var ws = null;
var nombreSanitarioActual = "";
var avisos = [];
// -------------------

// PARA CAMBIAR LA SECCIÓN Y QUE SE VEAN NUEVAS PANTALLAS
function cambiarSeccion(seccion){
    document.getElementById(seccionActual).classList.remove("activa");
    document.getElementById(seccion).classList.add("activa");
    seccionActual=seccion;
}

// FUNCIÓN ENTRAR
function entrar(){
    var usu = document.getElementById("usuario").value;
    var contra = document.getElementById("contra").value;

    loginSanitario(usu, contra, function(id){
        if(id === null){
            alert("Usuario o contraseña incorrecta");
        } else {
            idSanitarioActual = id;

            obtenerSanitario(id, function(san){
                nombreSanitarioActual = san.nombre + " " + san.apellidos;
                document.getElementById("nombreCompletoSanitario").innerHTML = nombreSanitarioActual;

                // ---- Abrir WebSocket al hacer login ----
                ws = new WebSocket("ws://localhost:3002");
                ws.onopen = function(){
                    ws.send(JSON.stringify({
                        tipo: "identificar",
                        rol: "sanitario",
                        id: idSanitarioActual,
                        nombre: nombreSanitarioActual
                    }));
                };
                ws.onmessage = function(evento){
                    var aviso = JSON.parse(evento.data);
                    avisos.push(aviso);
                    pintarAvisos();
                };
                // ----------------------------------------
            });

            cambiarSeccion("inicio");
            cargarReservasPendientes();
            cargarReservasRealizadas();
        }
    });
}

// FUNCIÓN REGISTRARSE
function registrarse(){
    origenDatos = "login";
    cambiarSeccion("datos-sanitario");
}

// FUNCIÓN GUARDAR SANITARIO
function guardar(){
    if(origenDatos === "login"){
        var nom = document.getElementById("nombreSan").value;
        var ape = document.getElementById("apellidosSan").value;
        var usu = document.getElementById("usuarioSan").value;
        var pas = document.getElementById("passwordSan").value;

        var nuevoSanitario = {
            nombre: nom,
            apellidos: ape,
            usuario: usu,
            password: pas
        }

        crearSanitario(nuevoSanitario, function(id){
            if(id === null){
                alert("Usuario ya existente o falta algún campo por completar.");
            } else{
                alert("Usuario creado correctamente.");
                cambiarSeccion("login");
            }
        })
    } else{
        if(origenDatos === "inicio"){
            var nom = document.getElementById("nombreSan").value;
            var ape = document.getElementById("apellidosSan").value;
            var usu = document.getElementById("usuarioSan").value;
            var pas = document.getElementById("passwordSan").value;

            var sanitarioActualizado = {
                nombre: nom,
                apellidos: ape,
                usuario: usu,
                password: pas
            }
            actualizarSanitario(idSanitarioActual, sanitarioActualizado, function(id){
                if(id === null){
                    alert("Error en la actualización de los datos del sanitario.");
                } else{
                    alert("Datos del sanitario actualizados correctamente");
                }
            })
            cambiarSeccion("inicio");
        }
    }
}

// FUNCIÓN CANCELAR
function cancelar(){
    if(origenDatos === "login"){
        cambiarSeccion("login");
        document.getElementById("usuario").value = "";
        document.getElementById("contra").value = "";
    }
    if(origenDatos === "inicio"){
        cambiarSeccion("inicio");
    }
}

// FUNCIÓN EDITAR DATOS
function editarDatos(){
    // Cargar datos actuales del sanitario
    obtenerSanitario(idSanitarioActual,function(san){
        document.getElementById("nombreSan").value = san.nombre;
        document.getElementById("apellidosSan").value = san.apellidos;
        document.getElementById("usuarioSan").value = san.usuario;
        document.getElementById("passwordSan").value = "";

        origenDatos = "inicio";
        cambiarSeccion("datos-sanitario");
    })
}

// FUNCION PARA CARGAR RESERVAS PENDIENTES
function cargarReservasPendientes() {
    var tablaPendientes = document.getElementById("tablaReservasPendientes");

    obtenerReservas(idSanitarioActual, function(resSan) {
        var pendientes = [];

        // Filtrar reservas pendientes
        for (var i = 0; i < resSan.length; i++) {
            if (resSan[i].fecha_inicio === null) {
                pendientes.push(resSan[i]);
            }
        }

        // Limpiar tabla y poner cabecera
        tablaPendientes.innerHTML = `
            <tr>
                <th>Categoría</th>
                <th>Modelo</th>
                <th>N. Serie</th>
                <th>Ubic.</th>
                <th>F. Pet.</th>
                <th>H. Rest.</th>
                <th></th>
                <th></th>
            </tr>
        `;

        // Recorrer reservas pendientes
        for (var i = 0; i < pendientes.length; i++) {
            (function(reserva) {  // Closure para mantener cada reserva
                obtenerRecurso(reserva.recurso, function(rec) {
                    tiempoPendiente(rec.id, function(horas) {

                        // Buscar modelo
                        obtenerModelos(function(modelos) {
                            var modelo = null;
                            for (var j = 0; j < modelos.length; j++) {
                                if (modelos[j].id === rec.modelo) {
                                    modelo = modelos[j];
                                    break;
                                }
                            }

                            // Buscar categoría
                            obtenerCategorias(function(categorias) {
                                var categoria = null;
                                for (var k = 0; k < categorias.length; k++) {
                                    if (categorias[k].id === modelo.categoria) {
                                        categoria = categorias[k];
                                        break;
                                    }
                                }

                                obtenerUbicaciones(function(ubicaiones){
                                    var ubicacion = null;
                                    for (var l = 0; l < ubicaiones.length; l++) {
                                        if (ubicaiones[l].id === rec.ubicacion) {
                                            ubicacion = ubicaiones[l];
                                            break;
                                        }
                                    }

                                    // Construir fila
                                    var fila = "<tr>";
                                    fila += "<td>" + categoria.nombre + "</td>";
                                    fila += "<td>" + modelo.nombre + "</td>";
                                    fila += "<td>" + rec.numero_serie + "</td>";
                                    fila += "<td>" + ubicacion.nombre + "</td>"; 
                                    fila += "<td>" + reserva.fecha_peticion.toLocaleString() + "</td>";
                                    fila += "<td>" + horas + "</td>";

                                    // Botón retirar solo si horas restantes = 0
                                    if (horas === 0) {
                                        fila += "<td><button onclick='botonRetirarReserva(" + reserva.id + ")'>Retirar</button></td>";
                                    } else {
                                        fila += "<td></td>";
                                    }

                                    // Botón cancelar siempre disponible
                                    fila += "<td><button onclick='botonCancelarReserva(" + reserva.id + ")'>X</button></td>";

                                    fila += "</tr>";

                                    tablaPendientes.innerHTML += fila;
                            
                                });
                            });
                        });
                    });
                });
            })(pendientes[i]);
        }
    });
}

// FUNCIÓN PARA RETIRAR LA RESERVA 
function botonRetirarReserva(idReserva){
    iniciarReserva(idReserva, function(retirar){
        if(retirar){
            alert("Recurso retirado correctamente");

            // ---- Aviso rojo: reserva iniciada ----
            obtenerReservas(idSanitarioActual, function(todas){
                var reserva = null;
                for(var i = 0; i < todas.length; i++){
                    if(todas[i].id === idReserva){ reserva = todas[i]; break; }
                }
                if(reserva){
                    obtenerRecurso(reserva.recurso, function(rec){
                        obtenerModelos(function(modelos){
                            var mod = modelos.find(m => m.id === rec.modelo);
                            obtenerCategorias(function(cats){
                                var cat = cats.find(c => c.id === mod.categoria);
                                // Sanitarios afectados: los que tienen reserva no finalizada de este recurso
                                obtenerReservas(idSanitarioActual, function(){
                                    // Pedimos todas las reservas del recurso via RPC no existe,
                                    // así que calculamos los afectados desde el cliente
                                    // El servidor WS filtra por sanitariosAfectados
                                    ws.send(JSON.stringify({
                                        tipo: "aviso_reserva",
                                        nombreOrigen: nombreSanitarioActual,
                                        idSanitarioOrigen: idSanitarioActual,
                                        idRecurso: reserva.recurso,
                                        texto: "SE HA INICIADO LA RESERVA DEL " 
                                             + cat.nombre.toUpperCase() + " MODELO " 
                                             + mod.nombre.toUpperCase() 
                                             + " CON CÓDIGO " + rec.numero_serie
                                    }));
                                });
                            });
                        });
                    });
                }
            });
            // --------------------------------------

            cargarReservasPendientes();
            cargarReservasRealizadas();
        } else {
            alert("Error retirando el recurso");
        }
    });
}

// FUNCIÓN PARA CANCELAR LAS RESERVAS
function botonCancelarReserva(idReserva){
    // Primero obtenemos los datos ANTES de cancelar
    obtenerReservas(idSanitarioActual, function(todasReservas){
        var reserva = null;
        for(var i = 0; i < todasReservas.length; i++){
            if(todasReservas[i].id === idReserva){ 
                reserva = todasReservas[i]; 
                break; 
            }
        }
        
        // Ahora cancelamos
        cancelarReserva(idReserva, function(cancelada){
            if(cancelada){
                alert("Reserva cancelada correctamente");

                cargarReservasPendientes();
                cargarReservasRealizadas();
            } else {
                alert("Error cancelando la reserva");
            }
        });
    });
}


// FUNCION PARA CARGAR RESERVAS REALIZADAS
function cargarReservasRealizadas() {
    var tablaRealizadas = document.getElementById("tablaReservasRealizadas");

    obtenerReservas(idSanitarioActual, function(resSan) {
        var realizadas = [];

        // Filtrar solo reservas realizadas
        for (var i = 0; i < resSan.length; i++) {
            if (resSan[i].fecha_inicio !== null) {
                realizadas.push(resSan[i]);
            }
        }

        // Limpiar tabla y poner cabecera
        tablaRealizadas.innerHTML = `
            <tr>
                <th>Categoría</th>
                <th>Modelo</th>
                <th>N. Serie</th>
                <th>H. E.</th>
                <th>F. Ini.</th>
                <th>F. Fin</th>
                <th></th>
            </tr>
        `;

        // Recorrer reservas realizadas
        for (var i = 0; i < realizadas.length; i++) {
            (function(reserva) {  // Closure para mantener cada reserva
                obtenerRecurso(reserva.recurso, function(rec) {

                    // Buscar modelo
                    obtenerModelos(function(modelos) {
                        var modelo = null;
                        for (var j = 0; j < modelos.length; j++) {
                            if (modelos[j].id === rec.modelo) {
                                modelo = modelos[j];
                                break;
                            }
                        }

                        // Buscar categoría
                        obtenerCategorias(function(categorias) {
                            var categoria = null;
                            for (var k = 0; k < categorias.length; k++) {
                                if (categorias[k].id === modelo.categoria) {
                                    categoria = categorias[k];
                                    break;
                                }
                            }

                            // Construir fila
                            var fila = "<tr>";
                            fila += "<td>" + categoria.nombre + "</td>";
                            fila += "<td>" + modelo.nombre + "</td>";
                            fila += "<td>" + rec.numero_serie + "</td>";
                            fila += "<td>" + reserva.horas_estimadas + "</td>";
                            fila += "<td>" + (reserva.fecha_inicio ? reserva.fecha_inicio.toLocaleString() : "") + "</td>";
                            
                            // Botón para devolver si no hay fecha_fin
                            if (!reserva.fecha_fin) {
                                fila += "<td><button onclick='botonDevolverRecurso(" + reserva.id + ")'>Devolver</button></td>";
                            } else {
                                fila += "<td>" + (reserva.fecha_fin ? reserva.fecha_fin.toLocaleString() : "") + "</td>";

                            }

                            // Botón para añadir reseña
                            fila += "<td><button onclick='botonAnyadirResenya(" + rec.id + ")'>Reseña</button></td>";

                            fila += "</tr>";

                            tablaRealizadas.innerHTML += fila;
                        });
                    });
                });
            })(realizadas[i]);
        }
    });
}

// FUNCIÓN PARA DEVOLVER UNA RESERVA
function botonDevolverRecurso(idReserva){
    finalizarReserva(idReserva, function(devuelta){
        if(devuelta){
            alert("Recurso devuelto correctamente");

            // ---- Aviso rojo: reserva finalizada ----
            obtenerReservas(idSanitarioActual, function(todas){
                var reserva = null;
                for(var i = 0; i < todas.length; i++){
                    if(todas[i].id === idReserva){ reserva = todas[i]; break; }
                }
                if(reserva){
                    obtenerRecurso(reserva.recurso, function(rec){
                        obtenerModelos(function(modelos){
                            var mod = modelos.find(m => m.id === rec.modelo);
                            obtenerCategorias(function(cats){
                                var cat = cats.find(c => c.id === mod.categoria);
                                ws.send(JSON.stringify({
                                    tipo: "aviso_reserva",
                                    nombreOrigen: nombreSanitarioActual,
                                    idSanitarioOrigen: idSanitarioActual,
                                    idRecurso: reserva.recurso,
                                    texto: "SE HA FINALIZADO LA RESERVA DEL "
                                         + cat.nombre.toUpperCase() + " MODELO "
                                         + mod.nombre.toUpperCase()
                                         + " CON CÓDIGO " + rec.numero_serie
                                }));
                            });
                        });
                    });
                }
            });
            // ----------------------------------------

            cargarReservasPendientes();
            cargarReservasRealizadas();
        } else {
            alert("Error devolviendo el recurso");
        }
    });
}

// FUNCIÓN PARA AÑADIR RESEÑA A ESE RECURSO
var idRecursoResenyaActual = null;
function botonAnyadirResenya(idRecurso){
    idRecursoResenyaActual = idRecurso;

    cambiarSeccion("resenya-nueva");

    obtenerRecurso(idRecurso, function(rec){
        
        // Buscar modelo
        obtenerModelos(function(modelos) {
            var modelo = null;
            for (var j = 0; j < modelos.length; j++) {
                if (modelos[j].id === rec.modelo) {
                    modelo = modelos[j];
                    break;
                }
            }
            document.getElementById("recursoResenya").innerHTML = modelo.nombre;
        })
    })
    
}

// FUNCIÓN GUARDAR RESENYA
function gaurdarNuevaResenya(){
    var valoracion = parseInt(document.getElementById("valoracionResenya").value);
    var descripcion = document.getElementById("descripcionResenya").value;

    if (!descripcion.trim()) {
        alert("Por favor, introduce un texto para la reseña.");
        return;
    }

    crearResenya(idRecursoResenyaActual, idSanitarioActual, valoracion, descripcion, function(nuevaResenya){
        if(nuevaResenya){
            alert("Nueva reseña guardada correctamente");

            // ---- Aviso verde: reseña creada -> a todos los gestores ----
            obtenerRecurso(idRecursoResenyaActual, function(rec){
                obtenerModelos(function(modelos){
                    var mod = modelos.find(m => m.id === rec.modelo);
                    obtenerCategorias(function(cats){
                        var cat = cats.find(c => c.id === mod.categoria);
                        if (ws && ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({
                                tipo: "aviso_resenya",
                                nombreOrigen: nombreSanitarioActual,
                                texto: "SE HA CREADO UNA RESEÑA PARA EL "
                                     + cat.nombre.toUpperCase() + " MODELO "
                                     + mod.nombre.toUpperCase()
                                     + " CON CÓDIGO " + rec.numero_serie
                                     + " Y PUNTUACIÓN " + valoracion
                            }));
                        }
                    });
                });
            });
            // -------------------------------------------------------------
            
            // Cambiar de sección y limpiar inputs dentro de la respuesta exitosa
            cambiarSeccion("inicio");
            document.getElementById("valoracionResenya").value = "1";
            document.getElementById("descripcionResenya").value = "";
        } else {
            alert("No se ha podido crear la nueva reseña");
        }
    });
}

// FUNCIÓN NUEVA RESERVA
function nuevaReserva(){
    cambiarSeccion("nueva-reserva");
    cargarCategorias();
    
    // Resetear el selector de modelos y la tabla
    document.getElementById("recursoModelo").innerHTML = '<option value="0">Todos</option>';
    document.getElementById("tablaNuevaReserva").innerHTML = "";
    document.getElementById("tiempoUso").value = "";

}

// FUNCIÓN PARA CARGAR TODAS LAS CATEGORIAS
function cargarCategorias(){
    obtenerCategorias(function(categorias){
        var catSeleccionada = document.getElementById("recursoCategoria");

        // Limpiar y dejar la opción por defecto
        catSeleccionada.innerHTML = '<option value="0">Todas</option>';

        // Recorremos todas las categorias y las ponemos en el ddesplegable
        for(var i = 0; i < categorias.length; i++){
            var cat = categorias[i];
            catSeleccionada.innerHTML += '<option value="' + cat.id + '">' + cat.nombre + '</option>';
        }
        actualizarModelos();
    })
}

// FUNCIÓN PARA MOSTRAR SOLO LOS MODELOS DE LA CATEGORIA SELECCIONADA
function actualizarModelos(){
    var idCategoria = parseInt(document.getElementById("recursoCategoria").value);
    var modSeleccionado = document.getElementById("recursoModelo");

    obtenerModelos(function(modelos){
        // Limpiamos el selector de modelos
        modSeleccionado.innerHTML = '<option value="0">Todos</option>';

        for(var i = 0; i < modelos.length; i++){
            if(idCategoria === 0 || modelos[i].categoria === idCategoria){
                modSeleccionado.innerHTML += '<option value="' + modelos[i].id + '">' + modelos[i].nombre + '</option>';
            }
        }
    })
}

// FUNCIÓN BUSCAR
function buscar(){
    var idModelo = parseInt(document.getElementById("recursoModelo").value);
    obtenerRecursos(idModelo, function(lista){
        cargarTablaRecursos(lista);
    });
}

// FUNCIÓN PARA HACER LA TABLA RECURSOS
function cargarTablaRecursos(listaRecursos){
    var tabla = document.getElementById("tablaNuevaReserva");
   
    // Cabecera de la tabla
    tabla.innerHTML = '<tr>' +
                        '<th>N. Serie</th>' +
                        '<th>Ubicación</th>' +
                        '<th>H.Rest.</th>' +
                        '<th>Valoración</th>' +
                        '<th></th>' + 
                      '</tr>';
    
    for(let i = 0; i < listaRecursos.length; i++){
        let rec = listaRecursos[i];
        // Obtener ubicación
        obtenerUbicaciones(function(ubicaciones){
            let ubi = null;
            for(var j = 0; j < ubicaciones.length; j++){
                if(rec.ubicacion === ubicaciones[j].id){
                    ubi = ubicaciones[j];
                    break;
                }
            }
            // Valoración media
            obtenerResenyas(rec.id, function(res){
                let suma = 0;
                for(let k = 0; k < res.length; k++){
                    suma += res[k].puntuacion;
                }
                let valorMedio = res.length ? parseFloat((suma/res.length).toFixed(1)) : 0;

                // Horas restantes
                tiempoPendiente(rec.id, function(tiempo){
                        
                    // Construir fila
                    let fila = "<tr>";
                    fila += "<td>" + rec.numero_serie + "</td>";
                    fila += "<td>" + (ubi ? ubi.nombre : "") + "</td>";
                    
                    // diponible o horas restantes
                    if (tiempo === 0) {
                        fila += "<td>Disponible</td>";
                    } else {
                        fila += "<td>" + tiempo + "</td>";
                    }

                    fila += "<td>" + valorMedio + "</td>";
                         
                    // Botón reservar si el recurso esta libre y boton de retirar si el recurso esta ocupado
                    if (tiempo === 0) {
                        fila += "<td><button onclick='botonRetirar(" + rec.id + ")'>Retirar</button></td>";
                    } else {
                        fila += "<td><button onclick='botonReservar(" + rec.id + ")'>Reservar</button></td>";

                    }
                    fila += "</tr>";
                    tabla.innerHTML += fila;
                })
            })
        })
    }
}

// FUNCIÓN PARA HACER NUEVA RESERVA
function botonReservar(idRecurso){
    var horas = parseInt(document.getElementById("tiempoUso").value);

    if(isNaN(horas) || horas <= 0){
        alert("Introduce un tiempo válido");
        return;
    }

    reservarRecurso(idRecurso, idSanitarioActual, horas, function(idReserva){
        if(idReserva){
            alert("Reserva realizada correctamente");

            document.getElementById("tiempoUso").value = "";

            cambiarSeccion("inicio");
            cargarReservasPendientes();
            cargarReservasRealizadas();
        } else{
            alert("Error al realizar la reserva");
        }
    });
}

// FUNCIÓN PARA RETIRAR RESERVA (cuando está disponible)
function botonRetirar(idRecurso){
    var horas = parseInt(document.getElementById("tiempoUso").value);

    if (isNaN(horas) || horas <= 0) {
        alert("Introduce un tiempo de uso estimado válido.");
        return;
    }

    reservarRecurso(idRecurso, idSanitarioActual, horas, function(idReserva){
        if (idReserva) {
            iniciarReserva(idReserva, function(ok){
                if (ok) {
                    alert("Recurso retirado correctamente");
                    cambiarSeccion("inicio");
                    cargarReservasPendientes();
                    cargarReservasRealizadas();
                } else {
                    alert("Error al retirar el recurso");
                }
            });
        } else {
            alert("Error al crear la reserva");
        }
    });
}

// FUNCIÓN SALIR
function salir(){
    // ---- Cerrar WebSocket al salir ----
    if(ws){ ws.close(); ws = null; }
    avisos = [];
    document.getElementById("tablaAvisos").innerHTML = "";
    // ------------------------------------

    idSanitarioActual = null;
    origenDatos = null;
    cambiarSeccion("login");
    document.getElementById("usuario").value = "";
    document.getElementById("contra").value = "";
    document.getElementById("nombreSan").value = "";
    document.getElementById("apellidosSan").value = "";
    document.getElementById("usuarioSan").value = "";
    document.getElementById("passwordSan").value = "";
}

// FUNCIÓN CANCELAR RESERVA
function cancelarReservaCliente(){
    cambiarSeccion("inicio");
}

// FUNCIÓN CANCELAR RESENYA
function cancelarResenya(){
    cambiarSeccion("inicio");
    document.getElementById("valoracionResenya").value = "";
    document.getElementById("descripcionResenya").value = "";

}

// FUNCIÓN PARA PINTAR LA TABLA DE AVISOS
function pintarAvisos(){
    var tabla = document.getElementById("tablaAvisos");
    tabla.innerHTML = "";
    for(var i = 0; i < avisos.length; i++){
        var fila = document.createElement("tr");
        if(avisos[i].color === "rojo") fila.style.backgroundColor = "salmon";
        else if(avisos[i].color === "azul") fila.style.backgroundColor = "lightblue";
        else if(avisos[i].color === "verde") fila.style.backgroundColor = "lightgreen";

        fila.innerHTML = "<td>" + avisos[i].fecha + "</td>"
                       + "<td>" + avisos[i].origen + "</td>"
                       + "<td>" + avisos[i].texto + "</td>";
        tabla.appendChild(fila);
    }
}
