"use strict";

// const tests = ["pool", "noroutine"];
const tests = ["pool"];

for (const test of tests) require(`./${test}.js`);
