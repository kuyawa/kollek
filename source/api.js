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

function parseMemo(obj){
	let res = []
	for(key in obj){
		if(!obj[key]){ continue; }
		let typ = xrpl.convertStringToHex(key)
		let dat = xrpl.convertStringToHex(obj[key].toString())
		//console.warn(key, obj[key].toString())
		//console.warn(typ, dat)
		if(dat){
			res.push({Memo:{MemoType:typ, MemoData:dat}})
		}
	}
	//console.warn('---')
	//console.warn(res)
	return res;
}

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
        //console.warn(inf)
        return inf
    } catch(ex) {
		console.error('Error getting transaction', txid)
        console.error(ex)
    }
}

function getTokenId(info, uri){
	try {
		for (var i = 0; i < info.result.meta.AffectedNodes.length; i++) {
			let node = info.result.meta.AffectedNodes[i]
			if(node.ModifiedNode && node.ModifiedNode.LedgerEntryType=='NFTokenPage'){
				let tkns = node.ModifiedNode.FinalFields.NFTokens
				for (var j = 0; j < tkns.length; j++) {
					if(tkns[j].NFToken.URI==uri){
						return tkns[j].NFToken.NFTokenID
					}
				}
			}
		}
	} catch(ex) {
		console.error('Error getting token id')
		console.error(ex)
	}
}

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
		NFTokenTaxon:    parseInt(event.eventid),  // may use as collection id
		Memos:           parseMemo(event)
	}
	//if(issuerAdr) { tx.Issuer = issuerAdr } // will collect transfer fee for every secondary sale
	let info = await client.submitAndWait(tx,{wallet})
	//console.warn(JSON.stringify(info, null, 4))
    console.warn('Result:', info.result.meta.TransactionResult)
    let tokenId = null;
    if(info.result.meta.TransactionResult=='tesSUCCESS'){
    	tokenId = getTokenId(info, xUri)
    	console.warn('TokenId:', tokenId)
    }
	client.disconnect()
    return tokenId
}

async function claimNFT(uri, eventid, account, usertoken) {
	console.warn('Claiming...')
	let wallet = xrpl.Wallet.fromSeed(brokerKey)
	//let wallet = xrpl.Wallet.fromSeed(issuerKey)
	let client = new xrpl.Client(config.neturl)
	await client.connect()
	let flags  = 11    // burnable, resellable, transferable
	let trxFee = '12'  // drops per tx
	let xfrFee = 10000 // 10% on sales for issuer
	let xUri   = xrpl.convertStringToHex(uri)
//	let tx = {
//		user_token: usertoken,
//		txjson:{
//			TransactionType: 'NFTokenMint',
//			//Account:         wallet.classicAddress,
//			Account:         account,
//			URI:             xUri,
//			Flags:           flags,
//			Fee:             trxFee,
//			TransferFee:     xfrFee,
//			NFTokenTaxon:    parseInt(eventid)
//		}
//	}
	let tx = {
		TransactionType: 'NFTokenMint',
		//Account:         wallet.classicAddress,
		Account:         account,
		URI:             xUri,
		Flags:           flags,
		Fee:             trxFee,
		TransferFee:     xfrFee,
		NFTokenTaxon:    parseInt(eventid)
	}
	//if(issuerAdr) { tx.Issuer = issuerAdr } // will collect transfer fee for every secondary sale
	//console.warn('CFG', config)
	console.warn('TX', tx)
	let tokenId = null;
	try {
		let info = await client.submitAndWait(tx,{wallet})
		//let info = await client.submitAndWait(tx)
		//console.warn(JSON.stringify(info, null, 4))
	    console.warn('Result:', info.result.meta.TransactionResult)
	    if(info.result.meta.TransactionResult=='tesSUCCESS'){
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

module.exports = { getTransaction, getTokenId, mintNFT, claimNFT }

// END