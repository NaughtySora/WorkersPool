"use strict";

const api = require("./mock/api.js");
const crypto = require("./mock/crypto.js");
const { finalize, register } = require("../lib/noroutine.js");
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { async } = require("naughty-util");
const { once } = require("node:events");

describe("noroutine", async () => {
  it("simple", async () => {
    const modules = { api, crypto };
    const noroutine = await register({ modules, concurrency: 3 });
    const float = await noroutine.api.getFloat();
    assert.ok(typeof float === "number");
    try {
      await noroutine.api.fail();
    } catch (e) {
      assert.match(e.message, /Api fail/);
    }
    await finalize(noroutine);
  });
});
