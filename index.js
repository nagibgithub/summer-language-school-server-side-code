const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' });
    }
    // bearer token
    const token = authorization.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
    })
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ehpilc7.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, { serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true } });

const run = async () => {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        client.connect();

        const schoolUser = client.db("summer_school").collection("users");
        const schoolClass = client.db("summer_school").collection("class");

        // veryfy admin
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'admin') {
                return res.status(403).send({ error: true, message: 'forbidden message' });
            }
            next();
        };

        //-------- School users --------
        app.post('/users', async (req, res) => {
            const user = req.body;
            user.user_type = "student";
            const query = { email: user.email };
            const existingUser = await schoolUser.findOne(query);
            if (existingUser) {
                return res.send({ message: 'user already exists' })
            };
            const result = await schoolUser.insertOne(user);
            res.send(result);
        });

        app.get('/users', async (req, res) => {
            const result = await schoolUser.find().toArray();
            res.send(result);
        });

        //-------- School Class --------
        app.post('/class', async (req, res) => {
            const classInfo = req.body;
            classInfo.status = 'pending';
            const result = await schoolClass.insertOne(classInfo);
            res.send(result);
        });

        app.get('/instructor/class', async (req, res) => {
            const instructorEmail = req.query.email;
            const query = { email: instructorEmail };
            const option = {};
            const result = await schoolClass.find(query, option).toArray();
            res.send(result);
        });

        app.get('/class', async (req, res) => {
            const query = { status: "active" };
            const options = { projection: { name: 1, image: 1, insName: 1, duration: 1, seats: 1, price: 1 } };
            const result = await schoolClass.find(query, options).toArray();
            res.send(result);
        });

        //------------- user type -------------
        // app.get('user/type', async (req, res) => {
        //     const userEmail = req.query.
        // });



        // Send a ping to confirm a successful connection
        client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

// server test run
app.get('/', (req, res) => res.send('Summer School is running now'));
app.listen(port, () => console.log(`server is running on port: ${port}`));