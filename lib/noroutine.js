"use strict";

const WorkersPool = require("../lib/WorkersPool.js");
const { buildApi, kPool } = require("./utils.js");

const register = async options => {
  const pool = await new WorkersPool(options);
  return buildApi(options.modules, pool);
};

const finalize = async (api, ms) => void await api[kPool].close(ms);

module.exports = {
  register,
  finalize,
};
