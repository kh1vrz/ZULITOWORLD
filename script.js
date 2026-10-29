
/* =========================================
   EVERLOVE ♡
   El corazón y cerebro de nuestro juego
========================================= */

const canvas = document.getElementById("mundo");
const ctx = canvas.getContext("2d");

// Interfaz
const pantallaInicio = document.getElementById("pantalla-inicio");
const juego = document.getElementById("juego");
const inputNombre = document.getElementById("nombre");
const botonJugar = document.getElementById("btn-jugar");
const botonCarta = document.getElementById("btn-carta");
const botonRegalo = document.getElementById("btn-regalo");
const mensaje = document.getElementById("mensaje");

// Mundo
const TAM = 36;
const ANCHO_MUNDO = 48;
const ALTO_MUNDO = 48;

let ancho = 0;
let alto = 0;
let escala = 1;
let iniciado = false;
let tiempo = 0;
let bloqueSeleccionado = "flor";
let nombreFavorito = "";
let mensajeTemporizador;
let ultimoMovimiento = 0;

const colores = {
    hierba: "#527e78",
    hierbaClara: "#68978b",
    camino: "#ad91a9",
    caminoClaro: "#c9a9bd",
    agua: "#426e9a",
    aguaClara: "#6399c0",
    piedra: "#727b9d",
    piedraClara: "#949bbc"
};

const bloques = {
    flor: { emoji: "🌷", nombre: "Flor" },
    corazon: { emoji: "💗", nombre: "Corazón" },
    cristal: { emoji: "💎", nombre: "Cristal" },
    linterna: { emoji: "🏮", nombre: "Linterna" },
    pastel: { emoji: "🍰", nombre: "Pastel" }
};

const jugador = {
    x: 24,
    y: 24,
    salto: 0,
    velocidadSalto: 0,
    paso: 0,
    direccionX: 0,
    direccionY: 1
};

const teclas = {};
const particulas = [];
const decoraciones = [];

let mundo = [];
let inventario = {
    flor: 0,
    cristal: 0,
    corazon: 0,
    linterna: 0,
    pastel: 0
};

// --------------------------------------------------
// TAMAÑO DE PANTALLA
// --------------------------------------------------

function ajustarPantalla() {
    ancho = window.innerWidth;
    alto = window.innerHeight;
    escala = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(ancho * escala);
    canvas.height = Math.round(alto * escala);

    canvas.style.width = `${ancho}px`;
    canvas.style.height = `${alto}px`;

    ctx.setTransform(escala, 0, 0, escala, 0, 0);
}

window.addEventListener("resize", ajustarPantalla);
ajustarPantalla();

// --------------------------------------------------
// GENERADOR DEL MUNDO
// --------------------------------------------------

function aleatorio(x, y = 0) {
    const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return n - Math.floor(n);
}

function crearMundo() {
    mundo = [];

    for (let y = 0; y < ALTO_MUNDO; y++) {
        const fila = [];

        for (let x = 0; x < ANCHO_MUNDO; x++) {
            const borde = Math.min(
                x,
                y,
                ANCHO_MUNDO - 1 - x,
                ALTO_MUNDO - 1 - y
            );

            const suerte = aleatorio(x, y);
            let terreno = "hierba";

            if (borde < 2) {
                terreno = "agua";
            } else if (suerte > 0.95) {
                terreno = "piedra";
            } else if (suerte > 0.89) {
                terreno = "camino";
            }

            fila.push({
                terreno,
                objeto: null,
                descubierto: true
            });
        }

        mundo.push(fila);
    }

    // Caminos que conducen al jardín central.
    for (let i = 17; i <= 31; i++) {
        mundo[24][i].terreno = "camino";
        mundo[i][24].terreno = "camino";
    }

    // Un jardín romántico en el centro.
    mundo[22][24].objeto = "linterna";
    mundo[24][22].objeto = "flor";
    mundo[24][26].objeto = "flor";
    mundo[26][24].objeto = "corazon";

    // Flores y cristales repartidos por el mapa.
    for (let i = 0; i < 100; i++) {
        const x = 3 + Math.floor(aleatorio(i, 17) * (ANCHO_MUNDO - 6));
        const y = 3 + Math.floor(aleatorio(i, 53) * (ALTO_MUNDO - 6));

        if (Math.abs(x - 24) < 5 && Math.abs(y - 24) < 5) {
            continue;
        }

        const casilla = mundo[y][x];

        if (casilla.terreno !== "agua" && !casilla.objeto) {
            if (i % 4 === 0) {
                casilla.objeto = "cristal";
            } else if (i % 3 === 0) {
                casilla.objeto = "flor";
            } else if (i % 9 === 0) {
                casilla.objeto = "corazon";
            }
        }
    }

    crearDecoraciones();
}

