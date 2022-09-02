import fernet from "fernet";
import 'dotenv/config';

const now = (sub=0) => {
    const now = new Date();

    return new Date(now.setHours(now.getHours() + sub))
}

const dateFormater = (time = new Date()) => {
    let today = new Date(time)

    let dd = today.getDate();
    let mm = today.getMonth()+1;
    let yyyy = today.getFullYear();

    if(dd<10)
    {
        dd='0'+dd;
    }

    if(mm<10)
    {
        mm='0'+mm;
    }
    today = yyyy+'-'+mm+'-'+dd;

    return String(today);
}

const getBearerToken = () => {
    try {

        var secret = new fernet.Secret("YXKuFIV17g0Pcv2FqDvQ4HfC-2-iWO_ZxxxvViVMo44=");

        var token = new fernet.Token({
            secret: secret,
            time: Date.parse(1),
            iv: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
        })

        token.encode("rQ5Y3nNdnnrL7JUTY7ePO2uj9z4s8I2onL4eql6H5rUcVhNFvGuAIaLRFsEYVx1I")
        return token.token

    } catch (err) {
        var resErr = {
            status: 'error',
            message: err.message,
            data: err?.data
        };
        return resErr;

    }
}

const toIsoString = (date) => {
    
    const pad = (num) => {
            return (num < 10 ? '0' : '') + num;
        };

    return date.getFullYear() +
        '-' + pad(date.getMonth() + 1) +
        '-' + pad(date.getDate()) +
        'T' + pad(date.getHours()) +
        ':' + pad(date.getMinutes()) +
        ':' + pad(date.getSeconds()) +
        '.' + '000'+
        'Z';
}

export {
    now,
    dateFormater,
    getBearerToken,
    toIsoString
}