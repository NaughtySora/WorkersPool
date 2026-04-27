import EventEmitter from "node:events";

interface Stat {
  cpu: NodeJS.CpuUsage,
  elu: number;
  id: number;
}

type AsyncCallback = (...args: any) => Promise<any>;
type Callback = (...args: any) => any;

type Modules<Returned = (Callback | AsyncCallback)> =
  Record<string, Record<string, Returned>>;

interface PoolOptions<Modules> {
  modules: Modules;
  concurrency: number;
  maxQueue?: number;
}

type ToAsync<F> =
  F extends (...args: infer A) => infer R
  ? (...args: A) => Promise<Awaited<R>>
  : never;

type AsyncModules<M> = {
  [K in keyof M]: {
    [P in keyof M[K]]: ToAsync<M[K][P]>;
  };
};

export class WorkersPool<M extends Modules> extends EventEmitter {
  constructor(options: PoolOptions<M>);
  stats(): Promise<Array<Stat>>;
  execute<
    Name extends keyof M,
    Key extends keyof M[Name],
    Args extends Parameters<M[Name][Key]>,
  >(name: Name, key: Key, ...args: Args): Promise<any>;
  restart(workerId: number): Promise<void>;
  close(ms?: number): Promise<void>;
  size: number;
  status: 'init' | 'running' | 'stopping' | 'stopped';
  free: number;
  inQueue: number;
  isRunning: number;
}

interface Noroutine {
  register: <M extends Modules>(options: PoolOptions<M>) => Promise<AsyncModules<M>>;
  finalize: (
    api: Awaited<ReturnType<Noroutine["register"]>>,
    ms?: number,
  ) => Promise<void>,
}

export const noroutine: Noroutine;
