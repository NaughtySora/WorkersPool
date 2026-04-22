"use strict";

const WorkersPool = require("../lib/WorkersPool.js");
const api = require("./mock/api.js");
const crypto = require("./mock/crypto.js");
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { async } = require("naughty-util");

(async () => {
  const modules = { api, crypto };
  const CONCURRENCY = 3;
  const pool = await new WorkersPool({ modules, concurrency: CONCURRENCY });
  let i = 0;
  while (i++ !== 20) {
    pool.execute("api", "some", { some: "value1" })
      .then(console.log);
  }
  process.on("SIGINT", async () => {
    await pool.close();
    process.exit(0);
  });
})();