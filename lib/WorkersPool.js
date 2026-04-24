"use strict";

const { async } = require("naughty-util");
const { once, EventEmitter } = require("node:events");
const { Worker } = require("node:worker_threads");
const { resolve } = require("node:path");
const { nextTick } = require("node:process");
const { SLL } = require("./SLL.js");
const { backoff, modulePath, reject } = require("./utils.js");

const WORKER_PATH = resolve(__dirname, "./worker.js");
const STATUSES = ['init', 'running', 'stopping', 'stopped'];

class WorkerError extends Error {
  time = new Date().toISOString();
  workerId;
  restartIn;
  totalWorkers;

  constructor(message, options) {
    super(message, { cause: options?.cause });
    this.stack = Error.captureStackTrace();
    this.workerId = options?.workerId;
    this.totalWorkers = options?.totalWorkers;
    this.restartIn = options?.restartIn;
  }
}

class WorkersPool extends EventEmitter {
  #workers = new Map();
  #free = new SLL();
  #queue = new SLL();
  #status = 0;
  #workerData = null;
  #maxQueue;

  constructor({ modules, concurrency, maxQueue = 256 } = {}) {
    super();
    this.#workerData = Object.entries(modules)
      .map(module => [module[0], modulePath(module[1])]);
    this.maxQueue = maxQueue;
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

  async #create(retry = 0) {
    if (this.#status >= 2) return;
    const workerData = this.#workerData;
    const worker = new Worker(WORKER_PATH, { workerData, });
    const id = worker.threadId;
    worker.on('error', async cause => {
      const restartIn = backoff(retry);
      this.emit('worker-error', new WorkerError(
        'Worker error', {
        cause, restartIn, workerId: id,
        totalWorkers: this.size,
      },));
      await async.pause(restartIn);
      await this.#create(retry + 1);
      await this.#stop(id);
    });
    await once(worker, "online");
    this.emit('worker-start', id);
    const payload = { self: worker, live: true };
    this.#workers.set(id, payload);
    this.#free.push(payload);
  }

  async #stop(workerId) {
    const worker = this.#workers.get(workerId);
    if (worker === undefined) return false;
    worker.live = false;
    worker.self.postMessage({ status: 'close' });
    await once(worker.self, "exit");
    this.#workers.delete(workerId);
    this.emit('worker-stop', workerId);
    return true;
  }

  async close(ms = 10000) {
    if (this.#status >= 2) return;
    this.#status = 2;
    const finalization = [];
    if (this.inQueue > 0) {
      await Promise.race([once(this, 'drain'), reject(ms)])
    }
    for (const id of this.#workers.keys()) {
      finalization.push(this.#stop(id));
    }
    await Promise.all(finalization);
    this.#free.clear();
    this.#status = 3;
  }

  async restart(workerId) {
    if (!(await this.#stop(workerId))) return;
    await this.#create();
  }

  #next() {
    if (this.#queue.length === 0) {
      return void this.emit('drain');
    }
    if (this.#free.length === 0) return;
    this.#process(this.#queue.shift());
  }

  #process(task) {
    const worker = this.#free.shift();
    if (!worker.live) return this.#process(task);
    const { data, resolve, reject } = task;
    worker.self.once("message", ({ result, error }) => {
      error ? reject(error) : resolve(result);
      this.#free.push(worker);
      nextTick(() => this.#next());
    });
    worker.self.postMessage(data);
  }

  execute(name, method, ...args) {
    return new Promise((resolve, reject) => {
      if (this.#status !== 1) return void reject(
        new Error("WorkersPool is not running")
      );
      if (this.size === 0) {
        reject(new Error("WorkersPool has no workers"));
      }
      const task = { data: { name, method, args }, resolve, reject };
      if (this.#free.length === 0) {
        if (this.#queue.length >= this.#maxQueue) {
          reject(new Error("WorkersPool queue is full"));
        }
        return void this.#queue.push(task);
      }
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

  get inQueue() {
    return this.#queue.length;
  }

  async stats() {
    if (this.#status >= 2) return [];
    const stats = [];
    const promises = [];
    const stat = async worker => {
      stats.push({
        cpu: await worker.cpuUsage(),
        elu: worker.performance.eventLoopUtilization(),
        id: worker.threadId,
      });
    }
    for (const worker of this.#workers.values()) {
      promises.push(stat(worker));
    }
    await Promise.all(promises);
    return stats;
  }
}

module.exports = WorkersPool;
