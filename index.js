const express = require("express")
const cors = require("cors")
require('dotenv').config()
const { MongoClient, ServerApiVersion } = require('mongodb');
const jwt = require('jsonwebtoken');

const app = express()
const port = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

app.listen(port, () => {
    console.log(`The Artistic Resales server is running on port ${port}`);
})
app.get('/', (req, res) => {
    res.send("The Artistic Resales server is running")
})




const uri = process.env.DB_URL
// console.log(uri)
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const run = async () => {


}

run().catch(err => { console.log(err) })
