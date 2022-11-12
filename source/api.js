// API

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const xrpl  = require('xrpl')

let config = {
	neturl: 'wss://xls20-sandbox.rippletest.net:51233',
	network: 'nft-devnet',
	brokerFee: 10000
}

let brokerKey = process.env.BROKERKEY;
let issuerKey = process.env.ISSUERKEY;


//-- UTILS

// Used to include event info as Memo in a token
// Given an object it will loop for key:value pairs
// Key:value pairs will be converted to hex as defined in Memo specs
// Returns an array of Memo objects with MemoType:MemoData elements
function parseMemo(obj){
	let res = []
	for(var key in obj){
		if(!obj[key]){ continue; }
		let typ = xrpl.convertStringToHex(key)
		let dat = xrpl.convertStringToHex(obj[key].toString())
		if(dat){
			res.push({Memo:{MemoType:typ, MemoData:dat}})
		}
	}
	return res;
}

// Used to get transaction info including token ID
// Just pass the transaction hash
// If not found will return null
async function getTransaction(txid) {
    try {
		let res = await fetch('https://gu3ss.com/api/tx/'+txid) // temp rippled proxy
		let inf = await res.json()
		return inf
    } catch(ex) {
		console.error('Error getting transaction', txid)
        console.error(ex)
    }
}

// Used to get transaction info including token ID
// Just pass the transaction hash
// If not found will return null
async function getTransactionX(txid) {
    try {
        let opt = {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({method: 'tx', params: [{transaction: txid, binary: false}]})
        }
        let url = process.env.NETRPC
        let res = await fetch(url, opt)
        let inf = await res.json()
        return inf
    } catch(ex) {
		console.error('Error getting transaction', txid)
        console.error(ex)
    }
}

// After minting a token, parses the response to get the token ID
// Loops all affected nodes looking for a token in final not in previous
// If a node is found, that's the token ID freshly minted
function getTokenId(info, uri){
    let found = null
    for (var i=0; i<info.result.meta.AffectedNodes.length; i++) {
        let node = info.result.meta.AffectedNodes[i]
        if(node.ModifiedNode && node.ModifiedNode.LedgerEntryType=='NFTokenPage'){
            let m = node.ModifiedNode.FinalFields.NFTokens.length
            let n = node.ModifiedNode.PreviousFields.NFTokens.length
            for (var j=0; j<m; j++) {
                let tokenId = node.ModifiedNode.FinalFields.NFTokens[j].NFToken.NFTokenID
                found = tokenId
                for (var k=0; k<n; k++) {
                    if(tokenId==node.ModifiedNode.PreviousFields.NFTokens[k].NFToken.NFTokenID){
                        found = null
                        break
                    }
                }
                if(found){ break }
            }
        }
        if(found){ break }
    }
    return found
}

// Mints event master ticket
// Event info and uri are required
// Returns tokenId
async function mintNFT(uri, event) {
	console.warn('Minting...')
	let wallet = xrpl.Wallet.fromSeed(brokerKey)
	let client = new xrpl.Client(config.neturl)
	await client.connect()
	let flags  = 11    // burnable, resellable, transferable
	let trxFee = '12'  // drops per tx
	let xfrFee = 10000 // 10% on sales for issuer
	let xUri   = xrpl.convertStringToHex(uri)
	let tx = {
		TransactionType: 'NFTokenMint',
		Account:         wallet.classicAddress,
		URI:             xUri,
		Flags:           flags,
		Fee:             trxFee,
		TransferFee:     xfrFee,
		NFTokenTaxon:    parseInt(event.eventid),
		Memos:           parseMemo(event)
	}
	let info = await client.submitAndWait(tx,{wallet})
    console.warn('Result:', info?.result?.meta?.TransactionResult)
    let tokenId = null;
    if(info?.result?.meta?.TransactionResult=='tesSUCCESS'){
    	tokenId = getTokenId(info, xUri)
    	console.warn('TokenId:', tokenId)
    }
	client.disconnect()
    return tokenId
}

// Mints event ticket for an account
// Issuer is required, will mint ticket for that account
// Issuer must approve minter beforehand
// Event id and uri are required
async function claimNFT(uri, eventid, account, usertoken) {
	console.warn('Claiming...')
	let wallet = xrpl.Wallet.fromSeed(brokerKey)
	let client = new xrpl.Client(config.neturl)
	await client.connect()
	let flags  = 11    // burnable, resellable, transferable
	let trxFee = '12'  // drops per tx
	let xfrFee = 10000 // 10% on sales for issuer
	let xUri   = xrpl.convertStringToHex(uri)
	let tx = {
		TransactionType: 'NFTokenMint',
		//Account:         wallet.classicAddress,
		Account:         account,
		Issuer:          account,
		URI:             xUri,
		Flags:           flags,
		Fee:             trxFee,
		TransferFee:     xfrFee,
		NFTokenTaxon:    parseInt(eventid)
	}
	let tokenId = null;
	try {
		let info = await client.submitAndWait(tx,{wallet})
	    console.warn('Result:', info?.result?.meta?.TransactionResult)
	    if(info?.result?.meta?.TransactionResult=='tesSUCCESS'){
	    	tokenId = getTokenId(info, xUri)
	    	console.warn('TokenId:', tokenId)
	    } else {
	    	return {error:'Error claiming token'}
	    }
	} catch(ex) {
		console.error('Error:', ex.message)
		console.error(ex)
	    return {error:ex.message}
	} finally {
		client.disconnect()
	}
    return {success:true,tokenId:tokenId}
}

module.exports = { 
	getTransaction, 
	getTokenId, 
	mintNFT, 
	claimNFT 
}


// END