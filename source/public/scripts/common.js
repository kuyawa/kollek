// Common.js
let session = {
    appkey   : '0c461d0b-22ac-4dc0-8c41-fe52b9f8761a',
    explorer : 'https://nft-devnet.xrpl.org',
    netrpc   : 'https://xls20-sandbox.rippletest.net:51234',
    neturl   : 'wss://xls20-sandbox.rippletest.net:51233',
    network  : 'nftdevnet',
}

var pkce  = null;
var xumm  = null;
var state = null;

console.log('App is running on', session.network);

function $(id) { return document.getElementById(id); }

function setTheme(mode) {
    console.log('THEME:', config.theme)
    document.body.className   = mode;
    $('text-theme').innerHTML = (document.body.className=='lite-mode'?'Dark Mode':'Light Mode');
    setCookie('theme', mode)
}

function changeTheme() {
    document.body.className   = (document.body.className=='lite-mode'?'dark-mode':'lite-mode');
    $('text-theme').innerHTML = (document.body.className=='lite-mode'?'Dark Mode':'Light Mode');
    setCookie('theme', document.body.className)
}

function setCookie(name, value, days) {
    var expires = '';
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = '; expires=' + date.toUTCString();
    }
    let path = '; path=/';
    //document.cookie = `${name}=${value}${expires}${path}`;
    document.cookie = name + '=' + (value || '') + expires + '; path=/';
}

function getCookie(name) {
    let value = null;
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') { c = c.substring(1, c.length); }
        if (c.indexOf(nameEQ) == 0) { value = c.substring(nameEQ.length, c.length); break; }
    }
    return value;
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(function() {
        console.log('Copying to clipboard was successful!');
    }, function(err) {
        console.error('Could not copy to clipboard:', err);
    });
}

function timeAgo(date) {
    var seconds = Math.floor((new Date() - date) / 1000);
    var interval = seconds / 31536000;
    if (interval > 1) {
        let n = Math.floor(interval);
        return  n + ' year' + (n==1?'':'s');
    }
    interval = seconds / 2592000;
    if (interval > 1) {
        let n = Math.floor(interval);
        return n + ' month' + (n==1?'':'s');
    }
    interval = seconds / 86400;
    if (interval > 1) {
        let n = Math.floor(interval);
        return n + ' day' + (n==1?'':'s');
    }
    interval = seconds / 3600;
    if (interval > 1) {
        let n = Math.floor(interval);
        return n + ' hour' + (n==1?'':'s');
    }
    interval = seconds / 60;
    if (interval > 1) {
        let n = Math.floor(interval);
        return n + ' minute' + (n==1?'':'s');
    }
    interval = seconds;
    let n = Math.floor(interval);
    if(n==0){ return 'seconds'; }
    return n + ' second' + (n==1?'':'s');
}

function dateToDB(date) {
    return date.toJSON().substr(0,19).replace('T',' ')
}

function randomAddress() {
    let buf = crypto.getRandomValues(new Uint8Array(20));
    let adr = '0x'+Array.from(buf).map(x=>{return x.toString(16).padStart(2,'0')}).join('');
    return adr;
}

