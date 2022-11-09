// Router.js

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

function hit(req,txt=''){ 
    console.warn(new Date().toJSON().substr(5,14).replace('T',' '), req.path, txt); 
    //console.warn('MEM', process.memoryUsage());
}


async function index(req, res){
    hit(req);
    try {
        config.theme     = req.cookies.theme || 'dark-mode';
        config.account   = req.cookies.account;
        config.usertoken = req.cookies.usertoken;
        let promos = await db.getSpecialEvents();
        let events = await db.getLatestEvents();
        //console.warn('Events', events);
        res.render('index.html', {config, promos, events, utils});
        //res.render('index.html', {config, events, utils});
    } catch(ex) {
        console.error(new Date(), 'Server error', ex.message);
        return res.status(500).render('servererror.html', {config});
    }
}

async function login(req, res){
    hit(req);
    config.theme     = req.cookies.theme || 'dark-mode';
    config.account   = req.cookies.account;
    config.usertoken = req.cookies.usertoken;
    res.render('login.html', {config});
}

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

async function list(req, res){
    hit(req);
    config.theme     = req.cookies.theme || 'dark-mode';
    config.account   = req.cookies.account;
    config.usertoken = req.cookies.usertoken;
    res.render('events.html', {config});
}

async function myEvents(req, res){
    hit(req);
    config.theme     = req.cookies.theme || 'dark-mode';
    config.account   = req.cookies.account;
    config.usertoken = req.cookies.usertoken;
    let events = await db.getMyEvents(config.account);
    let promos = await db.getMySpecialEvents(config.account);
    res.render('myevents.html', {config, events, promos, utils});
}

async function myTickets(req, res){
    hit(req);
    config.theme     = req.cookies.theme || 'dark-mode';
    config.account   = req.cookies.account;
    config.usertoken = req.cookies.usertoken;
    let events = await db.getMyTickets(config.account);
    let promos = await db.getMySpecialTickets(config.account);
    res.render('mytickets.html', {config, events, promos, utils});
}

async function event(req, res){
    hit(req);
    config.theme     = req.cookies.theme || 'dark-mode';
    config.account   = req.cookies.account;
    config.usertoken = req.cookies.usertoken;
    config.eventid   = req.params.id;
    let event = await db.getEventById(config.eventid);
    let tickets = await db.getTicketsByEvent(config.eventid);
    //console.warn(event);
    res.render('view.html', {config, event, tickets, utils});
}

async function mint(req, res){
    hit(req);
    config.theme     = req.cookies.theme || 'dark-mode';
    config.account   = req.cookies.account;
    config.usertoken = req.cookies.usertoken;
    config.eventid   = req.params.id;
    if(!config.usertoken){
    	config.redirect = '/mint/'+config.eventid;
    	res.redirect('/login');
    	return;
    }
    res.render('mint.html', {config});
}

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

async function terms(req, res){
    hit(req);
    config.theme     = req.cookies.theme || 'dark-mode';
    config.account   = req.cookies.account;
    config.usertoken = req.cookies.usertoken;
    res.render('terms.html', {config});
}

async function privacy(req, res){
    hit(req);
    config.theme     = req.cookies.theme || 'dark-mode';
    config.account   = req.cookies.account;
    config.usertoken = req.cookies.usertoken;
    res.render('privacy.html', {config});
}

async function faq(req, res){
    hit(req);
    config.theme     = req.cookies.theme || 'dark-mode';
    config.account   = req.cookies.account;
    config.usertoken = req.cookies.usertoken;
    res.render('notready.html', {config});
}


//-- API

async function apiTest(req, res){
    hit(req);
    res.end('OK');
}

async function apiNewUser(req, res){
    hit(req);
    let data = req.body;
    if(!data.account){
    	console.warn('No account');
        return res.end(JSON.stringify({success:false, error:'User not found'}));
    }
    // Check if user exists, if not, save to db
	let user = await db.getAccountById(data.account);
	//console.warn('User?', user);
	if(!user){
		console.warn('New');
		let ok = await db.newAccount(data);
	} else { 
		console.warn('Renew');
		let ok = await db.renewToken(data);
	}
    res.end(JSON.stringify({success:true}));
}

async function apiUser(req, res){
    hit(req)
    let account = req.cookies.account
    if(!account){ return res.end(JSON.stringify({error:'User id required'})) }
    let info = await db.getAccountById(account)
    if(!info){ return res.end(JSON.stringify({error:'User not found'})) }
	res.end(JSON.stringify(info))
}

async function apiUpload(req, res){
    hit(req);
    let data = req.body;
    console.warn('Data', data);
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
    console.warn('TokenId:', tid)
    res.end(JSON.stringify({success:true, tokenid:tid}));
}

async function apiTicket(req, res){
	hit(req)
	console.warn('Saving ticket', req.body)
	let info = await db.newTicket(req.body)
	console.warn('Saved', info)
    res.end(JSON.stringify({success:true, result:info}));
}

async function apiVerify(req, res){
    hit(req)
    console.warn('Verifying tickets', req.body)
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
    console.warn('Verified', info)
    return res.end(JSON.stringify({success:true, result:info, tickets:tixs, verified:unvf}));
}

async function apiWebhook(req, res){
    hit(req)
    console.warn('Webhook:', req.body)
}

/*
async function apiClaim(req, res){
    hit(req);
    let account   = req.cookies.account;
    let usertoken = req.cookies.usertoken;
    let eventid   = req.params.id;
   	let redirect = '/claim/'+eventid;
    if(!usertoken){
    	return res.status(500).send(JSON.stringify({error:'Please login with your wallet first', code:902, redirect:redirect}));
    }
    let user = await db.getAccountById(account)
    let exp = new Date(user.expires)
    let now = new Date()
    if(exp<now){
    	return res.status(500).send(JSON.stringify({error:'Session expired, please login with your wallet first', code:904, redirect:redirect}));
    }
    let event = await db.getEventById(eventid)
    if(event.error){
    	return res.status(500).send(JSON.stringify({error:'Error loading event, try again later', code:906}));
    }
    let uri = event.artwork
    let inf = await api.claimNFT(uri, eventid, account, usertoken)
    console.warn(inf)
    if(inf.error){
    	return res.status(500).send(JSON.stringify({error:'Error claiming token, try again in a moment', code:908, redirect:redirect}));
    }
   	res.send(JSON.stringify({success:true, tokenId:inf.tokenId}));
}
*/

async function apiNotfound(req, res){
    hit(req, 'not found');
    res.status(404).end('{"error":"Resource not found"}'); // Catch all
}



//-- OAUTH
/*
app.get('/oauth/challenge', (req, res) => { 
    hit(req);
    let tkn = req.query.token
    if(tkn){
        let sha = oauth.challenge(tkn, process.env.XUMMKEY)
        let inf = JSON.stringify({response_token:'sha256='+sha})
        console.warn('oAuth token:', tkn, inf)
        res.send(inf)
        return
    } else {
        res.status(400).end('{"error":"Invalid request, token required"}')
    }
});
*/


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
	mint,
	verify,
	terms,
	privacy,
	faq,
	apiTest,
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