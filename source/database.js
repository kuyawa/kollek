// DATABASE

const postgres = require('pg');
const dbconn   = process.env.DATABASE;
if(!dbconn){ console.error('DATASERVER NOT AVAILABLE'); }
const dbp = new postgres.Pool({ connectionString: dbconn });


class DataServer {
    async connect() {}
    async disconnect() {}

    async insert(sql, params, key) {
        var dbc, res, recid, data = null;
        try {
            dbc = await dbp.connect();
            res = await dbc.query(sql, params);
            if(res.rowCount>0) { 
                recid = key?res.rows[0][key]:0;
                data  = { status:'OK', id: recid }; 
            }
        } catch(ex) {
            console.error('DB error on new record:', ex.message);
            data = { error: ex.message };
        } finally {
            if (dbc) { dbc.release(); }
        }
        return data;
    }

    async update(sql, params) {
        var dbc, res, data = null;
        try {
            dbc = await dbp.connect();
            res = await dbc.query(sql, params);
            if(res.rowCount>0) {
                data = res.rowCount;
            } else { 
                data = 0;
            }
        } catch(ex) {
            console.error('DB error updating records:', ex.message);
            data = { error: ex.message };
        } finally {
            if (dbc) { dbc.release(); }
        }
        return data;
    }

    async delete(sql, params) {
        var dbc, res, data = null;
        try {
            dbc = await dbp.connect();
            res = await dbc.query(sql, params);
            if(res.rowCount>0) {
                data = res.rowCount;
            } else { 
                data = 0;
            }
        } catch(ex) {
            console.error('DB error deleting records:', ex.message);
            data = { error: ex.message };
        } finally {
            if (dbc) { dbc.release(); }
        }
        return data;
    }

    async query(sql, params) {
        var dbc, res, data = null;
        try {
            dbc = await dbp.connect();
            res = await dbc.query(sql, params);
            if(res.rows.length>0) { 
                data = res.rows;
            } else {
                data = [];
            }
        } catch(ex) {
            console.error('DB error in query:', ex.message);
            data = { error: ex.message };
        } finally {
            if (dbc) { dbc.release(); }
        }
        return data;
    }

    async queryObject(sql, params) {
        var dbc, res, data = null;
        try {
            dbc = await dbp.connect();
            res = await dbc.query(sql, params);
            if(res.rows.length>0) { 
                data = res.rows[0];
            }
        } catch(ex) {
            console.error('DB error getting data object:', ex.message);
            data = { error: ex.message };
        } finally {
            if (dbc) { dbc.release(); }
        }
        return data;
    }

    async queryValue(sql, params) {
        var dbc, res, data = null;
        try {
            dbc = await dbp.connect();
            res = await dbc.query(sql, params);
            if(res.rows.length>0) { 
                data = res.rows[0].value; // Select should have field as value
            }
        } catch(ex) {
            console.error('DB error getting data value:', ex.message);
            data = { error: ex.message };
        } finally {
            if (dbc) { dbc.release(); }
        }
        return data;
    }
}


const DS = new DataServer();

async function newAccount(rec) {
	let sql = 'insert into accounts(userid, token, expires, jwtoken)  values($1, $2, $3, $4) returning recid';
    let par = [rec.account, rec.usertoken, rec.expires, rec.jwtoken];
    let dat = await DS.insert(sql, par, 'recid');
    return dat;
}

async function getAccountById(userid) {
    let sql = 'select * from accounts where userid=$1';
    let par = [userid];
    let dat = await DS.queryObject(sql, par);
    return dat;
}

async function renewToken(rec) {
    let sql = 'update accounts set token=$1, expires=$2, jwtoken=$3 where userid=$4';
    let par = [rec.usertoken, rec.expires, rec.jwtoken, rec.account];
    let dat = await DS.update(sql, par);
    return dat;
}

async function newEvent(rec) {
	let sql1 = 'insert into events(eventid, account, artwork, image, tokenid, name, info, description, startdate, enddate, expiry, isvirtual, location, website, quantity, private, cost)  values($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) returning recid';
    let par1 = [rec.eventid, rec.account, rec.artwork, rec.image, rec.tokenid, rec.name, rec.info, rec.description, rec.startdate, rec.enddate, rec.expiry, rec.isvirtual, rec.location, rec.website, rec.quantity, rec.private, rec.cost];
    let dat1 = await DS.insert(sql1, par1, 'recid');
    let sql2 = 'update accounts set events = events + 1 where userid = $1';
    let par2 = [rec.account];
    let dat2 = await DS.update(sql2, par2);
    return {event:dat1, counter:dat2};
}

