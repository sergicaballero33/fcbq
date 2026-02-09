let jugadores = [];
let tirosRegistrados = [];
let historialAcciones = []; // Aquí guardaremos los pasos atrás
let ultimoX = 0;
let ultimoY = 0;

window.onload = function() {
    cargarDatos();
    actualizarTodo();
    // Cargar nombres de equipos
    if(localStorage.getItem('nombreL')) document.getElementById('nombreEquipoL').value = localStorage.getItem('nombreL');
    if(localStorage.getItem('nombreV')) document.getElementById('nombreEquipoV').value = localStorage.getItem('nombreV');
};

function guardarDatos() {
    localStorage.setItem('jugadoresBasket', JSON.stringify(jugadores));
    localStorage.setItem('tirosBasket', JSON.stringify(tirosRegistrados));
}

function guardarNombresEquipos() {
    localStorage.setItem('nombreL', document.getElementById('nombreEquipoL').value);
    localStorage.setItem('nombreV', document.getElementById('nombreEquipoV').value);
    actualizarTodo(); // Para refrescar los selectores y tablas si es necesario
}

// --- FUNCIÓN MÁGICA: GUARDAR ESTADO ---
// Llama a esto antes de CUALQUIER cambio para poder volver atrás
function salvarEstado() {
    const estado = {
        jugadores: JSON.parse(JSON.stringify(jugadores)),
        tiros: JSON.parse(JSON.stringify(tirosRegistrados)),
        logHTML: document.getElementById("historial").innerHTML
    };
    historialAcciones.push(estado);
    // Limitamos a 20 pasos para no saturar la memoria
    if (historialAcciones.length > 20) historialAcciones.shift();
}

function deshacer() {
    if (historialAcciones.length === 0) {
        alert("No hay más acciones para deshacer");
        return;
    }
    const ultimoEstado = historialAcciones.pop();
    jugadores = ultimoEstado.jugadores;
    tirosRegistrados = ultimoEstado.tiros;
    document.getElementById("historial").innerHTML = ultimoEstado.logHTML;
    
    actualizarTodo();
}

function crearJugador() {
    const nom = document.getElementById("nombreI").value;
    const eq = document.getElementById("equipoI").value;
    if(!nom) return;

    salvarEstado(); // Guardamos antes de añadir
    jugadores.push({ id: Date.now(), nombre: nom, equipo: eq, pts: 0, reb: 0, per: 0 });
    document.getElementById("nombreI").value = "";
    log(`🆕 Entra: ${nom} (${eq})`);
    actualizarTodo();
}

function modificar(id, campo, valor) {
    let j = jugadores.find(x => x.id === id);
    if (j && (j[campo] + valor >= 0)) {
        salvarEstado(); // Guardamos antes de modificar
        j[campo] += valor;
        let emoji = valor > 0 ? "➕" : "➖";
        log(`${emoji} ${j.nombre}: ${valor > 0 ? '+' : ''}${valor} en ${campo}`);
        actualizarTodo();
    }
}

// --- SHOT CHART ---
document.getElementById('shotChart').addEventListener('click', function(e) {
    const rect = this.getBoundingClientRect();
    ultimoX = (e.clientX - rect.left) / rect.width * 100;
    ultimoY = (e.clientY - rect.top) / rect.height * 100;
    dibujarPuntoTemporal(ultimoX, ultimoY);
});

function dibujarPuntoTemporal(x, y) {
    let p = document.getElementById('tempPoint') || document.createElement('div');
    p.id = 'tempPoint'; p.className = 'shot-marker';
    p.style.background = 'yellow';
    p.style.left = x + '%'; p.style.top = y + '%';
    document.getElementById('shotChart').appendChild(p);
}

function registrarTiro(pts, acierto) {
    const id = document.getElementById('jugadorShotSelect').value;
    if (!id || ultimoX === 0) return alert("Clic en pista y selecciona jugador");
    
    salvarEstado(); // Guardamos antes de registrar el tiro
    let j = jugadores.find(x => x.id == id);
    tirosRegistrados.push({ jugadorId: j.id, x: ultimoX, y: ultimoY, pts: pts, acierto: acierto });

    if (acierto) {
        j.pts += pts;
        log(`🏀 ${j.nombre}: CANASTA de ${pts} pts`);
    } else {
        log(`❌ ${j.nombre}: FALLÓ tiro de ${pts} pts`);
    }
    
    ultimoX = 0;
    if (document.getElementById('tempPoint')) document.getElementById('tempPoint').remove();
    actualizarTodo();
}

