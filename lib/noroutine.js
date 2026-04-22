"use strict";

const WorkersPool = require("../lib/WorkersPool.js");
const { buildApi } = require("./utils.js");

const register = async ({ modules, concurrency } = {}) =>
  buildApi(modules, await new WorkersPool({ modules, concurrency }));

const finalize = async api => api.pool.close();

module.exports = {
  register,
  finalize,
};