function crearDecoraciones() {
    decoraciones.length = 0;

    for (let i = 0; i < 170; i++) {
        decoraciones.push({
            x: aleatorio(i, 100) * ANCHO_MUNDO,
            y: aleatorio(i, 200) * ALTO_MUNDO,
            fase: aleatorio(i, 300) * Math.PI * 2,
            tipo: i % 3
        });
    }
}

// --------------------------------------------------
// CÁMARA Y COORDENADAS ISOMÉTRICAS
// --------------------------------------------------

function proyectar(x, y, z = 0) {
    const diferenciaX = x - jugador.x;
    const diferenciaY = y - jugador.y;

    return {
        x: ancho / 2 + (diferenciaX - diferenciaY) * TAM * 0.72,
        y: alto / 2 + (diferenciaX + diferenciaY) * TAM * 0.36 - z
    };
}

function dibujarRombo(x, y, rx, ry, color) {
    ctx.beginPath();
    ctx.moveTo(x, y - ry);
    ctx.lineTo(x + rx, y);
    ctx.lineTo(x, y + ry);
    ctx.lineTo(x - rx, y);
    ctx.closePath();

    ctx.fillStyle = color;
    ctx.fill();
}

function dibujarTerreno(x, y, casilla) {
    const p = proyectar(x, y);
    const rx = TAM * 0.72;
    const ry = TAM * 0.36;

    if (casilla.terreno === "agua") {
        dibujarRombo(p.x, p.y, rx, ry, colores.agua);
        dibujarRombo(
            p.x,
            p.y - 2,
            rx * 0.9,
            ry * 0.8,
            colores.aguaClara
        );

        ctx.strokeStyle = "#c9eeff70";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x - rx * 0.25, p.y - 2);
        ctx.lineTo(p.x + rx * 0.3, p.y - 2);
        ctx.stroke();

        return;
    }

    let base = colores.hierba;
    let parteSuperior = colores.hierbaClara;

    if (casilla.terreno === "camino") {
        base = colores.camino;
        parteSuperior = colores.caminoClaro;
    }

    if (casilla.terreno === "piedra") {
        base = colores.piedra;
        parteSuperior = colores.piedraClara;
    }

    dibujarRombo(p.x, p.y, rx, ry, base);
    dibujarRombo(p.x, p.y - 2, rx * 0.94, ry * 0.83, parteSuperior);

    // Pequeños detalles sobre la hierba.
    if (casilla.terreno === "hierba" && aleatorio(x, y) > 0.94) {
        ctx.fillStyle = "#d4f1d58a";
        ctx.fillRect(p.x + 3, p.y - 5, 2, 2);
    }

    if (casilla.objeto) {
        dibujarObjeto(p.x, p.y, casilla.objeto, x + y);
    }
}

// --------------------------------------------------
// OBJETOS, FLORES Y CRISTALES
// --------------------------------------------------

function dibujarObjeto(x, y, tipo, semilla) {
    const objeto = bloques[tipo];

    if (!objeto) return;

    const movimiento = Math.sin(tiempo * 0.05 + semilla) * 2;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "23px system-ui, sans-serif";

    if (tipo === "linterna") {
        ctx.shadowColor = "#ffcf96";
        ctx.shadowBlur = 18;
    } else if (tipo === "cristal") {
        ctx.shadowColor = "#9ce8ff";
        ctx.shadowBlur = 12;
    } else {
        ctx.shadowColor = "#ffc3e6";
        ctx.shadowBlur = 5;
    }

    ctx.fillText(objeto.emoji, x, y - 18 + movimiento);
    ctx.restore();
}

// --------------------------------------------------
// PERSONAJE
// --------------------------------------------------