async function getEventById(eventid) {
    let sql = 'select * from events where eventid=$1';
    let par = [eventid];
    let dat = await DS.queryObject(sql, par);
    return dat;
}

async function getLatestEvents(cnt=40) {
    let sql = 'select * from events where startdate::date > $1 AND NOT special AND NOT private order by startdate limit $2';
    let now = new Date().toJSON().substr(0,10);
    let par = [now, cnt];
    let dat = await DS.query(sql, par);
    return dat;
}

async function getSpecialEvents(cnt=10) {
    let sql = 'select * from events where startdate::date > $1 AND special AND NOT private order by startdate limit $2';
    let now = new Date().toJSON().substr(0,10);
    let par = [now, cnt];
    let dat = await DS.query(sql, par);
    return dat;
}

async function getMyEvents(account, cnt=100) {
    let sql = 'select * from events where account = $1 AND NOT special order by startdate desc limit $2';
    let par = [account, cnt];
    let dat = await DS.query(sql, par);
    return dat;
}

async function getMySpecialEvents(account, cnt=100) {
    let sql = 'select * from events where account = $1 AND special order by startdate limit $2';
    let par = [account, cnt];
    let dat = await DS.query(sql, par);
    return dat;
}

async function getMyTickets(account, cnt=100) {
    let sql = 'select t.created as minted, t.verified, e.* from tickets t left outer join events e on t.eventid = e.eventid where t.account = $1 AND NOT e.special order by e.startdate desc limit $2';
    let par = [account, cnt];
    let dat = await DS.query(sql, par);
    return dat;
}

async function getMySpecialTickets(account, cnt=100) {
    let sql = 'select t.created as minted, t.verified, e.* from tickets t left outer join events e on t.eventid = e.eventid where t.account = $1 AND e.special order by e.startdate desc limit $2';
    let par = [account, cnt];
    let dat = await DS.query(sql, par);
    return dat;
}

async function newTicket(rec) {
    let sql1 = 'insert into tickets(account, eventid, ticketid) values($1, $2, $3) returning recid';
    let par1 = [rec.account, rec.eventid, rec.ticketid];
    let dat1 = await DS.insert(sql1, par1, 'recid');
    let sql2 = 'update events set claimed = claimed + 1 where eventid = $1';
    let par2 = [rec.eventid];
    let dat2 = await DS.update(sql2, par2);
    let sql3 = 'update accounts set tickets = tickets + 1 where userid = $1';
    let par3 = [rec.account];
    let dat3 = await DS.update(sql3, par3);
    return {ticket:dat1, event:dat2, counter:dat3};
}

async function getTicketsByEvent(eventId, cnt=100) {
    let sql = 'select * from tickets where eventid = $1 order by created desc limit $2';
    let par = [eventId, cnt];
    let dat = await DS.query(sql, par);
    return dat;
}

async function getTicketsVerified(eventId, cnt=100) {
    let sql = 'select * from tickets where eventid = $1 and verified is not null order by created desc limit $2';
    let par = [eventId, cnt];
    let dat = await DS.query(sql, par);
    return dat;
}

async function getTicketsByUser(account, eventId) {
    let sql = 'select * from tickets where account=$1 and eventid=$2 order by created';
    let par = [account, eventId];
    let dat = await DS.query(sql, par);
    return dat;
}

async function getUnverifiedByUser(account, eventId) {
    let sql = 'select * from tickets where account=$1 and eventid=$2 and verified is null order by created';
    let par = [account, eventId];
    let dat = await DS.query(sql, par);
    return dat;
}

async function verifyTickets(account, eventId) {
    let sql1 = 'update tickets set verified=now() where account=$1 and eventid=$2 and verified is null';
    let par1 = [account, eventId];
    let dat1 = await DS.update(sql1, par1);
    console.warn('dat1?', dat1);
    let dat2 = null;
    if(dat1>0){
        let sql2 = 'update events set verified = verified + $1 where eventid = $2';
        let par2 = [dat1, eventId];
        dat2 = await DS.update(sql2, par2);
    }
    return {verified:dat1, counter:dat2};
}


module.exports = {
	newAccount,
	getAccountById,
    renewToken,
    newEvent,
    getEventById,
    getLatestEvents,
    getSpecialEvents,
    getMyEvents,
    getMySpecialEvents,
    getMyTickets,
    getMySpecialTickets,
    newTicket,
    getTicketsByEvent,
    getTicketsVerified,
    getTicketsByUser,
    getUnverifiedByUser,
    verifyTickets
}

// END