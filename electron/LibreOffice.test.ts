import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findSofficeExecutable } from './LibreOffice';

test('Linux resolves libreoffice when soffice is absent from PATH', () => {
  assert.equal(findSofficeExecutable('linux', { PATH: '/custom/bin:/usr/bin' },
    file => file === '/usr/bin/libreoffice'), '/usr/bin/libreoffice');
});

test('explicit executable takes precedence, including paths with spaces', () => {
  assert.equal(findSofficeExecutable('linux', { LIBREOFFICE_PATH: '/opt/Libre Office/soffice', PATH: '/usr/bin' },
    () => true), '/opt/Libre Office/soffice');
});

test('missing LibreOffice returns undefined instead of an unverified command', () => {
  assert.equal(findSofficeExecutable('linux', { PATH: '/usr/bin' }, () => false), undefined);
});

test('Windows searches standard installation when absent from PATH', () => {
  const executable = 'C:\\Program Files\\LibreOffice\\program\\soffice.exe';
  assert.equal(findSofficeExecutable('win32', { PATH: 'C:\\Windows;C:\\Tools' },
    file => file === executable), executable);
});
