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

## PostgreSQL Database Schema

### Table: accounts

```sql
CREATE TABLE IF NOT EXISTS accounts (
    recid       bigint NOT NULL DEFAULT nextval('accounts_recid_seq'::regclass),
    created     timestamp with time zone DEFAULT now(),
    userid      character varying(42),
    token       character varying(255),
    jwtoken     text,
    expires     timestamp with time zone DEFAULT now(),
    events      integer DEFAULT 0,
    tickets     integer DEFAULT 0,
    inactive    boolean DEFAULT false,
    CONSTRAINT  accounts_pkey PRIMARY KEY (recid)
)
```

### Table: events

```sql
CREATE TABLE IF NOT EXISTS events (
    recid       bigint NOT NULL DEFAULT nextval('events_recid_seq'::regclass),
    created     timestamp with time zone DEFAULT now(),
    account     character varying(42),
    eventid     character varying(10),
    tokenid     character varying(64),
    name        character varying(100),
    info        character varying(100),
    description text,
    startdate   timestamp with time zone,
    enddate     timestamp with time zone,
    expiry      timestamp with time zone,
    isvirtual   boolean DEFAULT false,
    location    character varying(100),
    website     character varying(254),
    artwork     character varying(254),
    quantity    integer DEFAULT 0,
    private     boolean,
    cost        integer DEFAULT 0,
    claimed     integer DEFAULT 0,
    verified    integer DEFAULT 0,
    image       character varying(20),
    bigimage    character varying(20),
    special     boolean DEFAULT false,
    inactive    boolean DEFAULT false,
    CONSTRAINT  events_pkey PRIMARY KEY (recid)
)
```

### Table: tickets

```sql
CREATE TABLE IF NOT EXISTS tickets (
    recid       bigint NOT NULL DEFAULT nextval('tickets_recid_seq'::regclass),
    created     timestamp with time zone DEFAULT now(),
    account     character varying(64),
    eventid     character varying(10),
    ticketid    character varying(64),
    verified    timestamp with time zone,
    CONSTRAINT  tickets_pkey PRIMARY KEY (recid)
)
```