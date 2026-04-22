"use strict";

const WorkersPool = require("../lib/WorkersPool.js");
const api = require("./mock/api.js");
const crypto = require("./mock/crypto.js");
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { async } = require("naughty-util");

describe("WorkersPool", async () => {
  await it("", async () => {
    try {
      const modules = { api, crypto };
      const CONCURRENCY = 5;
      const pool = await new WorkersPool({ modules, concurrency: CONCURRENCY });
      process.on("SIGINT", async () => {
        await pool.close();
        process.exit(0);
      });
      console.log(await pool.stats());
    } catch (e) {
      console.error(e);
    }


    // setTimeout(() => void pool.close(), 1000);
    // pool.execute("crypto", "getUUID").then(
    //   console.log,
    //   console.error
    // );
    // pool.execute("api", "some", { some: "value1" }).then(
    //   console.log,
    //   console.error
    // );
  });
});
