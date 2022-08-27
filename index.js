const cfddns = require('nodejs-cloudflare-ddns-script'); // ganti njs-cf-ddns.js dengan file yang dibikin
const schedule = require('node-schedule');

const options = {
	"wanIPv4Site": "https://ipv4.icanhazip.com",
		// The website which used to get your current public IPv4 address.
		// Default: https://ipv4.icanhazip.com
	"autoSwitch": false,
		//If you don't have any public IPv6 address
		//program will use IPv4 automaticly or it will throw an exception.
		//Default: false.
	"cfKey": "4775db5ba5ca06ae0120ed238e749ac04b07d",
		//Your Cloudflare API key
	"email": "t.wahyu96@gmail.com",
		//Your Cloudflare email
	"zoneName": "takeid.digital",
		//Your Cloudflare zone name
	"recordType": "A",
		//The type of record you want to update.
		//Default: A
	"recordName": "takeid.digital",
		//The name of the record you want to update.
	"TTL": 60,
		//The TTL of the record you want to update.
		//Default: 60
	"proxied": true
		//Default: false
}

schedule.scheduleJob('* * * * *', function(){
    cfddns.update(options)
    	.then((ret) => {
    	  console.log(ret);	//true | false
    	})
    	.catch((err) => {
    	  console.error(err);
    	});
});