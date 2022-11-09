// KOLLEK

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const path       = require('path');
const ejs        = require('ejs');
const express    = require('express');
const uploader   = require('express-fileupload');
const bodyParser = require('body-parser');
const cookies    = require('cookie-parser');
const router     = require('./router.js');


async function main(){
    console.warn(new Date(), 'App is running on', process.env.NETWORK);
    const app = express();
    app.use(express.static(path.join(__dirname, 'public')));
    app.use(uploader());
    //app.use(express.json()) // Instead of bodyParser since express 4.16
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(cookies());
    app.set('views', path.join(__dirname, 'public/views'));
    app.set('view engine', 'html');
    app.engine('html', ejs.renderFile);


    //-- ROUTER
    app.get('/', router.index)
    app.get('/login', router.login)
    app.get('/register', router.register)
    app.get('/events', router.list)
    app.get('/myevents', router.myEvents)
    app.get('/mytickets', router.myTickets)
    app.get('/event/:id', router.event)
    app.get('/mint/:id', router.mint)
    app.get('/verify/:id', router.verify)
    app.get('/terms', router.terms)
    app.get('/privacy', router.privacy)
    app.get('/faq', router.faq)
    app.get('/api/test', router.apiTest)
    app.get('/api/user', router.apiUser)
    app.post('/api/user', router.apiNewUser)
    app.post('/api/upload', router.apiUpload)
    app.post('/api/event', router.apiEvent)
    app.post('/api/ticket', router.apiTicket)
    app.post('/api/verify', router.apiVerify)
    app.get('/api/token/:tx/:uri', router.apiToken)
    app.post('/api/webhook', router.apiWebhook)
    app.get('/api/*', router.apiNotfound)
    app.get('/logs', router.logs)
    app.get('/logx', router.logx)
    app.get('/*', router.notfound)
    app.listen(5000);
}

main();

// END