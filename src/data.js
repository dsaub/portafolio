// Contenido del portfolio, sacado de https://github.com/dsaub

export const profile = {
  name: 'Daniel',
  alias: 'elordenador',
  github: 'https://github.com/dsaub',
  avatar: 'https://avatars.githubusercontent.com/u/54474838?v=4',
  bio: '¡Amante de las computadoras y videojuegos!',
  role: 'Desarrollador web y backend',
  languages: ['Python', 'Go', 'TypeScript', 'Java'],
};

export const projects = [
  {
    id: 'poketeam',
    name: 'PokeTeamCalculator',
    tagline: 'Simulador de combates contra líderes de gimnasio',
    description:
      'Monorepo con interfaz en React + Vite, una API en Go + Gin que sirve el catálogo y encola simulaciones en Redis, y un worker en Bun que resuelve los combates con Pokémon Showdown. Los datos viven en MariaDB.',
    tags: ['TypeScript', 'React', 'Go', 'Gin', 'Bun', 'Redis', 'MariaDB', 'Docker'],
    repo: 'https://github.com/dsaub/PokeTeamCalculator',
    color: 0xe84a4a,
    icon: 'ball',
  },
  {
    id: 'pokedata',
    name: 'pokedata',
    tagline: 'Generador de bases de datos Pokémon en Go',
    description:
      'Binario Go estático (sin cgo) que descarga las fuentes y genera una base SQLite o MySQL/MariaDB con todos los Pokémon y los equipos de los líderes de gimnasio de todas las generaciones. También puede volcar el script .sql equivalente.',
    tags: ['Go', 'SQLite', 'MySQL', 'MariaDB', 'CLI'],
    repo: 'https://github.com/dsaub/pokedata',
    color: 0x00add8,
    icon: 'db',
  },
  {
    id: 'clonetube',
    name: 'Clonetube',
    tagline: 'Clon de YouTube con Vue 3 + Spring Boot',
    description:
      'Subida de vídeos por multipart upload a Amazon S3, workers en Python con SQS y FFmpeg para transcodificar, nginx con HTTPS y despliegue con Docker Compose y GitHub Actions.',
    tags: ['Vue 3', 'TypeScript', 'Spring Boot', 'Java', 'Python', 'AWS S3', 'SQS', 'FFmpeg'],
    repo: 'https://github.com/dsaub/clonetube',
    color: 0xff3b3b,
    icon: 'play',
  },
  {
    id: 'comercialmeria',
    name: 'Comercialmería',
    tagline: 'Marketplace para la provincia de Almería · TFG 2º DAW',
    description:
      'Catálogo con búsqueda AJAX, carrito persistente con reserva de stock, pagos con Stripe y PayPal, panel de vendedor con mensajería, recibos en PDF, valoraciones y API REST. Tareas asíncronas con Celery.',
    tags: ['Python', 'Django', 'PostgreSQL', 'Redis', 'Celery', 'Stripe', 'PayPal', 'Bootstrap', 'Docker'],
    repo: 'https://github.com/dsaub/tfg-2daw',
    color: 0xffa62b,
    icon: 'bag',
  },
  {
    id: 'mlib',
    name: 'mlib',
    tagline: 'Shared library de Jenkins',
    description:
      'Los pasos comunes de mis pipelines: imágenes multiarquitectura sin emulación, push a GHCR, Hadolint, limpieza de Docker, sandboxes de Daytona… Incluye un plugin para Claude Code con la documentación de cada paso.',
    tags: ['Jenkins', 'Docker', 'CI/CD', 'GHCR'],
    repo: 'https://github.com/dsaub/jenkins-shared-library',
    color: 0xd24939,
    icon: 'gear',
  },
  {
    id: 'redsocial',
    name: 'redsocial',
    tagline: 'Prototipo de red social',
    description:
      'Backend en Python y frontend en Vue + TypeScript, con entorno reproducible en Nix e infraestructura como código en HCL (Terraform).',
    tags: ['Python', 'Vue', 'TypeScript', 'Nix', 'Terraform'],
    repo: 'https://github.com/dsaub/redsocial',
    color: 0x2ec4b6,
    icon: 'network',
  },
];

// Cubos de tecnologías que se pueden patear por la plaza
export const skills = [
  { name: 'Python', bg: '#3776ab', fg: '#ffd43b' },
  { name: 'Go', bg: '#00add8', fg: '#ffffff' },
  { name: 'TypeScript', bg: '#3178c6', fg: '#ffffff' },
  { name: 'Java', bg: '#e76f00', fg: '#ffffff' },
  { name: 'Vue', bg: '#42b883', fg: '#213547' },
  { name: 'React', bg: '#20232a', fg: '#61dafb' },
  { name: 'Django', bg: '#0c4b33', fg: '#ffffff' },
  { name: 'FastAPI', bg: '#009688', fg: '#ffffff' },
  { name: 'Spring', bg: '#6db33f', fg: '#ffffff' },
  { name: 'Docker', bg: '#2496ed', fg: '#ffffff' },
  { name: 'Jenkins', bg: '#d24939', fg: '#ffffff' },
  { name: 'Redis', bg: '#dc382d', fg: '#ffffff' },
  { name: 'Postgres', bg: '#336791', fg: '#ffffff' },
  { name: 'Nix', bg: '#5277c3', fg: '#ffffff' },
];
