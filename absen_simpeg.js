import JSONBig from "json-bigint";
import axios from "axios";
import qs from "qs";
import "dotenv/config";
import {
  now,
  dateFormater,
  getRandomArbitrary,
  getBearerToken,
  toIsoString,
  adjustTimeZone,
  envTime,
  atob,
  string2json,
  json2string,
} from "./helper.js";

import { updateToken, createLog, updateStatusJob } from "./absen.js";

const getToken = async (username, password, token, id_user) => {
  const config = {
    headers: {
      "x-host": "simpeg.batam.go.id",
      Authorization: "Basic " + token,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  };

  const data = {
    username: username,
    password: password,
  };

  const response = await axios
    .post("https://simpeg.batam.go.id/main/login", data, config)
    .then(function (response) {
      if (
        !response.data.error &&
        response.data.error != "Nama Pengguna atau Kata Sandi tidak sah."
      ) {
        let authkey = response.data.token;
        updateToken(id_user, authkey);

        return updateAuthkey(token, authkey);
      }
    });

  return response;
};

const updateAuthkey = (token, authkey) => {
  let dataToken = qs.parse(atob(token));
  dataToken.authkey = authkey;
  return btoa(qs.stringify(dataToken));
};

const startJobAbsenSimpeg = async (jobData, isDatang, isPulang) => {
  const username = jobData?.user.username_map;
  const password = jobData?.user.password_map;
  const id_user = jobData?.user.id;
  const nama = jobData?.user.nama;
  let authkey = jobData?.user.tokenmap;
  const deviceInfo = string2json(jobData?.user.deviceinfo);
  let [token, id_event] = atob(jobData?.token).split("&id_event=");
  token = updateAuthkey(btoa(token), authkey);

  const jobId = jobData.id;
  const long = jobData?.long;
  const lat = jobData?.lat;
  const waktu_absen = jobData?.waktu_absen;

  const mode = isDatang ? "0" : "1";
  let validToAbsen = true;

  const checkAUth = async () => {
    const config = {
      headers: {
        "x-host": "simpeg.batam.go.id",
        Authorization: "Basic " + token,
      },
    };
    try {
      return await axios
        .get("https://simpeg.batam.go.id/main/login", config)
        .then((response) => {
          if (response.data.error == "Token tidak sah, silahkan login.") {
            const error = new Error("tidak memiliki otoritas");
            error.response = { status: 401 };
            throw error;
          }
          return true;
        });
    } catch (err) {
      if (err.response.status == 401) {
        return getToken(username, password, token, id_user)
          .then((response) => {
            // save new  token
            token = response;
            if (token) {
              return true;
            } else {
              return false;
            }
          })
          .catch((err) => {
            return false;
          });
      } else {
        return false;
      }
    }
  };

  if (await checkAUth()) {
    ////////// Absen ///////////

    const checkAbsen = adjustTimeZone(now()) >= new Date(waktu_absen);
    if (checkAbsen && validToAbsen) {
      let data = {
        "position[location]": `${lat},${long}`,
        "position[checktype]": mode,
        "position[device_info]": json2string(deviceInfo),
        "position[event_id]": `${id_event}`,
        "position[device_id]": deviceInfo.ANDROID_ID,
      };

      const config = {
        headers: {
          "x-host": "simpeg.batam.go.id",
          Authorization: "Basic " + token,
          "Content-Type": "application/x-www-form-urlencoded",
          "x-simpeg": "simpeg",
        },
      };

      await axios
        .post(
          "https://simpeg.batam.go.id/wdms/position/create",
          qs.stringify(data),
          config
        )
        .then((response) => {
          if (!response.data.error) {
            updateStatusJob(jobId, 1);
            createLog(
              `absen ${isDatang ? "datang" : "pulang"} otomatis`,
              id_user,
              nama
            );
          }
        })
        .catch((err) => {
          if (err.response.status != 502) {
            updateStatusJob(jobId, 2);
          }
        });
    }

    ////////// End Absen ///////////
  }
};

export default startJobAbsenSimpeg;
