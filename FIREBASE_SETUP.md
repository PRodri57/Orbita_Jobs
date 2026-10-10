# Activar la sincronización de Orbita Jobs

Proyecto: **orbita-jobs**, cuenta **bashdeep2@gmail.com**, plan **Spark**.
La aplicación web ya está registrada. No hace falta activar Hosting ni facturación.

## 1. Acceso con Google

En [Authentication](https://console.firebase.google.com/project/orbita-jobs/authentication),
presioná **Get started** y habilitá **Google** en **Sign-in method**.
Nombre público: **Orbita Jobs**. Correo de soporte: el de tu cuenta.

En **Settings → Authorized domains**, agregá **prodri57.github.io**.
El dominio se escribe sin `https://` y sin `/Orbita_Jobs/`.

## 2. Base de datos privada

En [Firestore](https://console.firebase.google.com/project/orbita-jobs/firestore),
creá una base **Standard**, ID **(default)**, ubicación **southamerica-east1 (São Paulo)**,
en **Production mode**. La ubicación queda fija después de crearla.

En **Rules**, reemplazá el contenido por el archivo [firestore.rules](./firestore.rules)
y presioná **Publish**. Las reglas permiten leer y escribir solamente las
postulaciones de la cuenta autenticada. No uses reglas que permitan acceso a cualquiera.

También podés publicarlas con la CLI oficial, después de iniciar sesión vos:

```powershell
npx firebase-tools@15.33.0 login
npx firebase-tools@15.33.0 deploy --only firestore:rules --project orbita-jobs
```

## 3. Uso

Abrí https://prodri57.github.io/Orbita_Jobs/ y presioná **Conectar Google**.
Usá la misma cuenta en los demás dispositivos.

Las postulaciones locales se conservan separadas. **Importar a mi cuenta**
incorpora las que faltan sin reemplazar registros sincronizados ni recuperar registros eliminados.

Los cambios se guardan primero en este navegador y se envían al volver a tener
conexión. Esperá a que aparezca **Sincronizado** antes de cerrar el navegador.
Si ambos dispositivos modifican el mismo dato, la aplicación pide elegir una versión.
Los cambios en campos distintos se combinan automáticamente.

No borres los datos del navegador mientras haya cambios pendientes.
Cerrar sesión conserva los cambios pendientes para la misma cuenta.

## Desarrollo

```powershell
npm ci
npm run dev
npm run build
```

La configuración web de Firebase en `src/sync/config.ts` es pública;
la privacidad depende de Authentication y de las reglas de Firestore.
`VITE_FIREBASE_CONFIG` permite reemplazarla con JSON para otro entorno.
