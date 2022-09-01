import cfddns from 'nodejs-cloudflare-ddns-script'; // ganti njs-cf-ddns.js dengan file yang dibikin
import schedule from 'node-schedule';
import { PrismaClient } from '@prisma/client';
import JSONBig from 'json-bigint';
import express, { response } from "express";
import axios from 'axios';
import qs from 'qs';
import {now, dateFormater, getBearerToken, toIsoString} from './helper.js'

const app = express();

if (process.env.RUN_DNS == "true") {

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

}

if (process.env.RUN_ABSEN == "true") {
	let store;
	
	let prisma;
	let timeStartD = [6,0,0]; // jam, menit, detik
	let timeEndD = [8,0,0]; // jam, menit, detik
	let timeStartP = [16,0,0]; // jam, menit, detik
	let timeEndP = [18,0,0]; // jam, menit, detik

	let isDatang = ( now() >= now().setHours(timeStartD[0],timeStartD[1],timeStartD[2])  && now() <= now().setHours(timeEndD[0],timeEndD[1],timeEndD[2]));
	let isPulang = ( now() >= now().setHours(timeStartP[0],timeStartP[1],timeStartP[2])  && now() <= now().setHours(timeEndP[0],timeEndP[1],timeEndP[2]));

	let timeStart;
	let timeEnd;

	if(isPulang){
		timeStart = now().setHours(timeStartP[0],timeStartP[1],timeStartP[2]);
		timeEnd = now().setHours(timeEndP[0],timeEndP[1],timeEndP[2]);
	}else{
		timeStart = now().setHours(timeStartD[0],timeStartD[1],timeStartD[2]);
		timeEnd = now().setHours(timeEndD[0],timeEndD[1],timeEndD[2]);
	}

	const getJobAbsen = async ( timeStart, timeEnd ) => {
		prisma = new PrismaClient();
		try {
			const absen = await prisma.absen_autos.findMany({
				where: {
					status: 0,
					waktu_absen: {
						gte: new Date(timeStart),
						lt:  new Date(now().setSeconds(60,0))
					},
				},
				select: {
					id: true,
					waktu_absen: true,
					status: true,
					lat: true,
					long: true,
					token: true,
					zona_waktu: true,
					user: {
						select: {
							id: true,
							nama: true,
							username_map: true,
							password_map: true,
							niplama: true,
							imei: true,
						}
					}
				}

			})
			prisma.$disconnect;
			return absen;
		} catch (err) {
			prisma.$disconnect;
			return {message: err.message}
		}
	}

	const updateStatusJob = async ( id, status ) => {

		prisma = new PrismaClient();
		try {
			await prisma.absen_autos.update({
				where: {
					id: id,
				},
				data: {
					status: status,
				}

			})
			prisma.$disconnect;
		} catch (err) {
			prisma.$disconnect;
		}

	}

	const createLog = async ( aktivitas, user_id, nama ) => {

		prisma = new PrismaClient();
		try {
			const log = await prisma.activities.create({
				data: {
					id_user		 : user_id,
					user         : nama,
					nama_kegiatan: aktivitas,
					jumlah       : 1,
					created_at	 : toIsoString(new Date()),
					updated_at	 : toIsoString(new Date())
				}

			})
			return log
			prisma.$disconnect;
		} catch (err) {
			prisma.$disconnect;
			return err.message
		}
		
	}

	const getToken = async (username, password, kelas_user = 0) => {

		const config = {
			headers : {
				'Host' : 'map.bpkp.go.id',
				'User-Agent' : 'okhttp/3.14.9',
				'x-client-id' : 'map_mobile',
				'Content-Type': 'application/x-www-form-urlencoded'
			}
		}

		const response = await axios.post("https://map.bpkp.go.id/api/v3/login", qs.stringify({username: username, password: password, kelas_user: kelas_user}), config)				

		return response;
	}

	const startJobAbsen = async (jobData) => {

		const jobId = jobData.id
		const username = jobData?.user.username_map;
		const password = jobData?.user.password_map;
		const niplama = jobData?.user.niplama;
		const id_user = jobData?.user.id;
		const nama = jobData?.user.nama;
		const lat = jobData?.lat;
		const long = jobData?.long;
		const timeZone = jobData.zona_waktu == 'WIB' ? 7 : (jobData.zona_waktu == 'WITA' ? 8 : 9);
		const imei = jobData?.user.imei;
		const waktu_absen = jobData?.waktu_absen;
		const wfh = false;
		const mode = 0;
		let token = jobData?.token;

		const checkAUth = async () => {
			
			return await axios.get(`https://map.bpkp.go.id/api/v1/backlog/aktivitas?api_token=${token}`)
				.then((response) => {
					return true
				}).catch((err) => {
					if (err.response.status == 401){
						return getToken(username, password).then((response) => {
							// save new  token
							token = response.data.api_token

							if (response.status == 200 ){
								return true
							} else {
								return false
							}

						}).catch( err => {
							return false
						})
					}else {
						return false
					}
				})
		} 
		
		if ( await checkAUth() ) {

			////////// Kesehatan ///////////

			const checkKesehatan = await axios.get(`https://map.bpkp.go.id/api/v3/covid/${niplama}?api_token=${token}&today=true`).then((response)=>{
				if(Object.keys(response.data.result).length == 0){
					return true
				}else{
					return false
				}
			}).catch((err) => {
				return false
			})

			if (checkKesehatan) {
				
				const data = {
					gejala	: [
					  1
					],
					komorbid: [],
					niplama : niplama,
					status  : 1
				};

				const config = {
					headers : {
						'Host' : 'map.bpkp.go.id',
						'User-Agent' : 'okhttp/3.14.9',
						'x-client-id' : 'map_mobile',
						'Content-Type': 'application/json'
					}
				}

				await axios.post(`https://map.bpkp.go.id/api/v3/covid?api_token=${token}`, data, config)

			}

			////////// End Kesehatan ///////////

			/////////////////////////////////////////////////////////////////////////////////////////////

			////////// Aktivitas ///////////
			let lastAktivitas;
			const checkAktivitas = await axios.get(`https://map.bpkp.go.id/api/v2/kinerjaHarian/${niplama}?start_date=${dateFormater(now().setDate(now().getDate() - 10))}&api_token=${token}`).then((response)=>{
				if(response.data.result.length > 0 && response.data.result[0].tanggal_aktivitas != dateFormater()){
					lastAktivitas = response.data.result[0];
					return true
				}else{
					return false
				}
			}).catch((err) => {
				return false
			})

			if (checkAktivitas) {
				const data = {
					nama_aktivitas: `${lastAktivitas.nama_aktivitas}`,
					tanggal_aktivitas:`${dateFormater()}`,
					id_sasaran: Number(lastAktivitas.id_sasaran),
					id_sub_sasaran: Number(lastAktivitas.id_sub_sasaran),
					lat: `${lat}`,
					long: `${long}`,
				};

				const config = {
					headers : {
						'Host' : 'map.bpkp.go.id',
						'User-Agent' : 'okhttp/3.14.9',
						'x-client-id' : 'map_mobile',
						'Content-Type': 'application/json'
					}
				}

				await axios.post(`https://map.bpkp.go.id/api/v2/saveKinerjaHarian?api_token=${token}`, data, config)
			}

			////////// End Aktivitas ///////////

			/////////////////////////////////////////////////////////////////////////////////////////////

			////////// Absen ///////////

			let checkAbsen = now() >= new Date(waktu_absen);
			if (checkAbsen) {
				const data = {
					niplama: `${niplama}`,
					lat: `${lat}`,
					long: `${long}`,
					imei: `${imei}`,
					is_wfh: wfh,
					gmt_lmfao: timeZone,
					is_fake_gps: false,
					is_tampered_timezone: false,
					mode_presensi: mode,
					sumber: 1
				};

				const config = {
					headers : {
						'Host' : 'map.bpkp.go.id',
						'User-Agent' : 'okhttp/3.14.9',
						'x-client-id' : 'map_mobile',
						'Content-Type': 'application/json',
						'Authorization' : `Bearer ${getBearerToken()}`
					}
				}

				await axios.post(`https://map.bpkp.go.id/api/v5/presensi?api_token=${token}`, data, config).then((response) => {
					if (response.data.success){
						updateStatusJob(jobId,1)
						createLog(`absen ${mode} otomatis`, id_user, nama)
					}
				}).catch((err) => {
					console.log(err.message)
				})
			}

			////////// End Absen ///////////

		}
	}


	const runJobAbsen = () => {
		const job = getJobAbsen(timeStart, timeEnd)
		if ( job.length > 0 && ( isDatang || isPulang )) {
			job.forEach(jobData => {
				if ( now().setSeconds(0,0) >= new Date(jobData.waktu_absen) ) {
					startJobAbsen(jobData)
				}
			});
		}

	}


	app.get('/', (req, res) => {
		getJobAbsen(timeStart, timeEnd).then((response)=>res.json(
			JSON.parse(
				JSONBig.stringify(response)
			)
		)).finally(()=>{
			prisma.$disconnect;
		});
	})

	app.get('/test',  (req, res) => {
		startJobAbsen().then((response) => {
			res.json(store)			
		}).catch( err => {
			res.json(err.message)
		})
	})

	// schedule.scheduleJob('* * * * *', function() {
	// 	runJobAbsen()
	// });

	app.listen(3000)

}