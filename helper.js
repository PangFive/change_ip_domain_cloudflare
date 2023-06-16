import fernet from "fernet";
import "dotenv/config";
import fs from "fs";
import os from "os";

const now = () => new Date();

const setEnvValue = (key, value) => {
  // read file from hdd & split if from a linebreak to a array
  const ENV_VARS = fs.readFileSync("./.env", "utf8").split(os.EOL);

  // find the env we want based on the key
  const target = ENV_VARS.indexOf(
    ENV_VARS.find((line) => {
      return line.match(new RegExp(key));
    })
  );

  // replace the key/value with the new value
  ENV_VARS.splice(target, 1, `${key}=${value}`);

  // write everything back to the file system
  fs.writeFileSync("./.env", ENV_VARS.join(os.EOL));
};

const getEnvValue = (key) => {
  const ENV_VARS = fs.readFileSync("./.env", "utf8").split(os.EOL);

  const target = ENV_VARS.indexOf(
    ENV_VARS.find((line) => {
      return line.match(new RegExp(key));
    })
  );

  // replace the key/value with the new value
  // ENV_VARS.splice(target, 1, `${key}=${value}`);
  return ENV_VARS[target].split("=")[1];
};

const dateFormater = (time = new Date()) => {
  let today = new Date(time);

  let dd = today.getDate();
  let mm = today.getMonth() + 1;
  let yyyy = today.getFullYear();

  if (dd < 10) {
    dd = "0" + dd;
  }

  if (mm < 10) {
    mm = "0" + mm;
  }
  today = yyyy + "-" + mm + "-" + dd;

  return String(today);
};

function getRandomArbitrary(min, max) {
  if (min <= max) {
    return Math.random() * (max - min) + min;
  } else {
    return Math.random() * (min - max) + max;
  }
}

const getBearerToken = () => {
  try {
    var secret = new fernet.Secret(
      "YXKuFIV17g0Pcv2FqDvQ4HfC-2-iWO_ZxxxvViVMo44="
    );

    var token = new fernet.Token({
      secret: secret,
      time: Date.parse(1),
      iv: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    });

    token.encode(
      "rQ5Y3nNdnnrL7JUTY7ePO2uj9z4s8I2onL4eql6H5rUcVhNFvGuAIaLRFsEYVx1I"
    );
    return token.token;
  } catch (err) {
    var resErr = {
      status: "error",
      message: err.message,
      data: err?.data,
    };
    return resErr;
  }
};

const toIsoString = (date) => {
  const pad = (num) => {
    return (num < 10 ? "0" : "") + num;
  };

  return (
    date.getFullYear() +
    "-" +
    pad(date.getMonth() + 1) +
    "-" +
    pad(date.getDate()) +
    "T" +
    pad(date.getHours()) +
    ":" +
    pad(date.getMinutes()) +
    ":" +
    pad(date.getSeconds()) +
    "." +
    "000" +
    "Z"
  );
};

const adjustTimeZone = (dateTime) => {
  let base = new Date(dateTime);

  let adjust = base.getHours() + Number(process.env.ADJUST_TIME);

  return new Date(base.setHours(adjust));
};

const envTime = (time) => {
  let array = time.split(":");

  let result = [];

  array.forEach((element) => {
    result.push(Number(element));
  });

  return result;
};

export {
  now,
  dateFormater,
  getBearerToken,
  toIsoString,
  adjustTimeZone,
  envTime,
  getRandomArbitrary,
  setEnvValue,
  getEnvValue,
};
