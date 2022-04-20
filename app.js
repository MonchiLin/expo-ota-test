const os = require("os")

const express = require('express')
const manifestEndpoint = require("./api/manifest");
const assetsEndpoint = require("./api/assets");
const app = express()

app.get('/', function (req, res) {
    res.send('Hello World')
})

app.get('/api/manifest', manifestEndpoint)
app.get('/api/assets', assetsEndpoint)


app.use(express.static('public'))
app.listen(8000)
