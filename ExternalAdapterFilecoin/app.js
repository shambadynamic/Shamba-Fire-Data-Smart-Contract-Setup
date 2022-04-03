const axios = require('axios')
require('dotenv').config();
const fs = require('fs');
const { Web3Storage, getFilesFromPath } = require('web3.storage');

async function append_url_to_cid_list(cid_url) {
    const path = "cid_list.json";

    if (fs.existsSync(path)) {


        fs.readFile(path, (err, data) => {
            if (err) {
                console.log(err);
                return false;
            };

            var data = JSON.parse(data.toString());
            data.urls.push(cid_url);
            return fs.writeFile(path, JSON.stringify(data), (err, result) => {
                if (err) {
                    console.log(err);
                    return false;
                }
                return true;

            });
        });
    } else {


        var data = {
            urls: [cid_url]
        };
        return fs.writeFile(path, JSON.stringify(data), async function(err) {

            if (err) {
                console.log("An error occured while writing CID to JSON File.");
                console.log(err);

                return false;


            }
            return true;
        })

    }
}

const retrieve_cid_urls_list = (callback) => {
    const path = "cid_list.json";

    if (fs.existsSync(path)) {

        fs.readFile(path, async(err, data) => {
            if (err) {
                console.log(err);
                callback({ "urls": [] });
            };

            var json_data = JSON.parse(data.toString());
            callback(json_data);
        });

    } else {
        callback({ "urls": [] });

    }
}

