import fs from 'node:fs';
import path from 'node:path';

export function findSofficeExecutable(
  platform = process.platform,
  env = process.env,
  isExecutable = (file: string) => {
    try {
      if (!fs.statSync(file).isFile()) return false;
      fs.accessSync(file, platform === 'win32' ? fs.constants.F_OK : fs.constants.X_OK);
      return true;
    } catch { return false; }
  },
): string | undefined {
  const paths = platform === 'win32' ? path.win32 : path.posix;
  const names = platform === 'win32' ? ['soffice.exe', 'libreoffice.exe'] : ['soffice', 'libreoffice'];
  const candidates = [
    env.LIBREOFFICE_PATH,
    ...(env.PATH || '').split(paths.delimiter).filter(Boolean)
      .flatMap(directory => names.map(name => paths.join(directory.replace(/^"|"$/g, ''), name))),
    ...(platform === 'win32' ? [
      paths.join(env.ProgramFiles || 'C:\\Program Files', 'LibreOffice', 'program', 'soffice.exe'),
      paths.join(env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'LibreOffice', 'program', 'soffice.exe'),
    ] : platform === 'darwin' ? ['/Applications/LibreOffice.app/Contents/MacOS/soffice'] : [
      '/usr/bin/soffice', '/usr/bin/libreoffice', '/snap/bin/libreoffice',
    ]),
  ];
  return candidates.find(candidate => candidate && isExecutable(candidate));
}
