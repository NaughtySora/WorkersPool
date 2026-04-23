# Nodejs Workers Pool / Noroutine

### Workers 

```js
  const modules = { api, crypto };
  const CONCURRENCY = 2;
  const pool = await new WorkersPool({
    modules,
    concurrency: CONCURRENCY,
  });
  // ... work
  await pool.close();
```

### Noroutine
```js
  const modules = { api, crypto };
  const CONCURRENCY = 2;
  const noroutine = await register({ 
    modules, 
    concurrency: CONCURRENCY,
  });
  // ... work
  await finalize(noroutine);
```