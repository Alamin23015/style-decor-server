// index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@stylecluster.vqgtfle.mongodb.net/?retryWrites=true&w=majority&appName=StyleCluster`;

// Create a Create client with better options
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let serviceCollection; 
async function connectDB() {
  try {
    await client.connect();
    console.log("Connected to MongoDB Atlas!");

    // Database & Collection
    const db = client.db("StyleDecor");
    serviceCollection = db.collection("services");

  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
}

// Call the connection function
connectDB();

// Basic Route
app.get('/', (req, res) => {
  res.send('StyleDecor Server is Running!');
});

// GET: All Services
app.get('/services', async (req, res) => {
  try {
    const result = await serviceCollection.find({}).toArray();
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch services" });
  }
});

app.post('/services', async (req, res) => {
  try {
    const newService = req.body;


    if (!newService.name || !newService.price) {
      return res.status(400).json({ error: "Name and price are required" });
    }

    const result = await serviceCollection.insertOne({
      ...newService,
      createdAt: new Date()
    });

    res.status(201).json({
      success: true,
      insertedId: result.insertedId,
      data: newService
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to add service" });
  }
});


app.get('/services/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const service = await serviceCollection.findOne({ _id: new ObjectId(id) });
    if (!service) return res.status(404).json({ error: "Service not found" });
    res.json(service);
  } catch (error) {
    res.status(500).json({ error: "Invalid ID or server error" });
  }
});

// Start Server
app.listen(port, () => {
  console.log(`StyleDecor server running on http://localhost:${port}`);
});


process.on('SIGINT', async () => {
  console.log("\nShutting down server...");
  await client.close();
  console.log("MongoDB connection closed.");
  process.exit(0);
});