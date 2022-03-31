const createRequest = require('./index').createRequest

const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const port = process.env.PORT || 8080

app.use(bodyParser.json())

app.post('/', (req, res) => {
    // console.log(req.body["id"]);
    // console.log(req.body["meta"]['oracleRequest']["data"]);
    req.body["data"] = JSON.parse(req.body["data"]);
    console.log('POST Data: ', req.body)
    createRequest(req.body, (status, result) => {
        console.log('Result: ', result)
        res.status(status).json(result)
    })
})

app.listen(port, () => console.log(`Listening on port ${port}!`))