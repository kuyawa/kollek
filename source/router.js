// ROUTER

const fs        = require('fs');
const path      = require('path');
const api       = require('./api.js');
const db        = require('./database.js');
const utils     = require('./utils.js');
const uploaders = require('./uploaders.js');

var config = {
    explorer: process.env.EXPLORER,
    neturl:   process.env.NETURL,
    network:  process.env.NETWORK,
    theme:    'dark-mode'
}

// Log all hits to different routes
function hit(req,txt=''){
    console.warn(new Date().toJSON().substr(5,14).replace('T',' '), req.path, txt); 
    //console.warn('MEM', process.memoryUsage());
}

// Main page
async function index(req, res){
    hit(req);
    try {
        config.theme     = req.cookies.theme || 'dark-mode';
        config.account   = req.cookies.account;
        config.usertoken = req.cookies.usertoken;
        let promos = await db.getSpecialEvents();
        let events = await db.getLatestEvents();
        res.render('index.html', {config, promos, events, utils});
    } catch(ex) {
        console.error(new Date(), 'Server error', ex.message);
        return res.status(500).render('servererror.html', {config});
    }
}

// Login page
async function login(req, res){
    hit(req);
    config.theme     = req.cookies.theme || 'dark-mode';
    config.account   = req.cookies.account;
    config.usertoken = req.cookies.usertoken;
    res.render('login.html', {config});
}

// Register event
async function register(req, res){
    hit(req);
    config.theme     = req.cookies.theme || 'dark-mode';
    config.account   = req.cookies.account;
    config.usertoken = req.cookies.usertoken;
    if(!config.usertoken){
    	config.redirect = '/register';
    	res.redirect('/login');
    	return;
    }
    res.render('event.html', {config});
}

// List events
async function list(req, res){
    hit(req);
    config.theme     = req.cookies.theme || 'dark-mode';
    config.account   = req.cookies.account;
    config.usertoken = req.cookies.usertoken;
    res.render('events.html', {config});
}

// Events I have created
async function myEvents(req, res){
    hit(req);
    config.theme     = req.cookies.theme || 'dark-mode';
    config.account   = req.cookies.account;
    config.usertoken = req.cookies.usertoken;
    let events = await db.getMyEvents(config.account);
    let promos = await db.getMySpecialEvents(config.account);
    res.render('myevents.html', {config, events, promos, utils});
}

// Tickets I have minted
async function myTickets(req, res){
    hit(req);
    config.theme     = req.cookies.theme || 'dark-mode';
    config.account   = req.cookies.account;
    config.usertoken = req.cookies.usertoken;
    let events = await db.getMyTickets(config.account);
    let promos = await db.getMySpecialTickets(config.account);
    res.render('mytickets.html', {config, events, promos, utils});
}

// View event where you can claim or verify a ticket
async function event(req, res){
    hit(req);
    config.theme     = req.cookies.theme || 'dark-mode';
    config.account   = req.cookies.account;
    config.usertoken = req.cookies.usertoken;
    config.eventid   = req.params.id;
    let event = await db.getEventById(config.eventid);
    let tickets = await db.getTicketsByEvent(config.eventid);
    res.render('view.html', {config, event, tickets, utils});
}

// Verify attendance validating ticket is from account
async function verify(req, res){
    hit(req);
    config.theme     = req.cookies.theme || 'dark-mode';
    config.account   = req.cookies.account;
    config.usertoken = req.cookies.usertoken;
    config.eventid   = req.params.id;
    let event = await db.getEventById(config.eventid);
    let tickets = await db.getTicketsVerified(config.eventid);
    res.render('verify.html', {config, event, tickets, utils});
}

// Terms and conditions
async function terms(req, res){
    hit(req);
    config.theme     = req.cookies.theme || 'dark-mode';
    config.account   = req.cookies.account;
    config.usertoken = req.cookies.usertoken;
    res.render('terms.html', {config});
}

// Privacy policy
async function privacy(req, res){
    hit(req);
    config.theme     = req.cookies.theme || 'dark-mode';
    config.account   = req.cookies.account;
    config.usertoken = req.cookies.usertoken;
    res.render('privacy.html', {config});
}

// Frequently asked questions
async function faq(req, res){
    hit(req);
    config.theme     = req.cookies.theme || 'dark-mode';
    config.account   = req.cookies.account;
    config.usertoken = req.cookies.usertoken;
    res.render('notready.html', {config});
}


//-- API

// Register new user, updating user token for login
async function apiNewUser(req, res){
    hit(req);
    let data = req.body;
    if(!data.account){
        return res.end(JSON.stringify({success:false, error:'Account not provided'}));
    }
    // Check if user exists, if not, save to db
	let user = await db.getAccountById(data.account);
	if(!user){
		let ok = await db.newAccount(data);
	} else { 
		let ok = await db.renewToken(data);
	}
    res.end(JSON.stringify({success:true}));
}

// Gets user info by account id
async function apiUser(req, res){
    hit(req)
    let account = req.cookies.account
    if(!account){ return res.end(JSON.stringify({error:'User id required'})) }
    let info = await db.getAccountById(account)
    if(!info){ return res.end(JSON.stringify({error:'User not found'})) }
	res.end(JSON.stringify(info))
}

