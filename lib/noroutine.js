"use strict";

const WorkersPool = require("../lib/WorkersPool.js");
const buildApi = require("./buildApi.js");

const register = ({ modules, concurrency } = {}) =>
  buildApi(modules, new WorkersPool({ modules, concurrency }));

const finalize = api => api.pool.close();

module.exports = {
  register,
  finalize,
};
