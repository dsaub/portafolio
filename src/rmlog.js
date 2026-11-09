// Simulación del recorrido de `rm -rf --no-preserve-root /` en un Linux cualquiera.
// Cada entrada: { path, kind: 'file' | 'dir' | 'link' | 'err', msg? }

const DENIED = 'Operación no permitida';
const BUSY = 'Dispositivo o recurso ocupado';

// Rutas relativas a cada directorio raíz; los subdirectorios se deducen solos
const TREE = [
  ['/bin', 'link'],
  ['/boot', ['vmlinuz-linux', 'initramfs-linux.img', 'initramfs-linux-fallback.img', 'intel-ucode.img', 'grub/grub.cfg', 'grub/grubenv', 'grub/fonts/unicode.pf2', 'grub/x86_64-efi/normal.mod', 'EFI/BOOT/BOOTX64.EFI']],
  ['/dev', ['null', 'zero', 'random', 'urandom', 'tty0', 'sda', 'sda1', 'sda2', 'nvme0n1', 'nvme0n1p1', 'input/event0', 'input/mice', 'dri/card0', 'snd/pcmC0D0p', 'shm/.keep']],
  ['/etc', ['hostname', 'hosts', 'passwd', 'shadow', 'group', 'gshadow', 'sudoers', 'fstab', 'os-release', 'resolv.conf', 'locale.conf', 'localtime', 'bash.bashrc', 'profile', 'environment', 'ssh/sshd_config', 'ssh/ssh_config', 'ssh/ssh_host_ed25519_key', 'pacman.conf', 'pacman.d/mirrorlist', 'systemd/system/default.target', 'systemd/system/multi-user.target.wants/sshd.service', 'systemd/system/multi-user.target.wants/docker.service', 'systemd/journald.conf', 'X11/xorg.conf.d/00-keyboard.conf', 'nginx/nginx.conf', 'nginx/sites-enabled/isla.conf', 'docker/daemon.json', 'fonts/fonts.conf', 'udev/rules.d/99-isla.rules']],
  ['/home', [
    'daniel/.bashrc', 'daniel/.bash_history', 'daniel/.zshrc', 'daniel/.gitconfig', 'daniel/.ssh/id_ed25519', 'daniel/.ssh/id_ed25519.pub', 'daniel/.ssh/known_hosts',
    'daniel/.config/nvim/init.lua', 'daniel/.config/nvim/lua/plugins.lua', 'daniel/.config/Code/User/settings.json', 'daniel/.config/hypr/hyprland.conf',
    'daniel/.local/share/Steam/steamapps/common/Portal 2/portal2.sh', 'daniel/.local/share/fonts/PixelifySans.ttf', 'daniel/.cache/mesa_shader_cache/index',
    'daniel/Descargas/factura_luz.pdf', 'daniel/Descargas/apuntes_redes.pdf', 'daniel/Imágenes/fondo_isla.png', 'daniel/Música/lofi_para_programar.mp3',
    '@PROYECTOS@',
  ]],
  ['/lib', 'link'],
  ['/lib64', 'link'],
  ['/mnt', ['usb/backup_TFG_final_FINAL_v3.zip']],
  ['/opt', ['google/chrome/chrome', 'google/chrome/libEGL.so', 'discord/Discord']],
  ['/proc', 'denied', ['1/mem', '1/environ', 'kcore', 'sys/kernel/random/boot_id', 'self/fd/0']],
  ['/root', ['.bash_history', '.ssh/authorized_keys', '.cache/pip/http/index']],
  ['/run', ['docker.sock', 'user/1000/bus', 'systemd/notify', 'lock/subsys']],
  ['/sbin', 'link'],
  ['/srv', ['http/index.html', 'http/assets/isla.js']],
  ['/sys', 'denied', ['firmware/efi/efivars/Boot0000-8be4df61', 'kernel/mm/hugepages', 'class/backlight/intel_backlight/brightness', 'fs/cgroup/cgroup.procs']],
  ['/tmp', ['.X11-unix/X0', '.ICE-unix/1337', 'vite-cache/deps/three.js', 'snake_highscore.tmp']],
  ['/usr', [
    'bin/bash', 'bin/sh', 'bin/zsh', 'bin/ls', 'bin/cat', 'bin/cp', 'bin/mv', 'bin/rm', 'bin/mkdir', 'bin/chmod', 'bin/chown', 'bin/grep', 'bin/sed', 'bin/awk', 'bin/find', 'bin/tar', 'bin/gzip',
    'bin/sudo', 'bin/su', 'bin/ssh', 'bin/scp', 'bin/curl', 'bin/wget', 'bin/git', 'bin/vim', 'bin/nano', 'bin/python3', 'bin/python3.12', 'bin/pip', 'bin/node', 'bin/npm', 'bin/npx', 'bin/go', 'bin/java',
    'bin/docker', 'bin/systemctl', 'bin/journalctl', 'bin/mount', 'bin/umount', 'bin/htop', 'bin/neofetch', 'bin/Xorg', 'bin/firefox', 'bin/code',
    'lib/libc.so.6', 'lib/ld-linux-x86-64.so.2', 'lib/libm.so.6', 'lib/libstdc++.so.6', 'lib/libssl.so.3', 'lib/libcrypto.so.3', 'lib/libz.so.1', 'lib/libGL.so.1', 'lib/libvulkan.so.1',
    'lib/libsystemd.so.0', 'lib/libpython3.12.so.1.0', 'lib/python3.12/os.py', 'lib/python3.12/json/__init__.py', 'lib/python3.12/site-packages/django/__init__.py',
    'lib/systemd/systemd', 'lib/systemd/system/sshd.service', 'lib/modules/6.11.4-arch1-1/kernel/drivers/gpu/drm/i915/i915.ko.zst', 'lib/firmware/i915/adlp_dmc.bin', 'lib/node_modules/npm/index.js', 'lib/jvm/java-21-openjdk/bin/java',
    'include/stdio.h', 'include/stdlib.h', 'include/linux/kernel.h',
    'share/fonts/TTF/DejaVuSans.ttf', 'share/fonts/noto/NotoColorEmoji.ttf', 'share/icons/hicolor/48x48/apps/firefox.png', 'share/icons/Adwaita/cursors/left_ptr',
    'share/man/man1/ls.1.gz', 'share/man/man1/rm.1.gz', 'share/locale/es/LC_MESSAGES/coreutils.mo', 'share/zoneinfo/Europe/Madrid', 'share/X11/xkb/symbols/es',
    'share/applications/firefox.desktop', 'share/backgrounds/isla.png', 'share/doc/bash/README', 'share/terminfo/x/xterm-256color',
  ]],
  ['/var', [
    'log/syslog', 'log/auth.log', 'log/pacman.log', 'log/Xorg.0.log', 'log/journal/9f2c1e/system.journal', 'log/nginx/access.log',
    'cache/pacman/pkg/linux-6.11.4.arch1-1-x86_64.pkg.tar.zst', 'cache/fontconfig/CACHEDIR.TAG',
    'lib/docker/overlay2/l/ISLA4D2', 'lib/docker/volumes/mariadb_data/_data/ibdata1', 'lib/postgresql/data/PG_VERSION', 'lib/redis/dump.rdb', 'lib/pacman/local/ALPM_DB_VERSION', 'lib/systemd/random-seed',
    'spool/cron/root', 'tmp/systemd-private-1337',
  ]],
];