function randomString(len=10){
    let ret = '';
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    for (let i=0; i<len; ++i) {
        ret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return ret;
}

function randomNumber(len=8){
    let ret = '';
    const chars = '0123456789';
    for (let i=0; i<len; ++i) {
        ret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return ret;
}

function stringToHex(str) {
    //return Buffer.from(str, 'utf8').toString('hex').toUpperCase();
    // utf8 to latin1
    var stx = unescape(encodeURIComponent(str))
    var hex = ''
    for (var i=0; i<stx.length; i++) {
        hex += Number(stx.charCodeAt(i)).toString(16)
    }
    return hex.toUpperCase()
}

function hexToString(hex) {
    var str = ''
    for (var i=0; i<hex.length; i+=2) {
        str += String.fromCharCode(parseInt(hex.substr(i,2),16))
    }
    return decodeURIComponent(escape(str))
}

// From XRPL
//function convertStringToHex(str) {
//    return Buffer.from(str, 'utf8').toString('hex').toUpperCase();
//}
//function convertHexToString(hex, encoding='utf8') {
//    return Buffer.from(hex, 'hex').toString(encoding);
//}

async function getUserInfo(account) {
    let info = await fetch('/api/userinfo/'+account)
    console.log('User:', info)
    return info
}

async function getTokenId(txid, uri) {
    let res = await fetch('/api/token/${txid}/${uri}')
    let inf = await res.json()
    return inf
}

async function getTransaction(txid) {
    try {
        let opt = {
            method: 'POST',
            //mode: 'no-cors',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({method: 'tx', params: [{transaction: txid, binary: false}]})
        }
        let url = session.netrpc
        let res = await fetch(url, opt)
        console.warn(res)
        //let inf = await res.text()
        let inf = await res.json()
        //console.warn(inf)
        return inf
    } catch(ex) {
        console.error('Error getting transaction', txid)
        console.error(ex)
    }
}

function showMessage(txt, warn=false) {
    if(warn){ txt = '<b>'+txt+'</b>'; }
    $('message').innerHTML = txt;
}

async function onConnect() {
    showMessage('Connecting, scan the qr-code...')
    try {
        console.log('Before')
        let pkce  = new XummPkce(session.appkey)
        let state = await pkce.authorize()
        console.log('After')
        if(state.me){
            showMessage('Authorizing, wait a moment...')
            let jwt  = state.jwt
            let user = state.me
            let xumm = state.sdk
            console.log('STATE', state)
            console.log('USER', user)             // user info and wallet address
            config.account = user.account         // rippleAddress
            session.neturl = user.networkEndpoint // wss://xls20-sandbox.rippletest.net:51233
            // user.networkType                   // CUSTOM
            console.log(session.neturl)
            if(session.neturl.includes('xls20')){
                console.log('Connected to NFT-DEVNET')
            } else {
                console.log('Not connected to NFT-DEVNET')
            }
            let app = await xumm.ping()
            console.log('APP', app) // app info
            config.usertoken = app.jwtData.usertoken_uuidv4  // user token for subsequent calls
            config.expires = dateToDB(new Date(app.jwtData.exp*1000))
            config.jwtoken = ''  //jwt
            setCookie('account', config.account)
            setCookie('usertoken', config.usertoken)
            setCookie('expires', config.expires)
            let dat = {account:config.account, usertoken:config.usertoken, expires:config.expires, jwtoken:jwt}
            console.log(dat)
            let opt = {method:'post', headers: {'content-type': 'application/json'}, body: JSON.stringify(dat)}
            let ok  = await fetch('/api/user', opt)
            $('connect').innerHTML = config.account.substr(0,8).toUpperCase()
            showMessage('Connected, redirecting...')
            window.location.href = config.redirect||'/'
        } else {
            showMessage('User login rejected')
            console.log('User login rejected')
        }
    } catch(ex) {
        console.error(ex)
        console.error('Error:', ex.message)
        showMessage('Error: '+ex.message)
    }
}

async function main() {
    setTheme(config.theme)
    if(config.account){
        $('connect').innerHTML = config.account.substr(0,8).toUpperCase()
    }
    //await loadXumm()
    if(window['start']) { start(); }
}


// TEST PKCE.2
/*
async function loadXumm(){
    pkce = new XummPkce(session.appkey)
    pkce.on('error', (error) => {
        console.log('Xumm error', error)
    })
    pkce.on('success', async () => {
        console.log('Success: authorized')
        state = await pkce.state()
        if(state?.sdk){ xumm = state.sdk }
        console.log('User:', state?.me?.sub)
    })
    pkce.on('retrieved', async () => {
        console.log('Retrieved: authorized')
        state = await pkce.state()
        if(state?.sdk){ xumm = state.sdk }
        console.log('User:', state?.me?.sub)
    })
}

async function authorize(){
    if(!state){
        console.log('Not authorized')
        state = await pkce.authorize()
    } else {
        console.log('Reauthorizing')
        state = await pkce.state()
    }
    if(state?.sdk){ xumm = state.sdk }
    console.log('User:', state?.me?.sub)
    console.log('XUMM',xumm)
    return xumm
}
*/

window.onload = main;

// END