function dibujarJugador() {
    const p = proyectar(jugador.x, jugador.y, jugador.salto);
    const balanceo = Math.sin(jugador.paso) * 2;

    // Sombra.
    ctx.fillStyle = "#11132d55";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 2, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Piernas.
    ctx.fillStyle = "#514167";
    ctx.fillRect(p.x - 8, p.y - 20 + balanceo, 6, 17);
    ctx.fillRect(p.x + 2, p.y - 20 - balanceo, 6, 17);

    // Cuerpo.
    ctx.fillStyle = "#df8fbd";
    ctx.fillRect(p.x - 10, p.y - 35, 20, 17);

    // Cabello.
    ctx.fillStyle = "#514067";
    ctx.fillRect(p.x - 10, p.y - 49, 20, 7);
    ctx.fillRect(p.x - 10, p.y - 44, 4, 8);

    // Cabeza.
    ctx.fillStyle = "#f4c6c9";
    ctx.fillRect(p.x - 9, p.y - 43, 18, 15);

    // Ojos.
    ctx.fillStyle = "#50354c";
    ctx.fillRect(p.x - 5, p.y - 38, 2, 2);
    ctx.fillRect(p.x + 3, p.y - 38, 2, 2);

    // Corazón sobre la cabeza.
    ctx.font = "13px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("♡", p.x, p.y - 55);

    // Pequeños brazos.
    ctx.fillStyle = "#f4c6c9";
    ctx.fillRect(p.x - 13, p.y - 32, 3, 11);
    ctx.fillRect(p.x + 10, p.y - 32, 3, 11);
}

// --------------------------------------------------
// ESTRELLAS Y LUCIÉRNAGAS
// --------------------------------------------------

