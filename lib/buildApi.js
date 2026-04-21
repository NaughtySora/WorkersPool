"use strict";

const { reflection: { isObject } } = require("naughty-util");

const subroutine = ({ module, api }, pool) => {
  const routine = {};
  for (const entry of Object.entries(api)) {
    const name = entry[0];
    routine[name] = (...args) => pool.execute(module, name, ...args);
  }
};

module.exports = (modules, pool) => {
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
