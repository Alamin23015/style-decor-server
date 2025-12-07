require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@stylecluster.vqgtfle.mongodb.net/?appName=StyleCluster`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
  
    await client.connect();
    
  
    const serviceCollection = client.db("StyleDecor").collection("services");

  
    app.get('/services', async (req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    console.log("Successfully connected to MongoDB!");
  } catch (error) {
    console.log(error);
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('StyleDecor server is running');
})

app.listen(port, () => {
  console.log(`StyleDecor server is running on port: ${port}`);
})