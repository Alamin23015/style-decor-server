require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();

const port = process.env.PORT || 5000;

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
    const usersCollection = db.collection("users"); // যোগ করলাম

    app.get('/', (req, res) => {
      res.send('StyleDecor Server is Running properly on Railway/Local!');
    });

   
    app.get('/services', async (req, res) => {
      try {
        const result = await serviceCollection.find({}).toArray();
        res.send(result);
      } catch (error) {
        console.error(error);
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
        console.error(error);
        res.status(500).send({ error: "Failed to add service" });
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
            console.error(error);
            res.status(500).send({ error: "Failed to book service" });
        }
    });

   
    app.get('/bookings', async (req, res) => {
      try {
        const email = req.query.email; 
        if (!email) {
          return res.status(400).send({ error: "Email is required" });
        }
        const query = { email: email };
        const result = await bookingCollection.find(query).toArray();
        res.send(result); 
      } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).send({ error: "Failed to fetch bookings" });
      }
    });

    
    app.delete('/bookings/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await bookingCollection.deleteOne(query);
        if (result.deletedCount === 0) {
          return res.status(404).send({ error: "Booking not found" });
        }
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Failed to delete booking" });
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
        console.error(error);
        res.status(500).send({ error: "Failed to add user" });
      }
    });

    
    app.get('/users/role/:email', async (req, res) => {
      try {
        const email = req.params.email;
        const query = { email: email };
        const user = await usersCollection.findOne(query);
        
        if (user && user.role) {
          res.json({ role: user.role });
        } else {
          res.json({ role: 'user' }); // ডিফল্ট
        }
      } catch (error) {
        console.error('Error fetching role:', error);
        res.status(500).json({ role: 'user' });
      }
    });

    // Update User Role (Admin panel-এর জন্য, পরে দরকার হলে)
    app.put('/users/:email', async (req, res) => {
      try {
        const email = req.params.email;
        const { role } = req.body;
        const filter = { email: email };
        const updateDoc = { $set: { role: role } };
        const result = await usersCollection.updateOne(filter, updateDoc);
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Failed to update user role" });
      }
    });

    app.listen(port, () => {
      console.log(`🚀 Server is running on port: ${port}`);
    });

  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
  }
}

run().catch(console.dir);