// Uploads file to blockchain and servers
async function apiUpload(req, res){
    hit(req);
    let data = req.body;
    if(!req.files || !req.files.file || !req.files.file.name) { 
    	return res.status(500).send(JSON.stringify({error:'No files uploaded'})); 
    }
    let artwork = req.files.file;
    console.warn('File', artwork);
    console.warn('File name:', artwork.name)
    console.warn('Mime type:', artwork.mimetype)
    let validMime = ['image/jpg', 'image/jpeg', 'image/png'];
    if(validMime.indexOf(artwork.mimetype)<0){
    	return res.status(500).send(JSON.stringify({error:'Invalid image type, only jpg or png allowed'})); 
    }
    try {
        // Upload artwork
        let fileId = await uploaders.uploadFile(artwork.data, artwork.mimetype);
        if(!fileId || fileId.error) { 
            console.error('Error uploading file');
            return res.status(500).send(JSON.stringify({error:'Error uploading artwork, try again in a moment'}));
        }
        // Copy artwork locally
        let folder   = path.join(__dirname, 'public/artwork/');
        let fileExt  = (artwork.mimetype=='image/png'?'.png':'.jpg');
        let fileName = data.eventid+fileExt;
        let filePath = folder+fileName;
        artwork.mv(filePath, function(err) {
            if(err){ return res.status(500).send(JSON.stringify({error:err})); }
        });
        res.send(JSON.stringify({success:true, artwork:fileId, image: fileName}));
    } catch(ex) {
        console.error('Error uploading artwork')
        console.error(ex)
        res.status(500).send(JSON.stringify({error:ex.message}));
    }
}

// Registers new event in database
async function apiEvent(req, res){
    hit(req);
    let event = req.body;
    if(event.enddate=='null'){ event.enddate = null; }
    if(event.expiry=='null'){ event.expiry = null; }
    try {
        let inf = db.newEvent(event);
        if(inf.error){
    		res.status(500).send(JSON.stringify({error:inf.error}));
        } else {
        	res.send(JSON.stringify({success:true}));
        }
    } catch(ex) {
    	console.error('Error saving event')
    	console.error(ex)
    	res.status(500).send(JSON.stringify({error:ex.message}));
    }
}

// Get token info from transaction id
async function apiToken(req, res){
    hit(req);
    let tx = await api.getTransaction(req.params.tx)
    if(!tx){
    	return res.end(JSON.stringify({error:'Error getting token id'}));
    }
    let tid = await api.getTokenId(tx, req.params.uri)
    if(!tid){
    	return res.end(JSON.stringify({error:'Token id not found'}));
    }
    res.end(JSON.stringify({success:true, tokenid:tid}));
}

// Saves ticket info to database
async function apiTicket(req, res){
	hit(req)
	let info = await db.newTicket(req.body)
    res.end(JSON.stringify({success:true, result:info}));
}

// Verify tickets owned by user
async function apiVerify(req, res){
    hit(req)
    let tixs = await db.getTicketsByUser(req.body.account, req.body.eventId)
    let unvf = await db.getUnverifiedByUser(req.body.account, req.body.eventId)
    if(tixs.error) {
        return res.end(JSON.stringify({error:tixs.error}));
    }
    if(tixs.length<1) {
        return res.end(JSON.stringify({error:'User has no tickets to verify for this event'}));
    }
    if(unvf.length<1){
        return res.end(JSON.stringify({error:'All user tickets for this event have been verified'}));
    }
    let info = await db.verifyTickets(req.body.account, req.body.eventId)
    return res.end(JSON.stringify({success:true, result:info, tickets:tixs, verified:unvf}));
}

// Receive webhook responses
async function apiWebhook(req, res){
    hit(req)
    console.warn('Webhook:', req.body)
}

// API catch all 404
async function apiNotfound(req, res){
    hit(req, 'not found');
    res.status(404).end('{"error":"Resource not found"}');
}



//-- UTILS

async function logs(req, res){
    let fhn = path.join(__dirname, 'stderr.log');
    let txt = fs.readFileSync(fhn, {encoding: 'utf8'});
    res.end('<body style="padding:20px;color:#AFA;background-color:#111;font-size:130%;"><pre>'+txt+'</pre></body>');
}

async function logx(req, res){
    let fn = path.join(__dirname, 'stderr.log');
    let ok = fs.writeFileSync(fn, '----\n');
    res.end('<body style="padding:20px;color:#AFA;background-color:#111;font-size:130%;"><pre>Logs cleared</pre></body>');
}

// Catch all 404
async function notfound(req, res){
    hit(req, 'not found');
    config.theme     = req.cookies.theme || 'dark-mode';
    config.account   = req.cookies.account;
    config.usertoken = req.cookies.username;
    res.status(404).render('notfound.html', {config}); // Catch all
}


module.exports = {
	index,
	login,
	register,
	list,
	event,
    myEvents,
    myTickets,
	verify,
	terms,
	privacy,
	faq,
	apiUser,
	apiNewUser,
	apiUpload,
    apiEvent,
	apiToken,
	apiTicket,
	apiVerify,
    apiWebhook,
	apiNotfound,
	logs,
	logx,
	notfound
}