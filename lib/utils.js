'use strict';

const { async: { pause },
  reflection: { isObject },
} = require("naughty-util");

const reject = async (ms, error) => {
  await pause(ms);
  throw (error ?? new Error('Promise reject timeout'));
};

const backoff = times => times * 2 * 1000;

const modulePath = module => {
  for (const file of Object.keys(require.cache)) {
    const cached = require.cache[file];
    if (cached.exports === module) return file;
  }
};

const subroutine = ({ module, api }, pool) => {
  const routine = {};
  for (const entry of Object.entries(api)) {
    const name = entry[0];
    routine[name] = (...args) => pool.execute(module, name, ...args);
  }
};

const buildApi = (modules, pool) => {
  const iface = {};
  for (const entry of Object.entries(modules)) {
    const api = entry[1];
    if (!isObject(api)) {
      throw new TypeError("Module should return an object api");
    }
    const module = entry[0];
    const subroutine = entry[1];
    iface[name] = subroutine({ module, api }, pool);
  }
  return iface;
};


module.exports = { buildApi, backoff, modulePath, reject };