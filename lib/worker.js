"use strict";

const { parentPort, workerData } = require("node:worker_threads");

const api = workerData.reduce((target, module) =>
  (target[module[0]] = require(module[1]), target), {});

parentPort.on("message", async message => {
  try {
    if (message.status === "close") {
      process.exit(0);
      return;
    }
    const { name, method, args } = message;
    const subroutine = api[name];
    const result = await subroutine[method](...args);
    parentPort.postMessage({ result, error: null });
  } catch (error) {
    parentPort.postMessage({ result: null, error });
  }
});
