// events.js

function saveButton(txt, disabled=false) {
    $('save').innerHTML = txt||'Save';
    $('save').disabled = disabled?true:false;
}

function claimButton(txt, disabled=false) {
    $('claim').innerHTML = txt||'MINT';
    $('claim').disabled = disabled?true:false;
}

function verifyButton(txt, disabled=false) {
    $('verify').innerHTML = txt||'VERIFY';
    $('verify').disabled = disabled?true:false;
}

function parseMemo(obj){
    let res = []
    for(key in obj){
        if(!obj[key]){ continue; }
        let typ = stringToHex(key)
        let dat = stringToHex(obj[key].toString())
        if(dat){
            res.push({Memo:{MemoType:typ, MemoData:dat}})
        }
    }
    return res;
}

function onCost() {
    let tot = 1
    let qty = $('quantity').value
    //console.log('Qty:', qty)
    if(qty>1000){
        tot = Math.ceil(qty * 0.000012)
    }
    //console.log('Cost:', tot)
    $('totalcost').innerHTML = `TOTAL COST ${tot} XRP`
}

function onPreviewFile(input){
    let file = input.files[0]
    let reader = new FileReader()
    reader.onload = function(e)  {
        $('artwork-image').src = e.target.result
    }
    reader.readAsDataURL(file)
}

async function onSave(){
    let res, inf;
    try {
        // Validate required fields
        if(!config.account){ showMessage('Connect your XUMM wallet first',1); return; }
        if(!$('event-name').value){ showMessage('Event name is required',1); return; }
        if(!$('event-date').value){ showMessage('Event date is required',1); return; }
        if(!$('quantity').value){ showMessage('Ticket quantity is required',1); return; }
        if(!$('artwork-file').files[0]){ showMessage('Image is required, select a 500x500 jpg or png',1); return; }

        // First upload artwork
        showMessage('Uploading artwork, wait a moment...');
        saveButton('WAIT',1)
        let eventId = randomNumber()
        let file = new FormData()
        file.append('eventid', eventId)
        file.append('file', $('artwork-file').files[0])
        res = await fetch('/api/upload', {method: 'POST', body: file});
        inf = await res.json();
        console.log('Uploaded:', inf);
        if(inf.error) { showMessage(inf.error, true); saveButton(); return; }
        let artwork = inf.artwork
        let image   = inf.image
        //showMessage('Artwork uploaded, minting event...');

        // Then mint event
        let event = {
            eventid:     eventId,
            account:     config.account,
            name:        $('event-name').value,
            info:        $('event-info').value,
            description: $('description').value,
            multiday:    ($('end-date').value?true:false),
            startdate:   $('event-date').value?.replace('T',' '),
            enddate:     null,
            expiry:      null,
            isvirtual:   ($('location').value?false:true),
            location:    $('location').value,
            website:     $('website').value,
            artwork:     artwork,
            image:       image,
            quantity:    $('quantity').value,
            private:     $('private').checked,
            cost:        1
        }
        if($('end-date').value){ event.enddate = $('end-date').value.replace('T',' '); }
        if($('expiration').value){ event.expiry = $('expiration').value.replace('T',' '); }
        if(parseInt(event.quantity)>100000){
            event.cost = Math.ceil(event.quantity * 0.000012)
        }
        console.log('Event:', event)
        showMessage('Check your wallet events and approve the minting...');
        let memo = parseMemo(event)
        let resp = await mintEvent(event, memo)
        if(resp.error){ showMessage('Error minting event: '+resp.error,1); saveButton(); return; }
        event.tokenid = resp.tokenid

        // Send to server
        let data = new FormData()
        data.append('eventid', event.eventid)
        data.append('tokenid', event.tokenid)
        data.append('account', event.account)
        data.append('name', event.name)
        data.append('info', event.info)
        data.append('description', event.description)
        data.append('startdate', event.startdate)
        data.append('enddate', event.enddate)
        data.append('expiry', event.expiry)
        data.append('isvirtual', event.isvirtual)
        data.append('location', event.location)
        data.append('website', event.website)
        data.append('artwork', event.artwork)
        data.append('image', event.image)
        data.append('quantity', event.quantity)
        data.append('private', event.private)
        data.append('cost', event.cost)
        res = await fetch('/api/event', {method: 'POST', body: data});
        inf = await res.json();
        console.log('Response', inf);
        if(inf.error) { showMessage(inf.error, true); saveButton(); return; }
        showMessage(`Your event was saved. <a href="./event/${event.eventid}">View event info</a>`);
        $('totalcost').innerHTML = 'EVENT '+event.eventid
        saveButton();
    } catch(ex){
        console.error(ex)
        showMessage('Error saving event: '+ex.message);
        saveButton();
    }
}

