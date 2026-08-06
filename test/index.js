"use strict";

/**
 * @todo
 * - add max retries logic
 * - more tests
 */

const tests = ["pool", "noroutine"];

for (const test of tests) require(`./${test}.js`);
