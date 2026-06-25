# Dreams - Landing y contabilidad

Esta carpeta contiene la version HTML5 editable de la landing principal de Dreams y el modulo interno de contabilidad protegido con Supabase Auth.

## Estructura

- `index.html`: landing principal.
- `contabilidad.html`: vision general del sistema contable.
- `ventas.html`: registro de ventas, cliente, producto, IVA y respaldo PDF.
- `gastos.html`: registro de egresos.
- `clientes.html`: base de clientes.
- `productos.html`: catalogo de productos y servicios.
- `balance.html`: reportes, graficos e historico.
- `assets/css/styles.css`: estilos de la landing.
- `assets/css/accounting.css`: estilos del sistema de contabilidad.
- `assets/js/main.js`: interaccion de la landing y acceso privado por Supabase.
- `assets/js/accounting.js`: logica local de contabilidad.

## Acceso a contabilidad

El boton `Ingresar a contabilidad` abre un modal de acceso privado.

- Solo usuarios creados o invitados desde Supabase pueden ingresar.
- La opcion `Solicitar acceso` abre un correo dirigido al administrador para pedir una invitacion.
- La opcion `Recuperar` envia el correo de recuperacion de contrasena desde Supabase.

## Configuracion Supabase

1. Crear un proyecto en Supabase.
2. En Supabase, abrir SQL Editor y ejecutar `supabase/schema.sql`.
3. En `assets/js/supabase-config.js`, pegar:

```js
window.DREAMS_SUPABASE_CONFIG = {
    url: 'https://TU-PROYECTO.supabase.co',
    anonKey: 'TU-ANON-KEY'
};
```

4. En Authentication > URL Configuration, agregar el dominio publicado del sitio.
5. Desactivar registros publicos en Authentication > Sign In / Providers.
6. Crear o invitar usuarios desde Authentication > Users.

La tabla `accounting_records` permite que usuarios autenticados compartan la misma instancia de contabilidad. Cada venta, gasto, cliente y producto se guarda como registro sincronizado.

## Uso local

Desde esta carpeta:

```bash
python3 -m http.server 8775
```

Abrir:

```text
http://127.0.0.1:8775/index.html
```

## Reglas de preservacion

- Mantener la identidad visual de la landing principal.
- Mantener la linea visual naranja/blanco del sistema de contabilidad.
- Mantener las fuentes: DM Sans para cuerpo/navegacion/botones y Playfair Display para titulares/metricas/menu movil.
- Conservar el hero full-screen con video, overlay oscuro, titular centrado y textos verticales de scroll en desktop.
- Conservar los radios tipo pill, bordes finos, botones outline/ghost y hovers sutiles.
- Conservar las transiciones `0.3s`, reveal-on-scroll, `fadeInUp`, contadores animados y scroll suave.
- Conservar los breakpoints actuales: 1024px, 768px y 480px.
- No reconstruir desde cero: cualquier cambio futuro debe hacerse sobre esta base.
