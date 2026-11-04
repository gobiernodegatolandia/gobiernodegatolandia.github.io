/* ============================================================
   BOR · Boletín Oficial del Reino de Gatolandia
   Índice dinámico de leyes.

   NO hace falta editar este archivo para publicar una ley nueva.
   Basta con crear un archivo en /bor/leyes/<id>.js con este
   formato (sin corchetes, sin comillas alrededor del texto):

   ------------------------------------------------------------
   ---
   id: mi-nueva-ley
   titulo: "Ley Orgánica de Ejemplo"
   meta: "BOR nº 020 · 01/01/2027 · Asamblea Nacional"
   estado: "Vigente"
   historial:
     - 01/01/2027 · Publicación inicial (BOR nº 020)
   texto: |-
     Aquí empieza el texto de la ley, escrito en claro.
     Cada línea es un párrafo. Las líneas que empiezan por
     TÍTULO, CAPÍTULO, Artículo, PREÁMBULO o DISPOSICIÓN
     generan el índice automáticamente.
   ---
   ------------------------------------------------------------

   El navegador lee automáticamente la carpeta /bor/leyes/ y
   publica todo lo que encuentre en ella.
   ============================================================ */

var BOR_CARPETA_LEYES = 'bor/leyes/';

// Parser mínimo del formato "ficha" (claves simples + bloque de texto).
function parseLeyFile(raw, nombreArchivo) {
    // El archivo puede venir envuelto en una plantilla `...` (para que
    // también sea un .js válido) → se extrae su contenido primero.
    const unido = raw.replace(/^/, '').trim();
    const m = unido.match(/^[`'"]([\s\S]*?)[`'"]\s*;?\s*$/);
    return parseContenido(m ? m[1] : raw, nombreArchivo);
}

function parseContenido(contenido, nombreArchivo) {
    let lineas = contenido.replace(/^/, '').split('\n');

    // Saltar el preámbulo hasta el primer separador "---"
    const inicio = lineas.findIndex(l => l.trim() === '---');
    if (inicio >= 0) {
        lineas = lineas.slice(inicio + 1);
        const fin = lineas.findIndex(l => l.trim() === '---');
        if (fin >= 0) lineas = lineas.slice(0, fin);
    }

    const ley = { id: '', titulo: '', meta: '', estado: 'Vigente', historial: [], texto: '' };
    const limpiar = s => s.trim().replace(/^["'](.*)["']$/, '$1');

    for (let i = 0; i < lineas.length; i++) {
        const m = lineas[i].match(/^\s*([A-Za-zÁÉÍÓÚÑáéíóúñ_]+)\s*:\s*(.*)$/);
        if (!m) continue;
        const clave = m[1].toLowerCase();
        const valor = m[2].trim();

        if (clave === 'texto') {
            // Bloque literal: "texto: |-" seguido de líneas sangradas.
            const cuerpo = [];
            while (i + 1 < lineas.length) {
                const sig = lineas[i + 1];
                if (/^[A-Za-zÁÉÍÓÚÑáéíóúñ_]+\s*:/.test(sig)) break; // otra clave al margen izquierdo
                cuerpo.push(sig.startsWith('  ') ? sig.slice(2) : sig);
                i++;
            }
            ley.texto = cuerpo.join('\n').replace(/\s+$/, '');
        } else if (clave === 'historial') {
            while (i + 1 < lineas.length && /^\s*-\s+/.test(lineas[i + 1])) {
                ley.historial.push(limpiar(lineas[i + 1].replace(/^\s*-\s+/, '')));
                i++;
            }
        } else if (clave in ley) {
            ley[clave] = limpiar(valor);
        }
    }

    if (!ley.id) ley.id = nombreArchivo.replace(/\.(js|txt|md)$/i, '');
    if (!ley.titulo) ley.titulo = ley.id;
    return ley;
}

// Escaneo automático de la carpeta /bor/leyes/ (funciona en servidores
// estáticos como GitHub Pages, que devuelven el listado de la carpeta).
async function escanearCarpetaLeyes() {
    try {
        const res = await fetch(BOR_CARPETA_LEYES + '?t=' + Date.now(), { cache: 'no-store' });
        if (!res.ok) return null;
        const html = await res.text();
        const enlaces = [...html.matchAll(/href="([^"?#]+?\.(?:js|txt|md))"/gi)].map(m => m[1]);
        const nombres = [...new Set(enlaces)]
            .filter(n => !n.includes('/') && n !== 'index.html' && !/^LEY-EJEMPLO\./i.test(n));
        if (!nombres.length) return null;
        const archivos = nombres.sort((a, b) => a.localeCompare(b, 'es'));
        const leyes = await Promise.all(archivos.map(async nombre => {
            try {
                const r = await fetch(BOR_CARPETA_LEYES + encodeURIComponent(nombre));
                if (!r.ok) return null;
                return parseLeyFile(await r.text(), nombre);
            } catch (e) { return null; }
        }));
        return leyes.filter(Boolean);
    } catch (e) {
        return null;
    }
}

// Alternativa si el servidor no permite listar carpetas: sondear los ids
// conocidos (solo hay que tocar esta lista si se RETIRA una ley; para
// añadir una basta con subir su archivo y recargar la página).
async function cargarPorIndiceEstatico() {
    const ids = (typeof BOR_LEYES_IDS !== 'undefined' && Array.isArray(BOR_LEYES_IDS))
        ? BOR_LEYES_IDS
        : ['constitucion', 'sanidad', 'carreteras', 'incendios', 'educacion', 'accesibilidad',
           'loidg', 'justicia', 'divisionterritorial', 'nedg', 'ntdg', 'ndtig', 'publicidad',
           'dispositivos-electronicos', 'lsp', 'telecomunicaciones', 'gdg2026017', 'lpdap',
           'lodepearpdrzr', 'lacrandp'];
    const leyes = await Promise.all(ids.map(async id => {
        try {
            const r = await fetch(BOR_CARPETA_LEYES + id + '.js');
            if (!r.ok) return null;
            return parseLeyFile(await r.text(), id + '.js');
        } catch (e) { return null; }
    }));
    return leyes.filter(Boolean);
}

async function cargarLeyes() {
    let leyes = await escanearCarpetaLeyes();
    if (!leyes || !leyes.length) leyes = await cargarPorIndiceEstatico();
    return leyes;
}

// Orden de publicación: por número de BOR si la meta lo contiene
// ("BOR nº 001 ..."), y como desempate, el nombre del archivo.
function ordenarLeyes(leyes) {
    const numBor = l => {
        const m = (l.meta || '').match(/n[º°o]\s*0*(\d+)/i);
        return m ? parseInt(m[1], 10) : 999999;
    };
    return leyes.slice().sort((a, b) =>
        numBor(a) - numBor(b) || a.id.localeCompare(b.id, 'es'));
}

// Rellena la variable global LEYES que usa bor.html.
async function publicarLeyes() {
    try {
        const leyes = await cargarLeyes();
        window.LEYES = ordenarLeyes(leyes);
    } catch (e) {
        console.error('BOR: no se pudieron cargar las leyes', e);
        window.LEYES = [];
    }
    document.dispatchEvent(new CustomEvent('bor:leyes-listas'));
}

publicarLeyes();
