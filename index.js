const express = require("express")
const cors = require("cors")
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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
    // console.log("hi")
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
    const productsCollection = client.db("TheArtisticResalesDB").collection("artisticProductsDB")
    const bookingsCollection = client.db("TheArtisticResalesDB").collection("artisticBookingsDB")
    const advertiseMentCollection = client.db("TheArtisticResalesDB").collection("artisticAdvertiseMentDB")
    const reportsCollection = client.db("TheArtisticResalesDB").collection("artisticReportsDB")
    const paymentCollection = client.db("TheArtisticResalesDB").collection("artisticpaymentDB")

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
        const query = { email: decodedEmail }
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
            // console.log(storedUser);
            if (storedUser) {
                // console.log("first")
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
            console.log(user)
            res.send({ role: user?.role })
        })

        app.get('/users', verifyJwt, verifyAdmin, async (req, res) => {
            const role = req.query.role
            const query = { role: role }
            const result = await usersCollection.find(query).toArray()
            res.send(result)
        })
        app.delete('/users/:email', verifyJwt, verifyAdmin, async (req, res) => {
            const userEmail = req.params.email
            const query = { email: userEmail }


            const sellerQuery = {
                sellerEmail: userEmail
            }

            const reportDeleteResult = await reportsCollection.deleteMany(sellerQuery)

            const productDeleteResult = await productsCollection.deleteMany(sellerQuery)

            const advertiseMentDeleteResult = await advertiseMentCollection.deleteOne(sellerQuery)

            const buyerQuery = {
                customerEmail
                    : userEmail
            }
            const bookingDeleteResult = await bookingsCollection.deleteMany(buyerQuery)


            const result = await usersCollection.deleteOne(query)
            res.send(result)

        })

        app.put("/verifyUser/:email", verifyJwt, verifyAdmin, async (req, res) => {
            const email = req.params.email
            const userQuery = { email: email }
            const productQuery = {
                sellerEmail: email
            }
            const options = { upsert: true }
            const updateVerification = {
                $set: {
                    isVerified: true
                }
            }
            const userResult = await usersCollection.updateOne(userQuery, updateVerification, options)
            const productResult = await productsCollection.updateMany(productQuery, updateVerification, options)
            // console.log(productResult);
            res.send(userResult)
        })

        app.get("/report", verifyJwt, verifyAdmin, async (req, res) => {
            const query = {}
            const result = await reportsCollection.find(query).toArray()
            // console.log(result)
            res.send(result)

        })


        app.post('/products', verifyJwt, verifySeller, async (req, res) => {
            const productDetails = req.body
            const email = productDetails.sellerEmail
            const userQuery = { email: email, isVerified: true }
            const isVerifiedUser = await usersCollection.findOne(userQuery)
            if (isVerifiedUser) {
                productDetails.isVerified = isVerifiedUser.isVerified
            }
            const result = await productsCollection.insertOne(productDetails)
            res.send(result)
        })

        app.get("/products", verifyJwt, verifySeller, async (req, res) => {
            const email = req.query.email
            const decodedEmail = req.decoded.email

            if (email === decodedEmail) {
                const query = {
                    sellerEmail: email
                }
                // console.log(query)
                const products = await productsCollection.find(query).toArray()
                // console.log(products);
                res.send(products)
            }
        })
        app.get("/products/:id", verifyJwt, async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const result = await productsCollection.findOne(query)

            res.send(result)
        })


        app.delete("/products/:id", verifyJwt, verifySeller, async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const result = await productsCollection.deleteOne(query)

            const otherQuery = {
                itemId: id
            }
            const bookingDeleteResult = await bookingsCollection.deleteMany(otherQuery)

            const advertiseMentDeleteResult = await advertiseMentCollection.deleteOne(otherQuery)

            res.send(result)
        })

        app.post("/advertisement/:id", verifyJwt, verifySeller, async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const advertisementDetails = await productsCollection.findOne(query)
            delete advertisementDetails._id
            advertisementDetails.itemId = id

            const checkQuery = {
                itemId: id
            }
            const check = await advertiseMentCollection.findOne(checkQuery)
            if (check) {
                return res.send({ acknowledged: true })
            }

            const result = await advertiseMentCollection.insertOne(advertisementDetails)

            const updateIsAdvertised = {
                $set: {
                    isAdvertised: true
                }
            }
            const options = { upsert: true }
            const update = await productsCollection.updateOne(query, updateIsAdvertised, options)
            res.send(result)
        })

        // app.get("/addstatus", async (req, res) => {
        //     const filter = {}
        //     const options = { upsert: true }
        //     const updatePrice = {
        //         $set: {
        //             status: "Available"
        //         }
        //     }
        //     const result = await productsCollection.updateMany(filter, updatePrice, options)
        //     res.send(result)
        // })



        app.get('/categories', async (req, res) => {
            const query = {}
            const allProducts = await productsCollection.find().toArray()
            let categories = []
            allProducts.map(product => {
                if (categories.indexOf(product.category) === -1) {
                    categories.push(product.category)
                }
            })
            res.send(categories)
        })

        app.get("/category/:id", async (req, res) => {
            const category = req.params.id
            console.log(category)
            const query = { category: category, status: "Available" }
            const categoryProducts = await productsCollection.find(query).toArray()
            // console.log(categoryProducts);
            res.send(categoryProducts);
        })

        app.get("/advertisement", async (req, res) => {
            const query = {
                status: "Available"
            }
            const result = await advertiseMentCollection.find(query).toArray()
            res.send(result);
        })

        app.post("/bookings", verifyJwt, async (req, res) => {

            const bookingDetails = req.body
            // console.log(bookingDetails)
            const query =
            {
                itemId: bookingDetails.itemId, customerEmail: bookingDetails.customerEmail
            }
            const check = await bookingsCollection.findOne(query)
            if (check) {
                return res.send({ acknowledged: true })
            }
            const result = await bookingsCollection.insertOne(bookingDetails)
            res.send(result)
        })

        app.get("/isBooked/:id", verifyJwt, async (req, res) => {
            const email = req.decoded.email
            const productId = req.params.id

            const query = { customerEmail: email, itemId: productId }

            const booked = await bookingsCollection.findOne(query)
            res.send(booked !== null)

        })


        app.get("/myOrders", verifyJwt, async (req, res) => {
            const email = req.decoded.email
            const query = {
                customerEmail: email
            }
            const orders = await bookingsCollection.find(query).toArray()
            res.send(orders)

        })

        app.post('/report', verifyJwt, async (req, res) => {

            const email = req.decoded.email
            const reportedItem = req.body
            reportedItem.reporterEmail = email

            const query = { productId: reportedItem.productId, reporterEmail: reportedItem.reporterEmail }

            const check = await reportsCollection.findOne(query)
            if (check) {
                return res.send({ acknowledged: true })
            }

            const result = await reportsCollection.insertOne(reportedItem)
            res.send(result)

        })

        app.get('/bookings/:id', verifyJwt, async (req, res) => {

            const id = req.params.id

            const query = { _id: ObjectId(id) }
            const bookings = await bookingsCollection.findOne(query)
            res.send(bookings)

        })

        app.post("/create-payment-intent", verifyJwt, async (req, res) => {
            const booking = req.body
            const price = booking.price

            const amount = price * 100

            const paymentIntent = await stripe.paymentIntents.create({
                currency: "usd",
                amount: amount,
                "payment_method_types": [
                    "card"
                ],
            });

            res.send({
                clientSecret: paymentIntent.client_secret,
            });

        })

        app.post('/payment', verifyJwt, async (req, res) => {
            const payment = req.body
            const result = await paymentCollection.insertOne(payment)

            const options = { upsert: true }

            const id = payment.bookingId
            const buyerQuery = { _id: ObjectId(id) }
            const updateBuyer = {
                $set: {
                    isBuyer: true,
                    transactionId: payment.transactionId,
                    status: "Sold Out"
                }
            }
            const updatedBooking = await bookingsCollection.updateOne(buyerQuery, updateBuyer, options)

            const itemId = payment.itemId
            const productQuery = { _id: ObjectId(itemId) }

            const advertiseAndBookingQuery = { itemId: itemId }

            const updateStatus = {
                $set: {
                    status: "Sold Out"
                }
            }

            const updatedProduct = await productsCollection.updateOne(productQuery, updateStatus, options)

            const updatedadvertisement = await advertiseMentCollection.updateOne(advertiseAndBookingQuery, updateStatus, options)

            const updatedbookings = await bookingsCollection.updateMany(advertiseAndBookingQuery, updateStatus, options)

            res.send(result)
        })



    }
    finally {

    }

}

run().catch(err => { console.log(err) })
