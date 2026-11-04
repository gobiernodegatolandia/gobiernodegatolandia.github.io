/* ============================================================
   BOR · Boletin Oficial del Reino de Gatolandia
   Indice dinamico de leyes.

   NO hace falta editar este archivo para publicar una ley nueva.
   Basta con crear un archivo en /bor/leyes/<id>.js con este
   formato (sin corchetes, sin comillas alrededor del texto):

   ------------------------------------------------------------
   ---
   id: mi-nueva-ley
   titulo: "Ley Organica de Ejemplo"
   meta: "BOR no 020 · 01/01/2027 · Asamblea Nacional"
   estado: "Vigente"
   historial:
     - 01/01/2027 · Publicacion inicial (BOR no 020)
   texto: |-
     Aqui empieza el texto de la ley, escrito en claro.
     Cada linea es un parrafo. Las lineas que empiezan por
     TITULO, CAPITULO, Articulo, PREAMBULO o DISPOSICION
     generan el indice automaticamente.
   ---
   ------------------------------------------------------------

   El navegador lee automaticamente la carpeta /bor/leyes/ y
   publica todo lo que encuentre en ella.
   ============================================================ */

var BOR_CARPETA_LEYES = 'bor/leyes/';

// ------------------------------------------------------------
// ANTI-CACHA: las leyes se leen SIEMPRE frescas del servidor.
// Cada peticion lleva un parametro de hora actual y cache:'no-store',
// asi que al actualizar el archivo de una ley basta con recargar
// bor.html normalmente (ya no hace falta Ctrl+Mayus+R).
// ------------------------------------------------------------
function urlSinCache(u) {
    return u + (u.indexOf('?') >= 0 ? '&' : '?') + '_ts=' + Date.now();
}
function fetchSinCache(u) {
    return fetch(urlSinCache(u), {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
    });
}

// Parser minimo del formato "ficha" (claves simples + bloque de texto).
function parseLeyFile(raw, nombreArchivo) {
    // El archivo puede venir envuelto en una plantilla `...` (para que
    // tambien sea un .js valido) → se extrae su contenido primero.
    const unido = raw.replace(/^/, '').trim();
    const m = unido.match(/^[`'"]([\s\S]*?)[`'"]\s*;?\s*$/);
    return parseContenido(m ? m[1] : raw, nombreArchivo);
}

function parseContenido(contenido, nombreArchivo) {
    let lineas = contenido.replace(/^/, '').replace(/\r/g, '').split('\n');

    // Saltar el preambulo hasta el primer separador "---"
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
            // Bloque literal: "texto: |-" seguido de lineas sangradas.
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

// Escaneo automatico de la carpeta /bor/leyes/ (funciona en servidores
// estaticos como GitHub Pages, que devuelven el listado de la carpeta).
async function escanearCarpetaLeyes() {
    try {
        const res = await fetchSinCache(BOR_CARPETA_LEYES);
        if (!res.ok) return null;
        const html = await res.text();
        const enlaces = [...html.matchAll(/href="([^"?#]+?\.(?:js|txt|md))"/gi)].map(m => m[1]);
        const nombres = [...new Set(enlaces)]
            .filter(n => !n.includes('/') && n !== 'index.html' && !/^LEY-EJEMPLO\./i.test(n));
        if (!nombres.length) return null;
        const archivos = nombres.sort((a, b) => a.localeCompare(b, 'es'));
        const leyes = await Promise.all(archivos.map(async nombre => {
            try {
                const r = await fetchSinCache(BOR_CARPETA_LEYES + encodeURIComponent(nombre));
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
// anadir una basta con subir su archivo y recargar la pagina).
async function cargarPorIndiceEstatico() {
    const ids = (typeof BOR_LEYES_IDS !== 'undefined' && Array.isArray(BOR_LEYES_IDS))
        ? BOR_LEYES_IDS
        : ['constitucion', 'sanidad', 'carreteras', 'incendios', 'educacion', 'accesibilidad',
           'loidg', 'justicia', 'divisionterritorial', 'nedg', 'ntdg', 'ndtig', 'publicidad',
           'dispositivos-electronicos', 'lsp', 'telecomunicaciones', 'gdg2026017', 'lpdap',
           'lodepearpdrzr', 'lacrandp'];
    const leyes = await Promise.all(ids.map(async id => {
        try {
            const r = await fetchSinCache(BOR_CARPETA_LEYES + id + '.js');
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

// Orden de publicacion: por numero de BOR si la meta lo contiene
// ("BOR no 001 ..."), y como desempate, el nombre del archivo.
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

// ------------------------------------------------------------
// Recarga automatica: si detecta una ley nueva o modificada en la
// carpeta (comparando tamano + primeras lineas de cada archivo),
// vuelve a cargarlas todas y avisa con un aviso discreto.
// ------------------------------------------------------------
// Lista los nombres de archivo de la carpeta sin cache (null si el
// servidor no permite listar directorios: entonces el vigilante no actua).
async function listarArchivosLeyes() {
    try {
        const res = await fetchSinCache(BOR_CARPETA_LEYES);
        if (!res.ok) return null;
        const html = await res.text();
        const enlaces = [...html.matchAll(/href="([^"?#]+?\.(?:js|txt|md))"/gi)].map(m => m[1]);
        const nombres = [...new Set(enlaces)]
            .filter(n => !n.includes('/') && n !== 'index.html')
            .sort((a, b) => a.localeCompare(b, 'es'));
        return nombres.length ? nombres : null;
    } catch (e) { return null; }
}

async function firmaLeyes() {
    try {
        const nombres = await listarArchivosLeyes();
        if (!nombres) return null;
        const partes = await Promise.all(nombres.map(async nombre => {
            try {
                const t = await (await fetchSinCache(BOR_CARPETA_LEYES + encodeURIComponent(nombre))).text();
                return nombre + ':' + t.length + ':' + t.slice(0, 160);
            } catch (e) { return nombre + ':err'; }
        }));
        return partes.join('|');
    } catch (e) { return null; }
}

let ultimaFirma = null;
async function revisarLeyes() {
    const f = await firmaLeyes();
    if (!f) return;
    if (ultimaFirma === null) { ultimaFirma = f; return; }
    if (f !== ultimaFirma) {
        ultimaFirma = f;
        await publicarLeyes();
        document.dispatchEvent(new CustomEvent('bor:leyes-actualizadas'));
    }
}
function iniciarVigilanteLeyes() {
    setInterval(revisarLeyes, 30000);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') revisarLeyes();
    });
}

publicarLeyes().then(() => {
    if (typeof document !== 'undefined' && document.addEventListener) {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciarVigilanteLeyes);
        else iniciarVigilanteLeyes();
    }
});
