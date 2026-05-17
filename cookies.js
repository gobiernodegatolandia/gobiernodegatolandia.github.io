// =========================================================================
// SISTEMA DE GESTIÓN DE CONSENTIMIENTO DE COOKIES - LEY ORGÁNICA 7/2026 (LOIDG)
// =========================================================================
// Este script regula la instalación de cookies y tecnologías de rastreo,
// garantizando la soberanía del usuario y la carga condicional de scripts externos.
// INCLUYE: Alternativa legal de Captcha Matemático en caso de rechazo y Callbacks.
// =========================================================================

(function () {
    // Clave de almacenamiento para recordar la decisión del usuario
    const COOKIE_STORAGE_KEY = 'gatolandia_digital_privacy_consent';

    // Variable global para almacenar el resultado del captcha en modo privacidad
    let captchaRespuestaCorrecta = 0;

    // Función para cargar Cloudflare Turnstile dinámicamente solo con consentimiento expreso
    function activarServiciosRastreo() {
        console.log("[LOIDG] Consentimiento otorgado. Activando scripts de rastreo y seguridad...");
        
        // Definir los callbacks globales que espera Turnstile antes de cargar el script
        window.onCaptchaSuccess = function(token) {
            const btnLogin = document.getElementById('doLogin');
            if (btnLogin) {
                btnLogin.disabled = false;
                btnLogin.removeAttribute('style'); 
                btnLogin.className = "btn-access";
            }
            console.log("Verificación completada. Acceso permitido.");
        };

        window.onCaptchaExpired = function() {
            const btnLogin = document.getElementById('doLogin');
            if (btnLogin) {
                btnLogin.disabled = true;
                btnLogin.style.opacity = "0.5";
                btnLogin.style.cursor = "not-allowed";
            }
            alert("La sesión de verificación ha caducado. Por favor, repite el captcha.");
        };

        // Configurar los parámetros directamente en el elemento contenedor del index.html
        const contenedor = document.getElementById('cf-turnstile');
        if (contenedor) {
            contenedor.setAttribute('data-sitekey', '0x4AAAAAADOi_WTxFsMfPn9Q');
            contenedor.setAttribute('data-callback', 'onCaptchaSuccess');
            contenedor.setAttribute('data-expired-callback', 'onCaptchaExpired');
            contenedor.setAttribute('data-theme', 'light');
        }

        // Inyectar el script de Cloudflare de manera legal en el documento
        const scriptTurnstile = document.createElement('script');
        scriptTurnstile.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
        scriptTurnstile.async = true;
        scriptTurnstile.defer = true;
        document.head.appendChild(scriptTurnstile);
    }

    // Función alternativa para desplegar el Captcha Matemático Local si el ciudadano rechaza
    function desplegarCaptchaMatematicoAlternativo() {
        console.log("[LOIDG] Modo de Privacidad Activo. Generando validación matemática alternativa.");

        const contenedor = document.getElementById('cf-turnstile');
        if (!contenedor) {
            console.warn("[LOIDG] No se encontró el contenedor de Turnstile para inyectar el captcha alternativo.");
            return;
        }

        // Limpiar el contenedor por si acaso quedara algo residual
        contenedor.innerHTML = '';

        // Generar la operación matemática aleatoria
        const numeroA = Math.floor(Math.random() * 10) + 1;
        const numeroB = Math.floor(Math.random() * 10) + 1;
        captchaRespuestaCorrecta = numeroA + numeroB;

        // Crear la interfaz del captcha matemático adaptada a los estilos oficiales
        const cajaCaptcha = document.createElement('div');
        Object.assign(cajaCaptcha.style, {
            border: '2px solid #b91c1c', // --gob-error
            padding: '15px',
            borderRadius: '4px',
            backgroundColor: '#ffffff',
            maxWidth: '300px',
            margin: '10px auto',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            textAlign: 'left'
        });

        const etiquetaInfo = document.createElement('label');
        etiquetaInfo.innerHTML = `<strong>Verificación de Seguridad</strong><br>Como ha deshabilitado el uso de cookies, se ha desactivado la verificación automática. Resuelva para habilitar el acceso:<br><span style="font-size: 1.1rem; font-weight: 800; color: #002d57;">${numeroA} + ${numeroB} = ?</span>`;
        Object.assign(etiquetaInfo.style, {
            display: 'block',
            fontSize: '0.8rem',
            color: '#1e293b',
            marginBottom: '8px'
        });

        const campoEntrada = document.createElement('input');
        campoEntrada.type = 'number';
        campoEntrada.placeholder = 'Resultado';
        Object.assign(campoEntrada.style, {
            width: '100%',
            padding: '8px',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            fontSize: '0.9rem',
            boxSizing: 'border-box'
        });

        // Validar en tiempo real la respuesta matemática introducida por el usuario
        campoEntrada.addEventListener('input', function() {
            const btnLogin = document.getElementById('doLogin');
            if (parseInt(campoEntrada.value, 10) === captchaRespuestaCorrecta) {
                cajaCaptcha.style.borderColor = '#b8924e'; // --gob-accent
                if (btnLogin) {
                    btnLogin.disabled = false;
                    btnLogin.removeAttribute('style');
                    btnLogin.className = "btn-access";
                }
            } else {
                cajaCaptcha.style.borderColor = '#b91c1c'; // --gob-error
                if (btnLogin) {
                    btnLogin.disabled = true;
                    btnLogin.style.opacity = "0.5";
                    btnLogin.style.cursor = "not-allowed";
                }
            }
        });

        // Ensamblar los elementos dentro del div de la Sede
        cajaCaptcha.appendChild(etiquetaInfo);
        cajaCaptcha.appendChild(campoEntrada);
        contenedor.appendChild(cajaCaptcha);
    }

    // Función para crear e inyectar el contenedor del banner en la interfaz de usuario
    function crearBannerCookies() {
        // Comprobar si el usuario ya tomó una decisión previamente
        const consentimientoPrevio = localStorage.getItem(COOKIE_STORAGE_KEY);
        if (consentimientoPrevio !== null) {
            if (consentimientoPrevio === 'aceptado') {
                activarServiciosRastreo();
            } else if (consentimientoPrevio === 'rechazado') {
                desplegarCaptchaMatematicoAlternativo();
            }
            return; // Si ya ha respondido, no se muestra el banner de nuevo
        }

        // Crear contenedor principal del banner ocupando casi toda la pantalla
        const overlay = document.createElement('div');
        overlay.id = 'cookie-consent-overlay';
        
        // Aplicar estilos en línea heredando tokens de diseño de la administración general
        Object.assign(overlay.style, {
            position: 'fixed',
            inset: '0',
            backgroundColor: 'rgba(30, 41, 59, 0.95)', // --text-dark con opacidad alta
            backdropFilter: 'blur(8px)',
            zIndex: '99999',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'slideUp 0.4s ease-out'
        });

        // Crear la caja de diálogo central del consentimiento
        const cajaConsentimiento = document.createElement('div');
        cajaConsentimiento.className = 'panel'; // Reutiliza clases del ecosistema visual
        
        Object.assign(cajaConsentimiento.style, {
            background: '#ffffff',
            color: '#1e293b',
            padding: '40px',
            borderRadius: '8px',
            maxWidth: '750px',
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            borderTop: '6px solid #b8924e', // --gob-accent
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            textAlign: 'center'
        });

        // Título del aviso legal
        const titulo = document.createElement('h2');
        titulo.innerText = 'SUS PREFERERENCIAS DE PRIVACIDAD';
        Object.assign(titulo.style, {
            fontSize: '1.6rem',
            fontWeight: '800',
            color: '#002d57', // --gob-primary
            marginBottom: '20px',
            letterSpacing: '0.5px'
        });

        // Texto informativo adaptado a las exigencias de transparencia de la ley
        const descripcion = document.createElement('p');
        descripcion.innerText = 'En cumplimiento de la Ley Orgánica 7/2026, de 1 de abril, de Independencia Digital de Gatolandia (LOIDG), le informamos que este sitio web requiere su consentimiento expreso y soberano para poder desplegar archivos de rastreo, analítica o herramientas de seguridad perimetral automatizadas en su dispositivo de navegación.';
        Object.assign(descripcion.style, {
            fontSize: '0.95rem',
            lineHeight: '1.6',
            color: '#475569',
            marginBottom: '35px'
        });

        // Contenedor de acciones (Botón Aceptar / Botón Rechazar)
        const contenedorBotones = document.createElement('div');
        Object.assign(contenedorBotones.style, {
            display: 'flex',
            flexDirection: 'column',
            gap: '15px'
        });

        // Botón de Aceptación Expresa (Texto literal según Artículo 26)
        const botonAceptar = document.createElement('button');
        botonAceptar.innerText = 'ACEPTO QUE SE INSTALEN ARCHIVOS DE RASTREO O ANALÍTICA (COOKIES) EN MI DISPOSITIVO';
        Object.assign(botonAceptar.style, {
            background: '#002d57', // --gob-primary
            color: '#ffffff',
            padding: '16px 20px',
            borderRadius: '4px',
            fontWeight: '800',
            fontSize: '0.85rem',
            border: 'none',
            cursor: 'pointer',
            transition: '0.2s ease',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
        });

        // Botón de Rechazo Expreso (Texto literal según Artículo 27)
        const botonRechazar = document.createElement('button');
        botonRechazar.innerText = 'RECHAZO LA INSTALACIÓN DE ARCHIVOS DE RASTREO O ANALÍTICA (COOKIES)';
        Object.assign(botonRechazar.style, {
            background: '#f1f5f9', // --gob-bg
            color: '#b91c1c', // --gob-error
            padding: '16px 20px',
            borderRadius: '4px',
            fontWeight: '800',
            fontSize: '0.85rem',
            border: '2px solid #b91c1c',
            cursor: 'pointer',
            transition: '0.2s ease',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
        });

        // Efectos hover interactivos integrados mediante JS para mantener la independencia del archivo
        botonAceptar.onmouseover = () => botonAceptar.style.background = '#b8924e'; // Cambio a --gob-accent
        botonAceptar.onmouseout = () => botonAceptar.style.background = '#002d57';
        
        botonRechazar.onmouseover = () => {
            botonRechazar.style.background = '#b91c1c';
            botonRechazar.style.color = '#ffffff';
        };
        botonRechazar.onmouseout = () => {
            botonRechazar.style.background = '#f1f5f9';
            botonRechazar.style.color = '#b91c1c';
        };

        // Lógica de eventos: Persistencia de la aceptación
        botonAceptar.addEventListener('click', function () {
            localStorage.setItem(COOKIE_STORAGE_KEY, 'aceptado');
            overlay.remove();
            activarServiciosRastreo();
        });

        // Lógica de eventos: Persistencia del rechazo sin bloqueos ilegales
        botonRechazar.addEventListener('click', function () {
            localStorage.setItem(COOKIE_STORAGE_KEY, 'rechazado');
            overlay.remove();
            desplegarCaptchaMatematicoAlternativo();
        });

        // Ensamblado de la estructura del árbol de nodos (DOM)
        contenedorBotones.appendChild(botonAceptar);
        contenedorBotones.appendChild(botonRechazar);
        cajaConsentimiento.appendChild(titulo);
        cajaConsentimiento.appendChild(descripcion);
        cajaConsentimiento.appendChild(contenedorBotones);
        overlay.appendChild(cajaConsentimiento);
        document.body.appendChild(overlay);
    }

    // Asegurar la ejecución del script una vez que la estructura del documento esté lista
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', crearBannerCookies);
    } else {
        crearBannerCookies();
    }
})();