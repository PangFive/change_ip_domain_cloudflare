import * as cfddns from './ddns.js'; // ganti njs-cf-ddns.js dengan file yang dibikin
import schedule from 'node-schedule';
import {runJobAbsen} from './absen.js';
import 'dotenv/config';
import axios from 'axios';

if (process.env.RUN_DNS == "true") {

	const options = {
		"wanIPv4Site": process.env.wanIPv4Site,
			// The website which used to get your current public IPv4 address.
			// Default: https://ipv4.icanhazip.com
		"autoSwitch": false,
			//If you don't have any public IPv6 address
			//program will use IPv4 automaticly or it will throw an exception.
			//Default: false.
		"cfKey": process.env.cfKey,
			//Your Cloudflare API key
		"email": process.env.email,
			//Your Cloudflare email
		"zoneName": process.env.zoneName,
			//Your Cloudflare zone name
		"recordType": process.env.recordType,
			//The type of record you want to update.
			//Default: A
		"recordName": process.env.recordName,
			//The name of the record you want to update.
		"TTL": 60,
			//The TTL of the record you want to update.
			//Default: 60
		"proxied": true
			//Default: false
	}

	const updateDNS = () => {
		cfddns.update(options)
			.then((ret) => {
				console.log(ret);	//true | false
			})
			.catch((err) => {
				console.error(err);
			});
	}

	updateDNS()

	if (process.env.RUN_DNS_SCHEDULE == "true") {
		schedule.scheduleJob('* * * * *', function(){
			updateDNS()
		});
	}

}

if (process.env.RUN_ABSEN == "true") {

	console.log('run task')
	axios.get(process.env.URL_PING_MONITOR)
	
	schedule.scheduleJob('* * * * *', function() {
		axios.get(process.env.URL_PING_MONITOR)
		runJobAbsen()
	});

}