// Arranca el build de producción con `serve` en vez de `vite preview` —
// Vite mismo advierte que `vite preview` no está pensado para producción
// (sin compresión configurable por header, sin caché por tipo de archivo,
// pensado solo para revisar un build localmente antes de publicarlo).
// Escrito en Node puro (no depende de sintaxis de un shell en particular)
// para que leer PORT (la variable que pone Railway/la mayoría de hostings)
// funcione igual en Windows, Linux o macOS.
import { spawn } from 'node:child_process';

const port = process.env.PORT || '4173';
// Todos los valores son fijos o vienen del propio hosting (PORT), nunca de
// un usuario — se arma como un único string (no un array de args) porque
// combinar shell:true con un array de argumentos es justo lo que Node
// advierte como riesgoso (no escapa cada argumento por separado).
const command = `npx serve -s dist -l tcp://0.0.0.0:${port}`;

const child = spawn(command, { stdio: 'inherit', shell: true });

child.on('exit', (code) => process.exit(code ?? 0));
