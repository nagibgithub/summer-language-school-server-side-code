const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
require('dotenv').config();

const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ehpilc7.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, { serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true } });

const run = async () => {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        client.connect();

        const schoolUser = client.db("summer_school").collection("users");
        const schoolClass = client.db("summer_school").collection("Class");


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
            const result = await schoolClass.insertOne(classInfo);
            res.send(result);
        });

        app.get('/class', async (req, res) => {
            const result = await schoolClass.find().toArray();
            res.send(result);
        });



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