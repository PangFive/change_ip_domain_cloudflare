import { PrismaClient } from '@prisma/client';
import JSONBig from 'json-bigint';
import axios from 'axios';
import qs from 'qs';
import 'dotenv/config';
import {now, dateFormater, getBearerToken, toIsoString, adjustTimeZone, envTime} from './helper.js'

const getJobAbsen = async ( timeStart, timeEnd ) => {

    let prisma
  
    if (!global.prisma) {
        global.prisma = new PrismaClient()
    }

    prisma = global.prisma

    try {
        const absen = await prisma.absen_autos.findMany({
            where: {
                status: 0,
                waktu_absen: {
                    gte: new Date(timeStart),
                    lt:  new Date(timeEnd)
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
        return JSONBig.parse(JSONBig.stringify(absen));
    } catch (err) {
        return {message: err.message}
    }
}

const updateStatusJob = async ( id, status ) => {

    const prisma = new PrismaClient();
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

    const prisma = new PrismaClient();
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
        prisma.$disconnect;
        return log
    } catch (err) {
        prisma.$disconnect;
        return err.message
    }
    
}

const getToken = async (username, password, kelas_user = 0) => {

    const config = {
        headers : {
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
            if(response.data.result == null){
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

        const checkAbsen = adjustTimeZone(now()) >= new Date(waktu_absen);
        if (checkAbsen) {
            const data = {
                niplama: `${niplama}`,
                lat: `${parseFloat(lat).toFixed(6)}`,
                long: `${parseFloat(long).toFixed(6)}`,
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
                    'User-Agent' : 'okhttp/3.14.9',
                    'x-client-id' : 'map_mobile',
                    'Content-Type': 'application/json',
                    'Authorization' : `Bearer ${getBearerToken()}`
                }
            }

            await axios.post(`https://map.bpkp.go.id/api/v5/presensi?api_token=${token}`, data, config).then((response) => {
                if (response.data.success){
                    updateStatusJob(jobId,1)
                    createLog(`absen ${mode == 0 ? 'WFO' : (mode == 1 ? 'WFH' : 'DL')} otomatis`, id_user, nama)
                }
            }).catch((err) => {
                if (err.response.status != 401) {
                    updateStatusJob(jobId,2)
                }
            })
        }

        ////////// End Absen ///////////

    }
}

const runJobAbsen = async () => {

    let timeStartD = envTime(process.env.S_DATANG); // jam, menit, detik
    let timeEndD = envTime(process.env.E_DATANG); // jam, menit, detik
    let timeStartP = envTime(process.env.S_PULANG); // jam, menit, detik
    let timeEndP = envTime(process.env.E_PULANG); // jam, menit, detik

    let isDatang = ( now() >= now().setHours(timeStartD[0],timeStartD[1],timeStartD[2])  && now() <= now().setHours(timeEndD[0],timeEndD[1],timeEndD[2]));
    let isPulang = ( now() >= now().setHours(timeStartP[0],timeStartP[1],timeStartP[2])  && now() <= now().setHours(timeEndP[0],timeEndP[1],timeEndP[2]));

    let timeStart;
    let timeEnd;

    if(isPulang){
        timeStart = adjustTimeZone(now().setHours(timeStartP[0],timeStartP[1],timeStartP[2]));
        // timeEnd = adjustTimeZone(now().setHours(timeEndP[0],timeEndP[1],timeEndP[2]));
        timeEnd = adjustTimeZone(now().setSeconds(60,0));
    }else{
        timeStart = adjustTimeZone(now().setHours(timeStartD[0],timeStartD[1],timeStartD[2]));
        // timeEnd = adjustTimeZone(now().setHours(timeEndD[0],timeEndD[1],timeEndD[2]));
        timeEnd = adjustTimeZone(now().setSeconds(60,0))
    }

    let job = [];

    if(isDatang || isPulang){
        job = await getJobAbsen(timeStart, timeEnd)
    }

    if ( job.length > 0 && ( isDatang || isPulang )) {
        job.forEach(jobData => {
            if ( adjustTimeZone(now().setSeconds(0,0)) >= new Date(jobData.waktu_absen) ) {
                startJobAbsen(jobData)
            }
        });
    }

}

export { runJobAbsen }