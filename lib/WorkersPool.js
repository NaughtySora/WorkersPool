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
// backoff

class WorkersPool {
  #workers = new Map();
  #free = new SLL();
  #queue = new SLL();
  #status = 0;
  #workerData = null;

  constructor({ modules, concurrency } = {}) {
    this.#workerData = Object.entries(modules)
      .map(module => [module[0], modulePath(module[1])]);
    return this.#init(concurrency, modules);
  }

  async #init(concurrency, modules) {
    const promises = [];
    for (let i = 0; i < concurrency; i++) {
      promises.push(this.#create());
    }
    await Promise.all(promises);
    this.#status = 1;
    return this;
  }

  async #create() {
    const workerData = this.#workerData;
    const worker = new Worker(WORKER_PATH, { workerData, });
    worker.on("error", err => {
      console.error(err);
    });
    await once(worker, "online");
    const id = worker.threadId;
    this.#workers.set(id, worker);
    this.#free.push(worker);
  }

  async close() {
    if (this.#status >= 2) return;
    this.#status = 2;
    const finalization = [];
    for (const id of workers.keys()) {
      finalization.push(this.#stop(id));
    }
    await Promise.all(finalization);
    this.#status = 3;
  }

  async #stop(workerId) {
    const worker = this.#workers.get(workerId);
    if (worker === undefined) return false;
    this.#free.delete(worker);
    worker.postMessage({ status: 'close' });
    await once(worker, "exit");
    this.#workers.delete(workerId);
    return true;
  }

  async restart(workerId) {
    if (!(await this.#stop(workerId))) return;
    await this.#create();
  }

  #next() {
    if (this.#free.length === 0 || this.#queue.length === 0) return;
    this.#process(this.queue.shift());
  }

  #process({ data, resolve, reject }) {
    const worker = this.#free.shift();
    worker.once("message", ({ result, error }) => {
      error ? reject(error) : resolve(result);
      this.#free.push(worker);
      process.nextTick(() => this.#next());
    });
    worker.postMessage(data);
  }

  execute(name, method, ...args) {
    return new Promise((resolve, reject) => {
      if (this.#status !== 1) return void reject(
        new Error("WorkerPool is not running")
      );
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

  get free() {
    return this.#free.length;
  }

  async stats() {
    const result = {};
    const promises = [];
    const assign = async (worker) => {
      result[worker.threadId] = {
        cpu: await worker.cpuUsage(),
        elu: performance.eventLoopUtilization(),
      };
    }
    for (const worker of this.#workers.values()) {
      promises.push(assign(worker));
    }
    await Promise.all(promises);
    return result;
  }
}

module.exports = WorkersPool;
