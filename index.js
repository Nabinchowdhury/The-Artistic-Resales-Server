const express = require("express")
const cors = require("cors")
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const verifyJwt = (req, res, next) => {
    const authHeader = req.headers.authorization

    if (!authHeader) {
        return res.status(401).send("Unauthorized Access")
    }

    const token = authHeader.split(" ")[1]

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send("Forbidden Access")
        }
        req.decoded = decoded
    });

    next()
}


const run = async () => {
    const usersCollection = client.db("TheArtisticResalesDB").collection("artisticUserDB")

    const verifyAdmin = async (req, res, next) => {
        const decodedEmail = req.decoded.email
        const query = { email: decodedEmail }
        const user = await usersCollection.findOne(query)
        if (user?.role !== "Admin") {
            return res.status(403).send("Forbidden Access")
        }
        next()
    }

    const verifySeller = async (req, res, next) => {
        const decodedEmail = req.decoded.email
        const query = { email, decodedEmail }
        const user = await usersCollection.findOne(query)
        if (user?.role !== "Seller") {
            return res.status(403).send("Forbidden Access")
        }
        next()
    }


    try {
        app.post('/users', async (req, res) => {
            const user = req.body
            const storedUser = await usersCollection.findOne(user)
            if (storedUser) {
                return res.send({ acknowledged: true })
            }
            const result = await usersCollection.insertOne(user)
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

        app.get("/users/checkRole/:email", verifyJwt, async (req, res) => {
            const email = req.params.email
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            res.send({ role: user?.role })
        })

        app.get('/users', verifyJwt, verifyAdmin, async (req, res) => {
            const role = req.query.role
            const query = { role: role }
            const result = await usersCollection.find(query).toArray()
            res.send(result)
        })
        app.delete('/users/:id', verifyJwt, verifyAdmin, async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const result = await usersCollection.deleteOne(query)
            res.send(result)
        })


    }
    finally {

    }

}

run().catch(err => { console.log(err) })
