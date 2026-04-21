"use strict";

const WorkersPool = require("../lib/WorkersPool.js");
const api = require("./mock/api.js");
const crypto = require("./mock/crypto.js");
const { describe, it } = require("node:test");
const assert = require("node:assert/string");

describe("WorkersPool", () => {
  it("", () => {
    const modules = { api, crypto };
    const CONCURRENCY = 5;
    const pool = new WorkersPool({ modules, concurrency: CONCURRENCY });
    
    setTimeout(() => void pool.close(), 150);
    pool.execute("crypto", "getUUID").then(
      console.log,
      console.error
    );
    pool.execute("api", "some", { some: "value1" }).then(
      console.log,
      console.error
    );
  });
});