async function mintEvent(event, memo) {
    let tx = {
        user_token: config.usertoken,
        txjson: {
          TransactionType: 'NFTokenMint',
          Account:         config.account,
          URI:             stringToHex(event.artwork),
          Flags:           11,    // burnable, resellable, transferable
          Fee:             '12',  // drops per tx
          //TransferFee:   10000, // 10% on sales for issuer
          NFTokenTaxon:    parseInt(event.eventid),
          Memos:           memo
        }
    }
    console.log('TX', tx)
    try {
        // Using sdk-jwt
        let jwt  = null;
        let res  = await fetch('/api/user')
        let user = await res.json()
        console.log('User', user)
        if(user?.jwtoken){
            jwt = user.jwtoken
        } else {
            console.log('Login with your XUMM wallet first')
            let pkce  = new XummPkce(session.appkey)
            let state = await pkce.authorize()
            jwt = state.jwt
        }
        xumm = new XummSdkJwt(jwt)
        // Using pkce
        //xumm = await authorize()
        let {created, resolved} = await xumm.payload.createAndSubscribe(tx, function (payloadEvent) {
            if(typeof payloadEvent.data.signed !== 'undefined') {
                console.log('DATA>', payloadEvent.data)
                return payloadEvent.data  // Resolved value of the `resolved` property
            }
            console.log('DATA?', payloadEvent.data)
        })
        console.log('C', created)
        console.log('R', resolved)
        let payloadId = created?.uuid
        console.log('PAYLOADID', payloadId)
        let qrcode = created?.refs?.qr_png
        console.log('QRCODE', qrcode)
        //if(qrcode){
        //  let popup = window.open(qrcode,'qrcode','scrollbars=no,resizable=no,status=no,location=no,toolbar=no,menubar=no,width=400,height=400,left=100,top=100')
        //}
        //let socket = created?.refs?.websocket_status
        //console.log('SOCKET', socket)
        if(payloadId){ 
            // https://gist.github.com/WietseWind/4d844eb3a77bdca59cdb14c3e511d894#file-index-js-L44
            //console.log('RESOLVE', res.resolved)
            let outcome = await resolved  // https://www.npmjs.com/package/xumm-sdk -> Sdk.payload.subscribe
            console.log('OUTCOME', outcome)
            console.log('SIGNED', outcome.signed)
            if(outcome.signed){
                console.log('TXID', outcome.txid)
                res = await fetch(`/api/token/${outcome.txid}/${stringToHex(event.artwork)}`)
                inf = await res.json()
                console.log('Token', inf)
                if(inf.error){
                    console.log('Error getting token id', inf.error)
                    return {error:'Error getting token id'} 
                } else {
                    return {success:true, payload:payloadId, tokenid:inf.tokenid } 
                }
            } else {
                return {error:'Error minting event, payload not signed'}
            }

        } else { 
            return {error:'Error minting event, payload not found'} 
        }
    } catch(ex) {
        console.error('>ERROR:', ex)
        return {error:ex.message}
    }
}

async function mintNFT(eventId, eventUri) {
    let tx = {
        user_token: config.usertoken,
        txjson: {
          TransactionType: 'NFTokenMint',
          Account:         config.account,
          URI:             stringToHex(eventUri),
          Flags:           11,
          Fee:             '12',
          //TransferFee:     10000,
          NFTokenTaxon:    parseInt(eventId)
        }
    }
    console.log('TX', tx)
    try {
        let jwt  = null;
        let res  = await fetch('/api/user')
        let user = await res.json()
        console.log('User', user)
        if(user?.jwtoken){
            jwt = user.jwtoken
        } else {
            console.log('Login with your XUMM wallet first')
            let pkce  = new XummPkce(session.appkey)
            let state = await pkce.authorize()
            jwt = state.jwt
        }
        xumm = new XummSdkJwt(jwt)
        //xumm = await authorize()
        if(!xumm){ showMessage('You must login with XUMM wallet first',1); return; }
        let {created, resolved} = await xumm.payload.createAndSubscribe(tx, function (payloadEvent) {
            if(typeof payloadEvent.data.signed !== 'undefined') {
                console.log('DATA>', payloadEvent.data)
                return payloadEvent.data  // Resolved value of the `resolved` property
            }
            console.log('DATA?', payloadEvent.data)
        })
        console.log('C', created)
        console.log('R', resolved)
        let payloadId = created?.uuid
        console.log('PAYLOADID', payloadId)
        let qrcode = created?.refs?.qr_png
        console.log('QRCODE', qrcode)
        //if(qrcode){
        //  let popup = window.open(qrcode,'qrcode','scrollbars=no,resizable=no,status=no,location=no,toolbar=no,menubar=no,width=400,height=400,left=100,top=100')
        //}
        //let socket = created?.refs?.websocket_status
        //console.log('SOCKET', socket)
        if(payloadId){ 
            // https://gist.github.com/WietseWind/4d844eb3a77bdca59cdb14c3e511d894#file-index-js-L44
            //console.log('RESOLVE', res.resolved)
            let outcome = await resolved  // https://www.npmjs.com/package/xumm-sdk -> Sdk.payload.subscribe
            console.log('OUTCOME', outcome)
            console.log('SIGNED', outcome.signed)
            if(outcome.signed){
                console.log('TXID', outcome.txid)
                showMessage('Your ticket has been minted')
                // get tx in xrpl
                //let trx = await getTransaction(outcome.txid)
                //let tokenid = getTokenId(txid, eventUri)
                res = await fetch(`/api/token/${outcome.txid}/${stringToHex(eventUri)}`)
                inf = await res.json()
                console.log('Token', inf)
                if(inf.error){
                    console.log('Error getting token id', inf.error)
                    //showMessage('Error minting ticket')
                } else {
                    let ticketId = inf.tokenid
                    let minted = new Date()
                    let data = {account:config.account, eventid:eventId, ticketid:ticketId, minted:dateToDB(minted)}
                    let opt = {
                        method:  'POST',
                        headers: {'Content-Type': 'application/json'},
                        body:    JSON.stringify(data)
                    }
                    res = await fetch('/api/ticket', opt)
                    inf = await res.json()
                    console.log('Ticket', inf)
                    addTicketToList(config.account, ticketId, minted)
                    $('total-minted').innerHTML = parseInt($('total-minted').innerHTML) + 1 
                    return {success:true, payloadId:payloadId, ticketId:ticketId } 
                }
            } else {
                showMessage('Error minting ticket')
                return {error:'Error minting ticket'}
            }

        }
        else { return {error:'Error minting ticket'} }
    } catch(ex) {
        console.error('>ERROR:', ex)
        return {error:ex.message}
    }
}

