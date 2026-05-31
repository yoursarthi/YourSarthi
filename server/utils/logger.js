'use strict';

const { isProduction } = require('../config');

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const CURRENT = isProduction ? LEVELS.info : LEVELS.debug;

const pad = (n) => String(n).padStart(2, '0');

function ts() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function log(level, label, ...args) {
  if (LEVELS[level] > CURRENT) return;
  const prefix = `[${ts()}] [${level.toUpperCase()}] [${label}]`;
  if (level === 'error') console.error(prefix, ...args);
  else if (level === 'warn') console.warn(prefix, ...args);
  else console.log(prefix, ...args);
}

function createLogger(label) {
  return {
    info:  (...a) => log('info',  label, ...a),
    warn:  (...a) => log('warn',  label, ...a),
    error: (...a) => log('error', label, ...a),
    debug: (...a) => log('debug', label, ...a),
  };
}

module.exports = { createLogger };
