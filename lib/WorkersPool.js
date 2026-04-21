"use strict";

const { Worker } = require("node:worker_threads");
const { resolve } = require("node:path");

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

class WorkersPool {
  #workers = new Map();
  #free = [];
  #queue = [];
  #status = 0;

  constructor({ modules, concurrency } = {}) {
    this.#init(concurrency, modules);
  }

  #init(concurrency, modules) {
    const workerData = Object.entries(modules)
      .map(module => [module[0], modulePath(module[1])]);

    for (let i = 0; i < concurrency; i++) {
      const worker = new Worker(WORKER_PATH, { workerData });
      this.#register(worker);
    }
    this.#status = 1;
  }

  #register(worker) {
    const workers = this.#workers;
    const id = worker.threadId;
    workers.set(id, worker);
    this.#free.push(id);
  }

  #next() {
    const free = this.#free;
    const queue = this.#queue;
    if (free.length === 0 || queue.length === 0) return;
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
    this.#queue.length = 0;
    const workers = this.#workers;
    const finalization = [];
    for (const worker of workers.values()) {
      finalization.push(worker.terminate());
    }
    await Promise.allSettled(finalization);
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

  get size() {
    return this.#workers.size;
  }

  get status() {
    return STATUSES[this.#status];
  }
}

module.exports = WorkersPool;