const createRequest = (input, callback) => {

    const jobRunID = input['id']
    var tx_hash = ''
    var contract_address = ''
    var operator_address = ''

    if ('tx_hash' in input) {
        tx_hash = input['tx_hash']
    }

    if ('contract_address' in input) {
        contract_address = input['contract_address']
    }

    if ('operator_address' in input) {
        operator_address = input['operator_address']
    }

    const endpoint = 'fire-analysis'

    const url = `https://shamba-gateway-staging-2ycmet71.ew.gateway.dev/geoapi/v1/${endpoint}`

    const dataset_code = input['data']['dataset_code']
    const selected_band = input['data']['selected_band']
    const geometry = input['data']['geometry']
    const start_date = input['data']['start_date']
    const end_date = input['data']['end_date']
    const image_scale = input['data']['image_scale']

    const data = {
        dataset_code,
        selected_band,
        geometry,
        start_date,
        end_date,
        image_scale,
    }

    axios
        .post(url, data)
        .then(res => {
            if (res.status == 200) {
                var datetime = new Date();

                res.data.jobRunID = jobRunID
                res.data.result = []
                var agg_fire_detected = res.data['data']['detection']
                for (var i = 0; i < agg_fire_detected.length; i++) {
                    if (agg_fire_detected[i]['fire_detected'] == true) {
                        res.data.result.push(1)
                    } else {
                        res.data.result.push(9)
                    }

                }

                var fire_detection_array = res.data.result


                res.data.statusCode = res.status
                res.data.data = {
                    "result": agg_fire_detected,
                }

                delete res.data.success
                delete res.data.error
                delete res.data.data_token
                delete res.data.duration


                const web3_json_data = {
                    "request": {

                        "dataset_code": dataset_code,
                        "selected_band": selected_band,
                        "geometry": geometry,
                        "start_date": start_date,
                        "end_date": end_date,
                        "image_scale": image_scale
                    },
                    "response": {
                        "datetime": datetime.toISOString(),
                        "result": fire_detection_array,
                        "contract_address": contract_address,
                        "operator_address": operator_address,
                        "tx_hash": tx_hash
                    }
                }

                path = "data.json"
                const jsonContent = JSON.stringify(web3_json_data);

                if (fs.existsSync(path)) {
                    fs.readFile(path, (err, fileData) => {
                        var data = JSON.parse(fileData.toString());
                        if (web3_json_data.response.tx_hash !== data.response.tx_hash) {


                            try {

                                fs.writeFile(path, jsonContent, async function(err) {
                                    if (err) {
                                        console.log("An error occured while writing JSON Object to File.");
                                        console.log(err);
                                        var res = {
                                            "status": 403,
                                            "data": {
                                                "jobRunID": jobRunID,
                                                "status": "errored",
                                                "error": {
                                                    "name": "Unable to write data to the json file",
                                                },
                                                "statusCode": 403
                                            }

                                        }

                                        callback(res.status, res.data)


                                    } else {
                                        console.log("JSON file has been saved.");
                                        const token = process.env.TOKEN;

                                        console.log(token);

                                        const storage = new Web3Storage({ token })

                                        const file = await getFilesFromPath(path);

                                        const cid = await storage.put(file)
                                        console.log('Content added with CID:', cid)


                                        const is_cid_url_appended = append_url_to_cid_list(`https://dweb.link/ipfs/${cid}/data.json`);

                                        if (is_cid_url_appended) {
                                            var res = {
                                                "status": 200,
                                                "data": {
                                                    "jobRunID": jobRunID,
                                                    "status": "success",
                                                    "result": { "cid": cid, "fire_detection_array": fire_detection_array },
                                                    "message": `Data successfully uploaded to https://dweb.link/ipfs/${cid}`,
                                                    "statusCode": 200
                                                }

                                            }

                                        } else {
                                            var res = {
                                                "status": 410,
                                                "data": {
                                                    "jobRunID": jobRunID,
                                                    "status": "errored",
                                                    "error": {
                                                        "name": "Unable to write cid-url to the json file",
                                                    },
                                                    "statusCode": 410
                                                }

                                            }

                                        }

                                        callback(res.status, res.data)

                                    }
                                });
                            } catch (e) {
                                var res = {
                                    "status": 405,
                                    "data": {
                                        "jobRunID": jobRunID,
                                        "status": "errored",
                                        "error": {
                                            "name": "Unable to upload data to web3 store",
                                        },
                                        "statusCode": 405
                                    }

                                }

                                callback(res.status, res.data)
                            }

                        } else {
                            if (fs.existsSync(path)) {
                                fs.readFile("cid_list.json", async(err, data) => {

                                    var json_data = JSON.parse(data.toString());
                                    var json_data_url = json_data.urls[json_data.urls.length - 1].toString().replace('/data.json', '')
                                    var url_arr = json_data_url.split('/')
                                    var cid_value = url_arr[url_arr.length - 1]
                                    var res = {
                                        "status": 200,
                                        "data": {
                                            "jobRunID": jobRunID,
                                            "status": "success",
                                            "result": { "cid": cid_value, "fire_detection_array": fire_detection_array },
                                            "message": `Data successfully uploaded to ${json_data_url}`,
                                            "statusCode": 200
                                        }

                                    }
                                    callback(res.status, res.data)
                                });
                            } else {
                                try {

                                    fs.writeFile(path, jsonContent, async function(err) {
                                        if (err) {
                                            console.log("An error occured while writing JSON Object to File.");
                                            console.log(err);
                                            var res = {
                                                "status": 403,
                                                "data": {
                                                    "jobRunID": jobRunID,
                                                    "status": "errored",
                                                    "error": {
                                                        "name": "Unable to write data to the json file",
                                                    },
                                                    "statusCode": 403
                                                }

                                            }

                                            callback(res.status, res.data)


                                        } else {
                                            console.log("JSON file has been saved.");
                                            const token = process.env.TOKEN;

                                            console.log(token);

                                            const storage = new Web3Storage({ token })

                                            const file = await getFilesFromPath(path);

                                            const cid = await storage.put(file)
                                            console.log('Content added with CID:', cid)


                                            const is_cid_url_appended = append_url_to_cid_list(`https://dweb.link/ipfs/${cid}/data.json`);

                                            if (is_cid_url_appended) {
                                                var res = {
                                                    "status": 200,
                                                    "data": {
                                                        "jobRunID": jobRunID,
                                                        "status": "success",
                                                        "result": { "cid": cid, "fire_detection_array": fire_detection_array },
                                                        "message": `Data successfully uploaded to https://dweb.link/ipfs/${cid}`,
                                                        "statusCode": 200
                                                    }

                                                }

                                            } else {
                                                var res = {
                                                    "status": 410,
                                                    "data": {
                                                        "jobRunID": jobRunID,
                                                        "status": "errored",
                                                        "error": {
                                                            "name": "Unable to write cid-url to the json file",
                                                        },
                                                        "statusCode": 410
                                                    }

                                                }

                                            }

                                            callback(res.status, res.data)

                                        }
                                    });
                                } catch (e) {
                                    var res = {
                                        "status": 405,
                                        "data": {
                                            "jobRunID": jobRunID,
                                            "status": "errored",
                                            "error": {
                                                "name": "Unable to upload data to web3 store",
                                            },
                                            "statusCode": 405
                                        }

                                    }

                                    callback(res.status, res.data)
                                }
                            }
                        }

                    });
                } else {
                    console.log('here')
                    try {

                        fs.writeFile(path, jsonContent, async function(err) {
                            if (err) {
                                console.log("An error occured while writing JSON Object to File.");
                                console.log(err);
                                var res = {
                                    "status": 403,
                                    "data": {
                                        "jobRunID": jobRunID,
                                        "status": "errored",
                                        "error": {
                                            "name": "Unable to write data to the json file",
                                        },
                                        "statusCode": 403
                                    }

                                }

                                callback(res.status, res.data)


                            } else {
                                console.log("JSON file has been saved.");
                                const token = process.env.TOKEN;

                                console.log(token);

                                const storage = new Web3Storage({ token })

                                const file = await getFilesFromPath(path);

                                const cid = await storage.put(file)
                                console.log('Content added with CID:', cid)


                                const is_cid_url_appended = append_url_to_cid_list(`https://dweb.link/ipfs/${cid}/data.json`);

                                if (is_cid_url_appended) {
                                    var res = {
                                        "status": 200,
                                        "data": {
                                            "jobRunID": jobRunID,
                                            "status": "success",
                                            "result": { "cid": cid, "fire_detection_array": fire_detection_array },
                                            "message": `Data successfully uploaded to https://dweb.link/ipfs/${cid}`,
                                            "statusCode": 200
                                        }

                                    }

                                } else {
                                    var res = {
                                        "status": 410,
                                        "data": {
                                            "jobRunID": jobRunID,
                                            "status": "errored",
                                            "error": {
                                                "name": "Unable to write cid-url to the json file",
                                            },
                                            "statusCode": 410
                                        }

                                    }

                                }

                                callback(res.status, res.data)

                            }
                        });
                    } catch (e) {
                        var res = {
                            "status": 405,
                            "data": {
                                "jobRunID": jobRunID,
                                "status": "errored",
                                "error": {
                                    "name": "Unable to upload data to web3 store",
                                },
                                "statusCode": 405
                            }

                        }

                        callback(res.status, res.data)
                    }
                }

            } else {
                res.data = {
                    "jobRunID": [jobRunID],
                    "status": "errored",
                    "error": {
                        "name": "AdapterError",
                    },
                    "statusCode": [res.status]
                }
                callback(res.status, res.data)

            }
            console.log(`statusCode: ${res.status}`)


        })
        .catch(error => {
            console.error(error)
            var res = {
                "status": 400,
                "data": {
                    "jobRunID": jobRunID,
                    "status": "errored",
                    "error": {
                        "name": "AdapterError",
                    },
                    "statusCode": 400
                }

            }

            callback(res.status, res.data)
        })

}

module.exports.createRequest = createRequest
module.exports.retrieve_cid_urls_list = retrieve_cid_urls_list