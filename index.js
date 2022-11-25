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
    const usersCollection = client.db("TheArtisticResalesDB").collection("artisticUserDB")
    try {
        app.post('/users', async (req, res) => {
            const user = req.body
            // console.log(user)
            const storedUser = await usersCollection.findOne(user)
            if (storedUser) {
                // console.log(storedUser);
                return res.send({ acknowledged: true })
            }
            const result = await usersCollection.insertOne(user)
            // console.log(result);
            res.send(result)
        })

        app.get('/jwt', async (req, res) => {
            const email = req.query.email
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: "10h" });
                return res.send({ accessToken: token })
            }
            return res.status(403).send({ accessToken: "" })
        })

    }
    finally {

    }

}

run().catch(err => { console.log(err) })
