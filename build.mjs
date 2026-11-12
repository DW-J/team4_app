import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('public/assets', { recursive: true });
for (const name of ['index.html', 'styles.css', 'app.js']) await copyFile(name, `public/${name}`);
for (const name of ['guardian-gold.png', 'guardian-white.png', 'clouds.png']) await copyFile(`assets/${name}`, `public/assets/${name}`);
