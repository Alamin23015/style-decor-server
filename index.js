require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@stylecluster.vqgtfle.mongodb.net/?retryWrites=true&w=majority&appName=StyleCluster`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB Atlas!");

    const db = client.db("StyleDecor");
    const serviceCollection = db.collection("services");
    const bookingCollection = db.collection("bookings");
    const usersCollection = db.collection("users");

    
    app.get('/services', async (req, res) => {
      try {
        const result = await serviceCollection.find({}).toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Failed to fetch services" });
      }
    });

    app.get('/services/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await serviceCollection.findOne(query);
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Invalid ID format" });
      }
    });

    app.post('/services', async (req, res) => {
      try {
        const newService = req.body;
        if (!newService.service_name || !newService.cost) {
            return res.status(400).send({ error: "Missing required fields" });
        }
        newService.cost = parseInt(newService.cost);
        newService.createdAt = new Date();
        const result = await serviceCollection.insertOne(newService);
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Failed to add service" });
      }
    });

    app.put('/services/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const updatedData = req.body;
        delete updatedData._id; 
        const filter = { _id: new ObjectId(id) };
        const updateDoc = { $set: { ...updatedData } };
        const result = await serviceCollection.updateOne(filter, updateDoc);
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Failed to update service" });
      }
    });

    app.delete('/services/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await serviceCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Failed to delete service" });
      }
    });

   
    app.post('/bookings', async (req, res) => {
        try {
            const booking = req.body;
            booking.status = 'pending';
            booking.bookedAt = new Date();
            const result = await bookingCollection.insertOne(booking);
            res.send(result);
        } catch (error) {
            res.status(500).send({ error: "Failed to book service" });
        }
    });

    app.get('/bookings', async (req, res) => {
      try {
        const email = req.query.email; 
        if (!email) return res.status(400).send({ error: "Email is required" });
        const query = { email: email };
        const result = await bookingCollection.find(query).toArray();
        res.send(result); 
      } catch (error) {
        res.status(500).send({ error: "Failed to fetch bookings" });
      }
    });

    app.delete('/bookings/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await bookingCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Failed to delete booking" });
      }
    });
    
    
    app.get('/admin/bookings', async (req, res) => {
      try {
        const result = await bookingCollection.find({}).toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Failed to fetch all bookings" });
      }
    });


    app.post('/users', async (req, res) => {
      try {
        const user = req.body;
        const query = { email: user.email };
        const existingUser = await usersCollection.findOne(query);
        if (existingUser) {
          return res.send({ message: 'User already exists', insertedId: null });
        }
        if (user.email === "alamin16105@gmail.com") {
            user.role = "admin"; 
        } else {
            user.role = "user"; 
        }
        const result = await usersCollection.insertOne(user);
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Failed to add user" });
      }
    });

    app.get('/users/role/:email', async (req, res) => {
      try {
        const email = req.params.email;
        const query = { email: email };
        const user = await usersCollection.findOne(query);
        res.json({ role: user?.role || 'user' });
      } catch (error) {
        res.status(500).json({ role: 'user' });
      }
    });

    app.get('/admin/users', async (req, res) => {
      try {
        const result = await usersCollection.find({}).toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Failed to fetch users" });
      }
    });

    app.put('/users/:email', async (req, res) => {
      try {
        const email = req.params.email;
        const { role } = req.body;
        const filter = { email: email };
        const updateDoc = { $set: { role: role } };
        const result = await usersCollection.updateOne(filter, updateDoc);
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Failed to update user role" });
      }
    });

    
    app.post('/create-payment-intent', async (req, res) => {
      try {
        const { amount } = req.body;
        
        if (!amount) {
            return res.status(400).send({ error: "Amount is required" });
        }

        
        const amountInCents = parseInt(amount) * 100;

        const paymentIntent = await stripe.paymentIntents.create({
          amount: amountInCents,
          currency: "bdt",
          payment_method_types: ["card"],
        });

        res.send({
          clientSecret: paymentIntent.client_secret
        });
      } catch (error) {
        console.log("Stripe Error:", error);
        res.status(500).send({ error: error.message });
      }
    });

  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('StyleDecor Server is Running properly!');
});

app.listen(port, () => {
  console.log(`🚀 Server is running on port: ${port}`);
});