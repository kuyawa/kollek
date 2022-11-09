# Source

KOLLEK is a NodeJS app that runs in the browser

We use Arweave blockchain for permanent storage as it has great advantages over IPFS or FileCoin

We use PostgreSQL for blockchain replication as fetching data from blockchain sometimes is slow, providing the end user a really fast experience

We use XUMM as our prefered wallet for login and minting, go get it at [https://xumm.app](https://xumm.app)

The entry point is index.js that starts the server app loading the router and listening for events, run it as `node index` and you should be good to go (some env vars and database required)

```
> npm install (will install all the modules in package.json)
> node index  (will run the app)
```

- TODO: add database schema