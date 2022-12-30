export function getV4(wanIPSite) {
	return new Promise((resolve) => {
		fetch(wanIPSite || 'https://ipv4.icanhazip.com')
			.then((res) => res.text())
			.then((text) => {
				resolve(text.toString().replace(/[\r\n]/g, ''));
			});
	});
}
export async function update(option) {
	let config = option;
	if (config == undefined) {
		try {
			config = require('./config.json');
		} catch (error) {
			throw new Error('Cannot read configuration!', error);
		}
	}
	let IP;
	if (
		config.recordType == 'A' ||
		config.recordType == undefined ||
		(config.autoSwitch == true && IP == undefined)
	) {
		IP = await this.getV4(config['wanIPv4Site']);
	}
	if (!IP) {
		throw new Error('Unsupported Record/Cannot get IP!');
	}
	const cfZoneIdJSON = await (
		await fetch(
			`https://api.cloudflare.com/client/v4/zones?name=${config.zoneName}`,
			{
				method: 'GET',
				headers: {
					'X-Auth-Email': config.email,
					'X-Auth-Key': config.cfKey,
				},
			}
		)
	).json();
	if (cfZoneIdJSON.success == false) {
		throw new Error(cfZoneIdJSON.errors[0].message);
	}
	if (!cfZoneIdJSON.result[0]) {
		throw new Error('No such zone!');
	}
	const cfZoneId = cfZoneIdJSON.result[0].id;
	const cfRecordIdJSON = await (
		await fetch(
			`https://api.cloudflare.com/client/v4/zones/${cfZoneId}/dns_records?name=${config.recordName}`,
			{
				method: 'GET',
				headers: {
					'X-Auth-Email': config.email,
					'X-Auth-Key': config.cfKey,
				},
			}
		)
	).json();
	if (cfRecordIdJSON.success == false) {
		throw new Error(cfZoneIdJSON.errors[0].message);
	}
	if (!cfRecordIdJSON.result[0]) {
		throw new Error('No such record!');
	}
	if(cfRecordIdJSON.result[0].content != IP){

		const cfRecordId = cfRecordIdJSON.result[0].id;
		const cfDdnsResult = await (
			await fetch(
				`https://api.cloudflare.com/client/v4/zones/${cfZoneId}/dns_records/${cfRecordId}`,
				{
					method: 'PUT',
					headers: {
						'X-Auth-Email': config.email,
						'X-Auth-Key': config.cfKey,
						'content-type': 'application/json',
					},
					body: JSON.stringify({
						id: cfZoneId,
						type: config.recordType || 'A',
						name: config.recordName,
						content: IP,
						proxied: config.proxied,
						ttl: config.TTL || 60,
					}),
				}
			)
		).json();
		if (!cfDdnsResult.success) {
			throw new Error('Cannot update DDNS!', cfDdnsResult);
		}
		return cfDdnsResult.success;

	}else {
		return 'Same IP';
	}
}