function actualizarTodo() {
    let hL = ""; let hV = ""; 
    let tL = 0; let tV = 0;
    const nomL = document.getElementById('nombreEquipoL').value;
    const nomV = document.getElementById('nombreEquipoV').value;

    jugadores.forEach(j => {
        let card = `
        <div class="tarjeta-jugador" style="border-left: 5px solid ${j.equipo === 'Local' ? 'var(--local)' : 'var(--visitante)'}">
            <h3>${j.nombre} <b>${j.pts} pts</b></h3>
            <div class="controles">
                <button class="btn-add" onclick="modificar(${j.id}, 'pts', 1)">+1</button>
                <button class="btn-add" onclick="modificar(${j.id}, 'pts', 2)">+2</button>
                <button class="btn-add" onclick="modificar(${j.id}, 'pts', 3)">+3</button>
                <button class="btn-sub" onclick="modificar(${j.id}, 'pts', -1)">-1</button>
                <button class="btn-reb" onclick="modificar(${j.id}, 'reb', 1)">+REB</button>
                <button class="btn-per" onclick="modificar(${j.id}, 'per', 1)">+PER</button>
            </div>
        </div>`;
        if(j.equipo === "Local") { hL += card; tL += j.pts; } else { hV += card; tV += j.pts; }
    });

    document.getElementById("listaL").innerHTML = hL;
    document.getElementById("listaV").innerHTML = hV;
    document.getElementById("totalL").innerText = tL;
    document.getElementById("totalV").innerText = tV;

    // Shot chart
    const container = document.getElementById('shotChart');
    container.innerHTML = ''; 
    tirosRegistrados.forEach(t => {
        const m = document.createElement('div');
        m.className = 'shot-marker ' + (t.acierto ? 'made' : 'miss');
        m.style.left = t.x + '%'; m.style.top = t.y + '%';
        container.appendChild(m);
    });

    // Dropdown
    document.getElementById('jugadorShotSelect').innerHTML = '<option value="">Jugador...</option>' + 
        jugadores.map(j => `<option value="${j.id}">${j.nombre} (${j.equipo === 'Local' ? nomL : nomV})</option>`).join('');

    actualizarTabla();
    guardarDatos();
}

function actualizarTabla() {
    const cuerpo = document.getElementById("cuerpoTabla");
    cuerpo.innerHTML = jugadores.map(j => {
        const misTiros = tirosRegistrados.filter(t => t.jugadorId === j.id);
        const calc = (pts) => {
            const t = misTiros.filter(x => x.pts === pts);
            const h = t.filter(x => x.acierto).length;
            return t.length > 0 ? `${Math.round((h/t.length)*100)}% (${h}/${t.length})` : "0%";
        };
        return `<tr><td>${j.nombre}</td><td>${j.pts}</td><td>${j.reb}</td><td>${j.per}</td><td>${calc(2)}</td><td>${calc(3)}</td></tr>`;
    }).join('');
}

function log(msg) {
    const h = document.getElementById("historial");
    const ahora = new Date();
    const hora = ahora.getHours() + ":" + ahora.getMinutes().toString().padStart(2, '0');
    h.innerHTML = `<div style="border-bottom:1px solid #333; padding:2px;"><small>${hora}</small> ${msg}</div>` + h.innerHTML;
}

function exportarPartido() {
    let texto = `🏀 ${document.getElementById('nombreEquipoL').value} ${document.getElementById("totalL").innerText} - ${document.getElementById("totalV").innerText} ${document.getElementById('nombreEquipoV').value}\n`;
    jugadores.forEach(j => { texto += `- ${j.nombre}: ${j.pts}pts\n`; });
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
}

function borrarTodo() {
    if(confirm("¿Borrar partido?")) { localStorage.clear(); location.reload(); }
}
// --- FUNCIÓN PARA DESCARGAR EL PARTIDO A UN ARCHIVO ---
function descargarArchivoJSON() {
    const datosPartido = {
        jugadores: jugadores,
        tiros: tirosRegistrados,
        nombreL: document.getElementById('nombreEquipoL').value,
        nombreV: document.getElementById('nombreEquipoV').value,
        fecha: new Date().toLocaleDateString()
    };
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(datosPartido));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "partido_basket_" + datosPartido.fecha + ".json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

// --- FUNCIÓN PARA CARGAR EL PARTIDO DESDE UN ARCHIVO ---
function cargarArchivoJSON(event) {
    const archivo = event.target.files[0];
    if (!archivo) return;

    const lector = new FileReader();
    lector.onload = function(e) {
        try {
            const contenido = JSON.parse(e.target.result);
            
            // Confirmación para no borrar por error el partido actual
            if (confirm("¿Cargar este archivo? Se borrarán los datos actuales de la pantalla.")) {
                jugadores = contenido.jugadores;
                tirosRegistrados = contenido.tiros;
                
                // Actualizar nombres de equipos
                document.getElementById('nombreEquipoL').value = contenido.nombreL || "LOCAL";
                document.getElementById('nombreEquipoV').value = contenido.nombreV || "VISITANTE";
                
                // Guardar en memoria local y refrescar todo
                guardarDatos();
                guardarNombresEquipos();
                actualizarTodo();
                log("📁 Partido cargado desde archivo correctamente");
            }
        } catch (error) {
            alert("Error al leer el archivo. Asegúrate de que sea un archivo de backup válido.");
        }
    };
    lector.readAsText(archivo);
}
