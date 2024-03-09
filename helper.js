import fernet from "fernet";
import "dotenv/config";
import fs from "fs";
import os from "os";
import cheerio from "cheerio";

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

const atob = (data) => {
  return Buffer.from(data, "base64").toString();
};

const btoa = (data) => {
  return Buffer.from(data).toString("base64");
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

const convertCookie = (array) => {
  let result = "";
  const cookieObject = {};

  array.forEach((cookieString) => {
    const [keyValue, ...options] = cookieString.split(";");
    const [key, value] = keyValue.split("=");
    cookieObject[key.trim()] = value.trim();
    // Handling options if any
    options.forEach((option) => {
      const [optionKey, optionValue] = option.trim().split("=");
      cookieObject[optionKey.trim()] = optionValue ? optionValue.trim() : true;
    });
  });

  for (const key in cookieObject) {
    if (cookieObject.hasOwnProperty(key)) {
      result += `${key}=${cookieObject[key]}; `;
    }
  }

  result = result.slice(0, -2);

  const cookieArray = result.split(";");

  const filteredCookieArray = cookieArray.filter((attribute) => {
    return (
      !attribute.includes("path") &&
      !attribute.includes("HttpOnly") &&
      !attribute.includes("samesite")
    );
  });

  const filteredCookieString = filteredCookieArray.join(";");

  return filteredCookieString;
};

const getJsonData = (html) => {
  const $ = cheerio.load(html);

  var table = $("#w1 .table-striped");

  var thead = $(table).find("thead");
  var tbody = $(table).find("tbody");

  var rows = $(tbody).find("tr");
  var data = [];

  rows.each((in_daftar, elemen_daftar) => {
    var cells = $(elemen_daftar).find("td");

    var rowData = {
      no: $(cells[0]).text().trim(),
      check_clock: $(cells[1]).text().trim(),
      mode_presensi: $(cells[2]).text().trim(),
    };

    data.push(rowData);
  });
  return data;
};

function json2string(jsonObject) {
  // Initialize an empty string to store the reconstructed data
  let reconstructedString = "";

  // Iterate over each key-value pair in the JSON object and concatenate them into a string
  Object.keys(jsonObject).forEach((key) => {
    reconstructedString += `${key}:${jsonObject[key]}|`;
  });

  // Remove the trailing '|' character
  reconstructedString = reconstructedString.slice(0, -1);

  return reconstructedString;
}

function string2json(dataString) {
  // Split the string into an array of key-value pairs
  const keyValuePairs = dataString.split("|");

  // Initialize an empty object to store key-value pairs
  const jsonObject = {};

  // Iterate over each key-value pair and construct the JSON object
  keyValuePairs.forEach((pair) => {
    const data = pair.split(":");
    const key = data.shift();
    let value;
    if (data.length > 1) {
      value = data.join(":"); // Split each pair into key and value
    } else {
      value = data.join(); // Split each pair into key and value
    }
    jsonObject[key] = value; // Add key-value pair to the JSON object
  });

  return jsonObject;
}

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
  convertCookie,
  getJsonData,
  atob,
  btoa,
  string2json,
  json2string,
};
