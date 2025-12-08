require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
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

    // 2. Initialize Collections
    const db = client.db("StyleDecor");
    const serviceCollection = db.collection("services");
    const bookingCollection = db.collection("bookings");

   

    // Root Route
    app.get('/', (req, res) => {
      res.send('StyleDecor Server is Running!');
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
        // Basic validation logic...
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

    // POST: Create Booking
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

 
    app.listen(port, () => {
      console.log(`🚀 Server is running on http://localhost:${port}`);
    });

  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
  }
}

run().catch(console.dir);