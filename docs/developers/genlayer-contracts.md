# GenLayer Contracts

GenLayer is a rover chain that runs **Python Intelligent Contracts** on a network of AI validators. DGDreams uses it as a first-class backend for daily tasks.

## ⏱️ Real, provable time

All contracts fetch **real UTC time** from the web and enforce consensus on it, so "once per UTC day" is honest and verifiable.

```python
from genlayer import *
import json

class NikBase(gl.Contract):
    store: str

    def _now(self) -> int:
        def fetch_time() -> str:
            raw = gl.nondet.web.render(
                "https://worldtimeapi.org/api/timezone/Etc/UTC",
                mode="text",
            )
            ...
        return int(gl.eq_principle.strict_eq(fetch_time))

    def _today(self) -> int:
        return self._now() // 86400

    @gl.public.write
    def dailyCheckIn(self) -> str: ...

    @gl.public.write
    def gm(self) -> None: ...

    @gl.public.write
    def gn(self) -> None: ...
```

Every validator independently fetches the time via `gl.nondet.web.render()`, and `strict_eq` makes them agree before anything is stored.

## 📦 NikBase — fallback activity tracker

NikBase (in the basketball) stores all user data as JSON in a single `str` state field and records daily actions: `gm`, `gn`, `checkIn`, `dose`, `mood`, `sanitize`, `counter`, `spin`.

Each action type is only accepted **once per UTC day**, enforced by comparing `_today()` against the user's stored `lastActionDay`.

## 🔌 Talking to GenLayer from the frontend

GenLayer is **not EVM**, so wagmi/viem can't touch it. All interaction goes through the `genlayer-js` SDK:

- Client factory → [`src/lib/genlayer/client.ts`](https://github.com/Misagh95/dgdreams/blob/master/src/lib/genlayer/client.ts)
- Write/read helpers → [`src/lib/genlayer/tasks.ts`](https://github.com/Misagh95/dgdreams/blob/master/src/lib/genlayer/tasks.ts)
- Provider: MetaMask's `window.ethereum`

```ts
import { useGenLayer } from 'genlayer-js'
```

> ⚠️ GenLayer uses **Python**, not Solidity, and a non-EVM runtime. Keep Agent contracts out of the `wagmi` code path — routing is handled by `isGenLayer(chainId)`.