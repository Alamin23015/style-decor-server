require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken'); 
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());


const verifyToken = (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).send({ message: 'unauthorized access' });
  }
  const token = req.headers.authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'unauthorized access' });
    }
    req.decoded = decoded;
    next();
  });
};

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

    
    app.post('/jwt', async (req, res) => {
  try {
    const user = req.body;
    const secret = process.env.ACCESS_TOKEN_SECRET;

    if (!secret) {
        console.error("ERROR: ACCESS_TOKEN_SECRET is missing in Railway Variables!");
        return res.status(500).send({ error: "Secret key not found on server" });
    }

    const token = jwt.sign(user, secret, { expiresIn: '1h' });
    res.send({ token });
  } catch (error) {
    console.error("JWT Error:", error);
    res.status(500).send({ error: "JWT generation failed" });
  }
});

   
  
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

  
    app.post('/services', verifyToken, async (req, res) => {
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

    app.put('/services/:id', verifyToken, async (req, res) => {
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

    app.delete('/services/:id', verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await serviceCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Failed to delete service" });
      }
    });

   
    app.post('/bookings', verifyToken, async (req, res) => {
        try {
            const booking = req.body;
            booking.status = 'pending';
            booking.paymentStatus = 'unpaid';
            booking.bookedAt = new Date();
            booking.decoratorEmail = null;
            
            const result = await bookingCollection.insertOne(booking);
            res.send(result);
        } catch (error) {
            res.status(500).send({ error: "Failed to book service" });
        }
    });

    app.get('/bookings', verifyToken, async (req, res) => {
      try {
        const email = req.query.email; 
        if (!email) return res.status(400).send({ error: "Email is required" });
        
        if (email !== req.decoded.email) {
          return res.status(403).send({ message: 'forbidden access' });
        }
        const query = { email: email };
        const result = await bookingCollection.find(query).toArray();
        res.send(result); 
      } catch (error) {
        res.status(500).send({ error: "Failed to fetch bookings" });
      }
    });

    app.get('/admin/bookings', verifyToken, async (req, res) => {
      try {
        const result = await bookingCollection.find({}).toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Failed to fetch all bookings" });
      }
    });
    
    app.get('/bookings/all', verifyToken, async (req, res) => {
      try {
        const result = await bookingCollection.find({}).toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Failed to fetch all bookings" });
      }
    });

    app.get('/bookings/decorator/:email', verifyToken, async (req, res) => {
      try {
        const email = req.params.email;
        
        if (email !== req.decoded.email) {
          return res.status(403).send({ message: 'forbidden access' });
        }
        const query = { decoratorEmail: email };
        const result = await bookingCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Failed to fetch decorator bookings" });
      }
    });

    app.patch('/bookings/assign/:id', verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const { decoratorEmail } = req.body;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: { 
            decoratorEmail: decoratorEmail,
            status: 'Assigned'
          }
        };
        const result = await bookingCollection.updateOne(filter, updateDoc);
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Failed to assign decorator" });
      }
    });
    
    app.patch('/bookings/status/:id', verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const { status } = req.body; 
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: { status: status }
        };
        const result = await bookingCollection.updateOne(filter, updateDoc);
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Failed to update status" });
      }
    });

    app.delete('/bookings/:id', verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await bookingCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Failed to delete booking" });
      }
    });

    

    app.get('/users/:email', verifyToken, async (req, res) => {
        try {
            const email = req.params.email;
            const query = { email: email };
            const result = await usersCollection.findOne(query);
            res.send(result);
        } catch (error) {
            res.status(500).send({ error: "Failed to fetch user details" });
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

    app.get('/users/role/:email', verifyToken, async (req, res) => {
      try {
        const email = req.params.email;
        const query = { email: email };
        const user = await usersCollection.findOne(query);
        res.json({ role: user?.role || 'user' });
      } catch (error) {
        res.status(500).json({ role: 'user' });
      }
    });

    app.get('/admin/users', verifyToken, async (req, res) => {
      try {
        const result = await usersCollection.find({}).toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Failed to fetch users" });
      }
    });




    app.put('/users/:email', verifyToken, async (req, res) => {
      try {
        const email = req.params.email;
        const updatedData = req.body;
        const filter = { email: email };
        const options = { upsert: true };
        const updateDoc = {
            $set: { ...updatedData }
        };
        const result = await usersCollection.updateOne(filter, updateDoc, options);
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Failed to update user info" });
      }
    });

    
    app.post('/create-payment-intent', verifyToken, async (req, res) => {
      try {
        const { amount } = req.body;
        const amountInCents = Math.round(parseInt(amount) * 100);
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amountInCents,
          currency: "bdt",
          payment_method_types: ["card"],
        });
        res.send({ clientSecret: paymentIntent.client_secret });
      } catch (error) {
        res.status(500).send({ error: error.message });
      }
    });

    
    app.patch('/bookings/payment-success/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const { transactionId } = req.body;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            paymentStatus: 'paid',
            transactionId: transactionId
          }
        };
        const result = await bookingCollection.updateOne(filter, updateDoc);
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Failed to update payment" });
      }
    });

    app.get('/decorators', verifyToken, async (req, res) => {
    try {
        const query = { role: 'decorator' };
        
       
        const result = await usersCollection.find(query).limit(3).toArray();
        res.send(result);
    } catch (error) {
        res.status(500).send({ message: "Failed to fetch decorators" });
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