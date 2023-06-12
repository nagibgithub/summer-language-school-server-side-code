const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' });
    }
    
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
            const user = await schoolUser.findOne(query);
            if (user?.user_type !== 'admin') {
                return res.status(403).send({ error: true, message: 'forbidden message' });
            }
            next();
        };

        // veryfy instructor
        const verifyInstructor = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await schoolUser.findOne(query);
            if (user?.user_type !== 'instructor') {
                return res.status(403).send({ error: true, message: 'forbidden message' });
            }
            next();
        };
        //----------- JWT post -----------
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const code = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ code });
        });

        //------------------- useAdmin -------------------
        app.get('/users/type/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;

            if (req.decoded.email !== email) {
                res.send({ user: false })
            }

            const query = { email: email }
            const user = await schoolUser.findOne(query);
            const result = { user_type: user?.user_type }
            res.send(result);
        })




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

        app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
            const result = await schoolUser.find().toArray();
            res.send(result);
        });

        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = { $set: { user_type: "admin" } };
            const result = await schoolUser.updateOne(filter, updateDoc);
            res.send(result);
        });

        app.patch('/users/instructor/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = { $set: { user_type: "instructor" } };
            const result = await schoolUser.updateOne(filter, updateDoc);
            res.send(result);
        });

        app.delete('/users/delete/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await schoolUser.deleteOne(query);
            res.send(result);
        });

        //-------- Classes --------
        app.post('/class', async (req, res) => {
            const classInfo = req.body;
            classInfo.status = 'pending';
            const result = await schoolClass.insertOne(classInfo);
            res.send(result);
        });

        app.get('/class/admin', verifyJWT, verifyAdmin, async (req, res) => {
            const result = await schoolClass.find().toArray();
            res.send(result);
        });

        // app.get('/class/instructor', verifyJWT, verifyInstructor, async (req, res)=>{

        //     const query = {}
        //     const result = await schoolClass.find().toArray();
        //     res.send(result);
        // });

        app.patch('/class/approved/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = { $set: { status: "approved" } };
            const result = await schoolClass.updateOne(filter, updateDoc);
            res.send(result);
        });

        app.patch('/class/deny/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = { $set: { status: "deny" } };
            const result = await schoolClass.updateOne(filter, updateDoc);
            res.send(result);
        });

        app.patch('/class/update/:id', async (req, res) => {
            const classId = req.params.id;
            const classUpdateData = req.body;
            const filter = { _id: new ObjectId(classId) };
            const updateDoc = {
                $set: {
                    name: classUpdateData.name,
                    duration: classUpdateData.duration,
                    seats: classUpdateData.seats,
                    price: classUpdateData.price,
                    description: classUpdateData.description
                },
            };
            const result = await schoolClass.updateOne(filter, updateDoc);
            res.send(result);
        });

        app.patch('/class/feedback/:id', async (req, res) => {
            const id = req.params.id;
            const bodyData = req.body;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = { $set: { feedback: bodyData.feedback } };
            const result = await schoolClass.updateOne(filter, updateDoc);
            res.send(result);
        });

        app.get('/instructor/class', verifyJWT, verifyInstructor, async (req, res) => {
            const email = req.decoded.email;
            const query = { email: email }
            const option = {};
            const result = await schoolClass.find(query, option).toArray();
            res.send(result);
        });

        app.get('/class/update/:id', async (req, res) => {
            const classId = req.params.id;
            const query = { _id: new ObjectId(classId) };
            const options = { projection: { name: 1, duration: 1, seats: 1, price: 1, description: 1 } }
            const result = await schoolClass.findOne(query, options);
            res.send(result);
        });

        // class get (public)
        app.get('/class', async (req, res) => {
            const query = { status: "approved" };
            const options = { projection: { name: 1, image: 1, insName: 1, duration: 1, seats: 1, price: 1 } };
            const result = await schoolClass.find(query, options).toArray();
            res.send(result);
        });

        // instructro get (public)
        app.get('/instructor', async (req, res) => {
            const query = { user_type: "instructor" };
            const options = { projection: { name: 1, img: 1, email: 1 } };
            const result = await schoolUser.find(query, options).toArray();
            res.send(result);
        });

        // all classes nor secure
        app.get('/all_classes', async (req, res) => {
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