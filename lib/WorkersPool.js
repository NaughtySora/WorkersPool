"use strict";

const { Worker } = require("node:worker_threads");
const { resolve } = require("node:path");
const { SLL } = require("./SLL.js");
const { once } = require("node:events");

const modulePath = module => {
  for (const file of Object.keys(require.cache)) {
    const cached = require.cache[file];
    if (cached.exports === module) return file;
  }
};

const WORKER_PATH = resolve(__dirname, "./worker.js");

const STATUSES = [
  'init',
  'running',
  'stopping',
  'stopped',
];

// should i add async resource to this?

const backoff = () => {};

class WorkersPool {
  #workers = new Map();
  #free = [];
  #queue = new SLL();
  #status = 0;

  constructor({ modules, concurrency } = {}) {
    return this.#init(concurrency, modules);
  }

  async #init(concurrency, modules) {
    const workerData = Object.entries(modules)
      .map(module => [module[0], modulePath(module[1])]);
    const promises = [];
    for (let i = 0; i < concurrency; i++) {
      promises.push(this.#create(workerData));
    }
    await Promise.all(promises);
    this.#status = 1;
    return this;
  }

  async #create(workerData) {
    const worker = new Worker(WORKER_PATH, { workerData, });
    // backoff ?
    worker.on("error", err => {
      console.error(err);
      // this.#create
    });
    await once(worker, "online");
    const id = worker.threadId;
    this.#workers.set(id, worker);
    this.#free.push(id);
  }

  #next() {
    const queue = this.#queue;
    if (this.#free.length === 0 || queue.length === 0) return;
    const task = queue.shift();
    this.#process(task);
  }

  #process({ data, resolve, reject }) {
    const id = this.#free.shift();
    const worker = this.#workers.get(id);
    worker.once("message", ({ result, error }) => {
      error ? reject(error) : resolve(result);
      this.#free.push(id);
      process.nextTick(() => this.#next());
    });
    worker.postMessage(data);
  }

  async close() {
    if (this.#status >= 2) return;
    this.#status = 2;
    this.#free.length = 0;
    this.#queue.length = 0; // need to wait, timeout?
    const workers = this.#workers;
    const finalization = [];
    for (const worker of workers.values()) {
      finalization.push(worker.terminate());
    }
    await Promise.all(finalization);
    workers.clear();
    this.#status = 3;
  }

  execute(name, method, ...args) {
    return new Promise((resolve, reject) => {
      if (this.#status !== 1) return void resolve();
      const task = { data: { name, method, args }, resolve, reject };
      if (this.#free.length === 0) return void this.#queue.push(task);
      this.#process(task);
    });
  }

  // stop(workerId) id from stats?

  get size() {
    return this.#workers.size;
  }

  get status() {
    return STATUSES[this.#status];
  }

  get free() {
    return this.#free.length;
  }

  async stats() {
    const result = {};
    for (const worker of this.#workers.values()) {
      result[worker.threadId] = {
        cpu: await worker.cpuUsage(),
        elu: performance.eventLoopUtilization(),
      };
    }
    return result;
  }
}

module.exports = WorkersPool;