function dibujarCielo() {
    const fondo = ctx.createLinearGradient(0, 0, 0, alto);

    fondo.addColorStop(0, "#151c40");
    fondo.addColorStop(0.55, "#28375f");
    fondo.addColorStop(1, "#4b577c");

    ctx.fillStyle = fondo;
    ctx.fillRect(0, 0, ancho, alto);

    // Estrellas fijas.
    for (let i = 0; i < 95; i++) {
        const x = aleatorio(i, 600) * ancho;
        const y = aleatorio(i, 700) * alto * 0.65;
        const brillo = 0.3 + Math.sin(tiempo * 0.035 + i) ** 2 * 0.6;

        ctx.globalAlpha = brillo;
        ctx.fillStyle = "#fff0ff";
        ctx.fillRect(x, y, 1.5, 1.5);
    }

    ctx.globalAlpha = 1;

    // Luna.
    ctx.fillStyle = "#fff0d7";
    ctx.shadowColor = "#ffe7cf";
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.arc(ancho - 72, 100, 24, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    ctx.fillStyle = "#1b2348";
    ctx.beginPath();
    ctx.arc(ancho - 61, 91, 22, 0, Math.PI * 2);
    ctx.fill();
}

function dibujarLuciernagas() {
    for (let i = 0; i < 25; i++) {
        const x = (
            aleatorio(i, 800) * ancho +
            Math.sin(tiempo * 0.012 + i) * 25 +
            ancho
        ) % ancho;

        const y = (
            aleatorio(i, 900) * alto +
            Math.cos(tiempo * 0.016 + i) * 18 +
            alto
        ) % alto;

        const brillo = 0.25 + Math.sin(tiempo * 0.05 + i) ** 2 * 0.6;

        ctx.globalAlpha = brillo;
        ctx.fillStyle = i % 2 ? "#ffc7e8" : "#b8dcff";
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 10;

        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
}

// --------------------------------------------------
// DIBUJAR EL MUNDO COMPLETO
// --------------------------------------------------

function dibujarMundo() {
    tiempo++;

    dibujarCielo();

    // Solo dibujamos la parte cercana al personaje.
    const radio = 14;
    const lista = [];

    for (
        let y = Math.max(0, Math.floor(jugador.y - radio));
        y < Math.min(ALTO_MUNDO, jugador.y + radio);
        y++
    ) {
        for (
            let x = Math.max(0, Math.floor(jugador.x - radio));
            x < Math.min(ANCHO_MUNDO, jugador.x + radio);
            x++
        ) {
            lista.push({ x, y, profundidad: x + y });
        }
    }

    // Orden de profundidad para simular perspectiva isométrica.
    lista.sort((a, b) => a.profundidad - b.profundidad);

    for (const casilla of lista) {
        dibujarTerreno(
            casilla.x,
            casilla.y,
            mundo[casilla.y][casilla.x]
        );
    }

    dibujarLuciernagas();
    dibujarJugador();
    dibujarParticulas();

    requestAnimationFrame(dibujarMundo);
}

// --------------------------------------------------
// MOVIMIENTO Y COLISIONES
// --------------------------------------------------

function mover(dx, dy) {
    if (!iniciado) return;

    const ahora = performance.now();

    // Evita movimientos excesivamente rápidos.
    if (ahora - ultimoMovimiento < 110) return;
    ultimoMovimiento = ahora;

    const nx = Math.max(2, Math.min(ANCHO_MUNDO - 3, jugador.x + dx));
    const ny = Math.max(2, Math.min(ALTO_MUNDO - 3, jugador.y + dy));

    const casilla = mundo[Math.round(ny)][Math.round(nx)];

    if (casilla.terreno === "agua") {
        mostrarMensaje("🌊 El agua brilla bajo la luna. ¡Busquemos otro camino!");
        return;
    }

    jugador.x = nx;
    jugador.y = ny;
    jugador.direccionX = dx;
    jugador.direccionY = dy;
    jugador.paso += 1;

    revisarTesoro();
}

function revisarTesoro() {
    const x = Math.round(jugador.x);
    const y = Math.round(jugador.y);
    const casilla = mundo[y][x];

    if (!casilla.objeto) return;

    if (casilla.objeto === "flor" || casilla.objeto === "cristal") {
        const tipo = casilla.objeto;

        inventario[tipo]++;
        casilla.objeto = null;

        crearParticulas(tipo === "flor" ? "🌷" : "✨");

        mostrarMensaje(
            tipo === "flor"
                ? "🌷 ¡Una flor para vuestro jardín!"
                : "💎 ¡Encontraste un cristal lunar!"
        );

        actualizarMision();
    }
}

// --------------------------------------------------
// COLOCAR BLOQUES
// --------------------------------------------------

function colocarBloque() {
    if (!iniciado) return;

    const x = Math.round(jugador.x + jugador.direccionX);
    const y = Math.round(jugador.y + jugador.direccionY);

    if (!mundo[y] || !mundo[y][x]) return;

    const casilla = mundo[y][x];

    if (casilla.terreno === "agua") {
        mostrarMensaje("🌊 Aquí no podemos construir.");
        return;
    }

    // No reemplazar objetos que todavía se pueden recoger.
    if (casilla.objeto === "cristal" || casilla.objeto === "flor") {
        mostrarMensaje("✨ ¡Primero recoge el tesoro de esa casilla!");
        return;
    }

    casilla.objeto = bloqueSeleccionado;
    inventario[bloqueSeleccionado]++;

    crearParticulas(bloques[bloqueSeleccionado].emoji);

    mostrarMensaje(
        `${bloques[bloqueSeleccionado].emoji} ¡Colocaste ${bloques[bloqueSeleccionado].nombre.toLowerCase()}!`
    );

    actualizarMision();
}

// --------------------------------------------------
// SALTO
// --------------------------------------------------

function saltar() {
    if (!iniciado || jugador.salto > 0) return;

    jugador.velocidadSalto = 5.5;
}

function actualizarSalto() {
    jugador.salto += jugador.velocidadSalto;
    jugador.velocidadSalto -= 0.38;

    if (jugador.salto < 0) {
        jugador.salto = 0;
        jugador.velocidadSalto = 0;
    }
}

// --------------------------------------------------
// PARTÍCULAS MÁGICAS
// --------------------------------------------------

function crearParticulas(emoji) {
    for (let i = 0; i < 9; i++) {
        particulas.push({
            x: ancho / 2 + (Math.random() - 0.5) * 70,
            y: alto / 2 - 20,
            vx: (Math.random() - 0.5) * 2.5,
            vy: -Math.random() * 2.5 - 0.5,
            vida: 45 + Math.random() * 20,
            emoji
        });
    }
}

function dibujarParticulas() {
    for (let i = particulas.length - 1; i >= 0; i--) {
        const p = particulas[i];

        p.x += p.vx;
        p.y += p.vy;
        p.vida--;

        ctx.globalAlpha = Math.min(1, p.vida / 20);
        ctx.font = "16px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(p.emoji, p.x, p.y);

        if (p.vida <= 0) {
            particulas.splice(i, 1);
        }
    }

    ctx.globalAlpha = 1;
}

// --------------------------------------------------
// MISIONES
// --------------------------------------------------

function actualizarMision() {
    const titulo = document.querySelector(".mision h2");
    const descripcion = document.querySelector(".mision p");

    const tesoros = inventario.flor + inventario.cristal;

    if (tesoros >= 5) {
        titulo.textContent = "¡Jardín desbloqueado! 💗";
        descripcion.textContent =
            `Has recogido ${tesoros} tesoros. Sigue construyendo vuestro pequeño hogar.`;
    } else {
        titulo.textContent = "Construyamos nuestro hogar";
        descripcion.textContent =
            `Flores: ${inventario.flor} · Cristales: ${inventario.cristal}. ¡Recoge 5 tesoros!`;
    }
}

// --------------------------------------------------
// MENSAJES FLOTANTES
// --------------------------------------------------

function mostrarMensaje(texto) {
    mensaje.textContent = texto;
    mensaje.classList.add("visible");

    clearTimeout(mensajeTemporizador);

    mensajeTemporizador = setTimeout(() => {
        mensaje.classList.remove("visible");
    }, 2300);
}

// --------------------------------------------------
// CARTAS Y REGALOS ROMÁNTICOS
// --------------------------------------------------

const cartas = [
    "Si pudiera construir un lugar perfecto, tendría flores, estrellas y un rinconcito para compartir contigo. ♡",

    "Mi parte favorita de este pequeño universo sería crear recuerdos contigo, uno por uno. 🌙",

    "No necesitamos un castillo enorme. A veces, un mundo pequeñito y alguien especial son suficientes. 💗",

    "Misión secreta: recordarte que eres una persona muy especial. Recompensa: un abrazo imaginario y muchas estrellas. ✨",

    "Entre todos los bloques de este universo, elegiría construir contigo un lugar al que siempre queramos volver. 🏡"
];

function mostrarCarta() {
    const carta = cartas[Math.floor(Math.random() * cartas.length)];

    mostrarMensaje(`💌 ${nombreFavorito ? nombreFavorito + ": " : ""}${carta}`);
}

botonCarta.addEventListener("click", mostrarCarta);

botonRegalo.addEventListener("click", () => {
    const regalo = cartas[Math.floor(Math.random() * cartas.length)];

    mostrarMensaje(`🎁 Sorpresa para ti: ${regalo}`);
    crearParticulas("💗");
});

// --------------------------------------------------
// SELECCIÓN DEL INVENTARIO
// --------------------------------------------------

document.querySelectorAll(".bloque").forEach((boton) => {
    boton.addEventListener("click", () => {
        bloqueSeleccionado = boton.dataset.bloque;

        document.querySelectorAll(".bloque").forEach((otro) => {
            otro.classList.toggle("seleccionado", otro === boton);
        });

        mostrarMensaje(
            `${bloques[bloqueSeleccionado].emoji} Seleccionaste ${bloques[bloqueSeleccionado].nombre}.`
        );
    });
});

// --------------------------------------------------
// CONTROLES DE TECLADO
// --------------------------------------------------

window.addEventListener("keydown", (evento) => {
    const tecla = evento.key.toLowerCase();

    if (
        ["arrowup", "arrowdown", "arrowleft", "arrowright", " "]
            .includes(tecla)
    ) {
        evento.preventDefault();
    }

    if (!iniciado || teclas[tecla]) return;

    teclas[tecla] = true;

    if (tecla === "w" || tecla === "arrowup") mover(0, -1);
    if (tecla === "s" || tecla === "arrowdown") mover(0, 1);
    if (tecla === "a" || tecla === "arrowleft") mover(-1, 0);
    if (tecla === "d" || tecla === "arrowright") mover(1, 0);

    if (tecla === "e") colocarBloque();
    if (tecla === " ") saltar();
});

window.addEventListener("keyup", (evento) => {
    teclas[evento.key.toLowerCase()] = false;
});

window.addEventListener("blur", () => {
    for (const tecla in teclas) {
        teclas[tecla] = false;
    }
});

// --------------------------------------------------
// CONTROLES TÁCTILES
// --------------------------------------------------

function crearControlTactil(id, dx, dy) {
    const boton = document.getElementById(id);

    if (!boton) return;

    let intervalo = null;

    function comenzar(evento) {
        evento.preventDefault();

        mover(dx, dy);

        clearInterval(intervalo);
        intervalo = setInterval(() => mover(dx, dy), 145);
    }

    function detener() {
        clearInterval(intervalo);
        intervalo = null;
    }

    boton.addEventListener("pointerdown", comenzar);
    boton.addEventListener("pointerup", detener);
    boton.addEventListener("pointercancel", detener);
    boton.addEventListener("lostpointercapture", detener);
}

// --------------------------------------------------
// INICIO DEL JUEGO
// --------------------------------------------------

botonJugar.addEventListener("click", () => {
    nombreFavorito = inputNombre.value.trim();

    pantallaInicio.style.display = "none";
    juego.hidden = false;
    iniciado = true;

    const saludo = document.getElementById("saludo");

    saludo.textContent = nombreFavorito
        ? `Un mundo para ti y ${nombreFavorito} ♡`
        : "Nuestro pequeño mundo ♡";

    mostrarMensaje("🌙 ¡Bienvenidos a Everlove!");
});

// --------------------------------------------------
// INICIAR
// --------------------------------------------------

crearMundo();
requestAnimationFrame(dibujarMundo);

// Actualizar el salto sin depender de la velocidad de dibujo.
function bucleFisica() {
    actualizarSalto();
    requestAnimationFrame(bucleFisica);
}

requestAnimationFrame(bucleFisica);