async function verifyNFT(eventId, eventUri) {
    showMessage('Scan the qr-code to verify your ticket...')
    try {
        let pkce = new XummPkce(session.appkey)
        //await pkce.logout()
        let auth = await pkce.authorize()
        if(auth?.me){
            showMessage('Verifying, wait a moment...')
            //let xsdk = auth.sdk
            //let jwt  = auth.jwt
            let user = auth.me
            console.log('STATE', auth)
            console.log('USER', user)          // user info and wallet address
            let account = user.account         // rippleAddress
            let neturl  = user.networkEndpoint // wss://xls20-sandbox.rippletest.net:51233
            // user.networkType                // CUSTOM
            console.log(session.neturl)
            if(session.neturl.includes('xls20')){
                console.log('Connected to NFT-DEVNET')
            } else {
                console.log('Not connected to NFT-DEVNET')
            }
            let verified = dateToDB(new Date())
            let dat = {account, eventId, verified}
            console.log(dat)
            let opt = {method:'post', headers: {'content-type': 'application/json'}, body: JSON.stringify(dat)}
            let rec = await fetch('/api/verify', opt)
            let inf = await rec.json()
            console.log('INF', inf)
            if(inf.error){
                showMessage(inf.error)
            } else {
                let num = inf.verified.length
                showMessage(`${num} Ticket${num==1?'':'s'} Verified`)
                for (var i = 0; i < inf.verified.length; i++) {
                    let tix = inf.verified[i]
                    let now = new Date()
                    addTicketToList(tix.account, tix.ticketid, new Date(tix.created), now)
                }
                $('total-verified').innerHTML = parseInt($('total-verified').innerHTML) + num
                return num;
            }
        } else {
            showMessage('Verification rejected by user')
            console.log('User login rejected')
        }
    } catch(ex) {
        console.error(ex)
        console.error('Error:', ex.message)
        showMessage('Error: '+ex.message)
    }
}



function addTicketToList(account, ticketId, minted, verified){
    // Minted   Ticket ID   Account Verified
    let table = $('tickets')
    let body  = table.tBodies[0]
    let row   = `<tr><td>${minted.toLocaleString()}</td><td>${ticketId.substr(40)}</td><td>${account.substr(0,10)}&hellip;</td><td>${verified?.toLocaleString()||'-'}</td></tr>`
    body.innerHTML = row + body.innerHTML
}

async function onClaim(eventId, eventUri) {
    showMessage('Check your XUMM wallet for events and approve the minting...')
    claimButton('WAIT',1)
    let res = await mintNFT(eventId, eventUri)
    console.log('CLAIMED', res)
    claimButton('MINT')
}

async function onVerify(eventId, eventUri) {
    showMessage('Scan a qr-code to verify your attendance...')
    verifyButton('WAIT',1)
    let res = await verifyNFT(eventId, eventUri)
    console.log('VERIFIED', res)
    verifyButton('VERIFY')
}

async function test() {
    // #1
    //let xumm = new XummSdkJwt(session.appkey)
    //let ott = await xumm.getOttData()
    //console.log('OTT', ott)
    //return ott
    // #2
    //let res = await fetch('https://nft-devnet.xrpl.org/transactions/9CAF659DA9088CA9ABE7F05BFF3354CBFED71E7202ACD1849628807845552DC0')
    //let txt = await res.text()
    //console.warn(txt)
}


// END