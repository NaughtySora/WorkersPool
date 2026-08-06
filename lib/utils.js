"use strict";

const { async: { pause },
  reflection: { isObject },
} = require("naughty-util");

const backoff = times => times * 2 * 1000;

const modulePath = module => {
  for (const file of Object.keys(require.cache)) {
    const cached = require.cache[file];
    if (cached.exports === module) return file;
  }
};

const subroutine = ({ name, api, pool, }) => {
  const routine = {};
  for (const entry of Object.entries(api)) {
    const key = entry[0];
    routine[key] = async (...args) => await pool.execute(name, key, ...args);
  }
  return routine;
};

const kPool = Symbol();

const buildApi = (modules, pool) => {
  const iface = {};
  for (const entry of Object.entries(modules)) {
    const api = entry[1];
    if (!isObject(api)) {
      throw new TypeError("Object is expected");
    }
    const name = entry[0];
    iface[name] = subroutine({ name, api, pool });
  }
  iface[kPool] = pool;
  return iface;
};

module.exports = {
  kPool, buildApi, backoff,
  modulePath
};
