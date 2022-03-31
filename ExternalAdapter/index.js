const axios = require('axios')

const createRequest = (input, callback) => {

    const jobRunID = input['id']
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

                console.log(res.data)

                res.data.jobRunID = jobRunID
                res.data.result = []
                var agg_fire_detected = res.data['data']['detection']
                for (var i = 0; i < agg_fire_detected.length; i++) {
                    if (agg_fire_detected[i]['fire_detected'] == true) {
                        res.data.result.push(
                            [agg_fire_detected[i]['id'], 1]
                        )
                    } else {
                        res.data.result.push(
                            [agg_fire_detected[i]['id'], 9]
                        )
                    }

                }


                res.data.statusCode = res.status
                res.data.data = {
                    "result": agg_fire_detected,
                }

                delete res.data.success
                delete res.data.error
                delete res.data.data_token
                delete res.data.duration


                callback(res.status, res.data)
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

// This is a wrapper to allow the function to work with
// GCP Functions
exports.gcpservice = (req, res) => {
    req.body["data"] = JSON.parse(req.body["data"]);
    createRequest(req.body, (statusCode, data) => {
        res.status(statusCode).send(data)
    })
}

// This is a wrapper to allow the function to work with
// AWS Lambda
exports.handler = (event, context, callback) => {
    createRequest(event, (statusCode, data) => {
        callback(null, data)
    })
}

// This is a wrapper to allow the function to work with
// newer AWS Lambda implementations
exports.handlerv2 = (event, context, callback) => {
    createRequest(JSON.parse(event.body), (statusCode, data) => {
        callback(null, {
            statusCode: statusCode,
            body: JSON.stringify(data),
            isBase64Encoded: false
        })
    })
}

// This allows the function to be exported for testing
// or for running in express
module.exports.createRequest = createRequest