<div align="center">

# ✦ Orbita Jobs

### Tu próxima oportunidad, en órbita.

Postulaciones, entrevistas y seguimientos en un solo lugar.  
Menos pestañas abiertas. Más claridad para dar el siguiente paso.

![React](https://img.shields.io/badge/React_19-20232a?style=flat-square&logo=react&logoColor=61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-20232a?style=flat-square&logo=typescript&logoColor=3178c6)
![Vite](https://img.shields.io/badge/Vite_8-20232a?style=flat-square&logo=vite&logoColor=bd34fe)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-20232a?style=flat-square&logo=tailwindcss&logoColor=38bdf8)
![Firebase](https://img.shields.io/badge/Firebase-20232a?style=flat-square&logo=firebase&logoColor=ffca28)

[**Abrir Orbita Jobs ↗**](https://prodri57.github.io/Orbita_Jobs/) · [Empezar en local](#empezar-en-local) · [Configurar sincronización](./FIREBASE_SETUP.md)

</div>

---

## Una búsqueda laboral con rumbo

Orbita Jobs es una aplicación web para llevar el registro de tus procesos de selección: dónde te postulaste, en qué etapa estás y qué tenés que hacer después. Una interfaz oscura con fondo estelar y navegación pensada para el celular acompaña lo esencial: mantener tu búsqueda organizada.

### Todo a mano

| | Qué podés hacer |
| :--- | :--- |
| **✦ Postulaciones** | Registrar empresa, puesto, modalidad, salario, contacto y notas; buscar por empresa o puesto y filtrar procesos por etapa. |
| **◷ Entrevistas** | Organizar fechas, horarios, duración, entrevistadores y enlaces de reunión; guardar notas y feedback. |
| **✓ Recordatorios** | Preparar entrevistas, seguir respuestas y entregas, agregar tareas propias y marcar pendientes como completados. |
| **✉ Plantillas** | Preparar mensajes de agradecimiento y seguimiento con los datos de cada postulación. |
| **☁ Sincronización** | Conectar una cuenta de Google y continuar desde otros dispositivos mediante Firebase. |

Cada postulación puede pasar por **borrador**, **postulada**, **en revisión**, **en entrevista**, **prueba técnica**, **oferta recibida**, **aceptada**, **rechazada** o **retirada**.

## Empezar en local

Necesitás **Node.js 22** —la versión que usa el workflow del proyecto— y **npm**.

```bash
npm ci
npm run dev
```

Abrí [localhost:3000](http://localhost:3000). La aplicación incluye postulaciones de ejemplo al iniciar por primera vez y permite guardar tus registros en el navegador sin iniciar sesión.

| Comando | Para qué sirve |
| :--- | :--- |
| `npm run dev` | Inicia el servidor de desarrollo en el puerto 3000. |
| `npm run lint` | Comprueba los tipos con TypeScript (`tsc --noEmit`). |
| `npm run build` | Genera la aplicación para producción en `dist/`. |
| `npm run preview` | Sirve el build generado para revisarlo localmente. |

## Tus datos, de un dispositivo a otro

**Sin iniciar sesión**, las postulaciones se guardan en `localStorage`, dentro del navegador que estás usando.

**Al conectar Google**, la aplicación usa Firebase Authentication y Firestore para sincronizar las postulaciones de esa cuenta. Los registros locales permanecen separados: **Importar a mi cuenta** incorpora los que faltan sin reemplazar registros sincronizados ni recuperar registros eliminados.

Los cambios se guardan primero en el dispositivo y quedan pendientes hasta que puedan enviarse. Las modificaciones en campos distintos se combinan automáticamente; si dos dispositivos cambian el mismo dato, la aplicación pide elegir una versión.

> Esperá a ver **Sincronizado** antes de cerrar el navegador. No borres los datos del navegador mientras haya cambios pendientes.

Para habilitar el acceso con Google, autorizar dominios y publicar las reglas de acceso, seguí la [guía de Firebase](./FIREBASE_SETUP.md).

### Usar otro proyecto de Firebase

La configuración web predeterminada está en [`src/sync/config.ts`](./src/sync/config.ts). Podés reemplazarla creando un archivo `.env.local` en la raíz:

```dotenv
VITE_FIREBASE_CONFIG='{"apiKey":"TU_API_KEY","authDomain":"TU_PROYECTO.firebaseapp.com","projectId":"TU_PROYECTO","appId":"TU_APP_ID"}'
```

Reiniciá el servidor después de modificarla. Esta configuración es pública: el acceso a los datos depende de Authentication y de [`firestore.rules`](./firestore.rules). Las credenciales de cuentas de servicio y las claves privadas deben quedar fuera del frontend.

## Bajo el capó

**React 19 + TypeScript** para la interfaz, **Vite 8** para desarrollo y build, **Tailwind CSS 4** para estilos, **Lucide** para iconos y **Firebase** para autenticación y sincronización.

```text
src/
├── components/      Interfaz, formularios y vistas principales
├── data/            Postulaciones de ejemplo y plantillas de correo
├── hooks/           Estado de las postulaciones y coordinación de sincronización
├── sync/            Cliente Firebase, cambios pendientes, validación y conflictos
├── types/           Modelo de postulaciones, entrevistas y recordatorios
├── utils/           Fechas, estados y almacenamiento local
├── App.tsx          Composición de la aplicación
└── index.css        Estilos globales
```

## Publicación

El workflow de [GitHub Actions](./.github/workflows) instala las dependencias, genera el build y lo publica en **GitHub Pages** con cada push a `main`; también permite ejecutarlo manualmente.

Durante ese build, Vite usa la ruta base `/Orbita_Jobs/`. En desarrollo y builds fuera de GitHub Actions usa `/`. La variable de repositorio `FIREBASE_CONFIG` permite reemplazar la configuración de Firebase en el despliegue.

---

<div align="center">

**Una postulación a la vez. Un paso más cerca.**

</div>
