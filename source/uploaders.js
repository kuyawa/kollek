// UPLOADERS

// https://github.com/ArweaveTeam/arweave-js
// https://arweave.net/price/1000000   price in AR per byte as 1MB

const Arweave = require('arweave');
const fs   = require('fs');
const path = require('path');
const key  = require('./arkey.js');


//-- ARWEAVE


// Uploads text file to Arweave blockchain
// Takes string to upload as input
// Returns url id of file in Arweave gateway
async function uploadText(text, mime='text/plain'){
	let opt = {
	    host: 'arweave.net', // Hostname or IP address for a Arweave host
	    port: 443,           // Port
	    protocol: 'https',   // Network protocol http or https
	    timeout: 20000,      // Network request timeouts in milliseconds
	    logging: false,      // Enable network request logging
	}
	try {
		console.warn('Uploading...');
		let arweave = Arweave.init(opt);
		let tx = await arweave.createTransaction({ data: text }, key);
		tx.addTag('Content-Type', mime);
		await arweave.transactions.sign(tx, key);
		let uploader = await arweave.transactions.getUploader(tx);
		while (!uploader.isComplete) {
		    await uploader.uploadChunk();
		    console.warn(`${uploader.pctComplete}% complete, ${uploader.uploadedChunks}/${uploader.totalChunks}`);
		}
		console.warn('Done');
		return 'https://arweave.net/'+tx.id;
	} catch(ex) {
		console.warn('Error uploading text')
		console.warn(ex)
		return {error:ex.message};
	}
}

// Uploads image file to Arweave blockchain
// Takes image to upload and mime type as input
// Returns url id of file in Arweave gateway
async function uploadFile(data, mime='image/jpg'){
	let opt = {
	    host: 'arweave.net', // Hostname or IP address for a Arweave host
	    port: 443,           // Port
	    protocol: 'https',   // Network protocol http or https
	    timeout: 20000,      // Network request timeouts in milliseconds
	    logging: false,      // Enable network request logging
	}
	try {
		console.warn('Uploading...');
		let arweave = Arweave.init(opt);
		let tx = await arweave.createTransaction({ data: data }, key);
		tx.addTag('Content-Type', mime);
		await arweave.transactions.sign(tx, key);
		let uploader = await arweave.transactions.getUploader(tx);
		while (!uploader.isComplete) {
		    await uploader.uploadChunk();
		    console.warn(`${uploader.pctComplete}% complete, ${uploader.uploadedChunks}/${uploader.totalChunks}`);
		}
		console.warn('Done');
		return 'https://arweave.net/'+tx.id;
	} catch(ex) {
		console.warn('Error uploading file')
		console.warn(ex)
		return {error:ex.message};
	}
}

module.exports = { uploadText, uploadFile }

// END