function expand(root, files) {
  const out = [];
  const dirs = new Set();
  for (const f of files) {
    out.push({ path: `${root}/${f}`, kind: 'file' });
    const parts = f.split('/');
    for (let i = 1; i < parts.length; i++) dirs.add(`${root}/${parts.slice(0, i).join('/')}`);
  }
  // los directorios se borran de dentro hacia fuera
  [...dirs].sort((a, b) => b.split('/').length - a.split('/').length).forEach((d) => out.push({ path: d, kind: 'dir' }));
  out.push({ path: root, kind: 'dir' });
  return out;
}

export function* deletionStream(projects) {
  for (const [root, a, b] of TREE) {
    if (a === 'link') {
      yield { path: root, kind: 'link' };
    } else if (a === 'denied') {
      for (const f of b) yield { path: `${root}/${f}`, kind: 'err', msg: DENIED };
    } else {
      const files = a.flatMap((f) =>
        f === '@PROYECTOS@'
          ? projects.flatMap((p) => [`daniel/Proyectos/${p.id}/README.md`, `daniel/Proyectos/${p.id}/.git/HEAD`, `daniel/Proyectos/${p.id}/.git/objects/pack/pack-${p.id}.pack`])
          : [f]
      );
      yield* expand(root, files);
    }
  }
  // Y si la partida sigue, quedan miles de ficheros más
  const dirs = ['/usr/share/icons/hicolor/32x32/apps', '/usr/lib/x86_64-linux-gnu', '/usr/share/locale/fr/LC_MESSAGES', '/usr/share/man/man3', '/usr/include/c++/14', '/usr/lib/python3.12/site-packages/numpy/core', '/var/cache/pacman/pkg', '/usr/share/fonts/noto', '/usr/lib/node_modules/typescript/lib'];
  const stems = ['lib', 'core', 'util', 'gtk', 'qt6', 'x11', 'mesa', 'vk', 'pulse', 'glib', 'dbus', 'icu', 'png', 'jpeg', 'ffi', 'xml2'];
  const exts = ['.so', '.so.1', '.h', '.py', '.png', '.mo', '.gz', '.d.ts', '.ttf'];
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  for (;;) yield { path: `${pick(dirs)}/${pick(stems)}${pick(stems)}${Math.floor(Math.random() * 90)}${pick(exts)}`, kind: 'file' };
}

export const rmLine = ({ path, kind, msg }) =>
  kind === 'err'
    ? [`rm: no se puede borrar '${path}': ${msg}`, 'err']
    : [kind === 'dir' ? `eliminado el directorio '${path}'` : `eliminado '${path}'`, kind === 'dir' ? 'dim' : ''];

export const RM_BUSY = BUSY;
