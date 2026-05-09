# Asyncron

![Asyncron Logo](assets/logo.png)

Asyncron es una herramienta local-first para comunicación asíncrona. Permite grabar tu pantalla y adjuntar archivos (código, documentos, enlaces) en un único bundle `.async` seguro y privado.

---

## 🚀 Características Principales

- **Grabación Multimodal:** Captura pantalla, cámara o ambos simultáneamente.
- **Bundling Inteligente:** Empaqueta grabaciones con archivos adjuntos en un formato `.async` (basado en TAR).
- **Visor Independiente:** Reproduce y extrae archivos sin necesidad de servidores externos.
- **Cross-Browser:** Soporte completo para Chrome (MV3) y Firefox (MV2).
- **Privacidad Total:** Todo el procesamiento ocurre localmente en tu navegador.

## 📂 Estructura del Proyecto

- `asyncron-chrome/`: Extensión para Google Chrome (Manifest V3).
- `asyncron-firefox/`: Extensión para Mozilla Firefox (Manifest V2).
- `assets/`: Recursos visuales y branding.
- `scripts/`: Herramientas de automatización y mantenimiento.

---

## 🛠️ Guía de Instalación (Modo Desarrollador)

### Chrome / Edge / Brave
1.  Ve a `chrome://extensions/`.
2.  Activa el **Modo de desarrollador** (esquina superior derecha).
3.  Haz clic en **Cargar descomprimida**.
4.  Selecciona la carpeta `asyncron-chrome/`.

### Firefox
1.  Ve a `about:debugging#/runtime/this-firefox`.
2.  Haz clic en **Cargar complemento temporal**.
3.  Selecciona el archivo `manifest.json` dentro de `asyncron-firefox/`.

---

## 📺 Visor Standalone
Asyncron ahora incluye un visor de escritorio completo que desacopla la visualización de la interfaz de la extensión.

- **Acceso:** Puedes abrirlo desde la pestaña **VIEWER** de la extensión o abriendo directamente el archivo `viewer.html` en cualquier navegador.
- **Uso:** Arrastra cualquier archivo `.async` al área de soltado.
- **Funciones:** Reproductor de video integrado, descarga individual de archivos y previsualización de enlaces con protocolo automático.

---

## 🏗️ Arquitectura Técnica

- **Formato .async:** Basado en el estándar TAR para máxima compatibilidad.
- **Criptografía local:** Los bundles se generan íntegramente en el cliente.
- **Polyfill:** Utiliza `webextension-polyfill` para garantizar la interoperabilidad de las APIs de Chrome y Firefox.

---

## 📄 Licencia
Este proyecto es de código abierto y está disponible bajo la licencia MIT.
