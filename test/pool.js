"use strict";

const WorkersPool = require("../lib/WorkersPool.js");
const api = require("./mock/api.js");
const crypto = require("./mock/crypto.js");
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { async } = require("naughty-util");
const { once } = require("node:events");

describe('WorkersPool', async () => {
  await it('simple', async () => {
    const modules = { api, crypto };
    const CONCURRENCY = 2;
    const pool = await new WorkersPool({
      modules,
      concurrency: CONCURRENCY,
    });
    const result = [];
    let i = 0;
    const COUNT = 10;
    while (i++ !== COUNT) {
      pool.execute("api", "some", { some: "value" })
        .then(data => void result.push(data));
    }
    await once(pool, 'drain');
    await pool.close();
    assert.deepEqual(result, Array.from(
      { length: COUNT },
      () => ({ some: 'value' })
    ));
  });
});