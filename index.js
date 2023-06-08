const express = require("express");
const app = express();
require("dotenv").config();
var cors = require("cors");
var jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tewydk3.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyjwt = (req, res, next) => {
  // console.log(req.headers.authorization);
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  const token = authorization.split(" ")[1];
  // console.log(token);
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    if (error) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const database = client.db("instrumentDB");
    const userCollection = database.collection("user");
    const classCollection = database.collection("class");
    const selectedClassCollection = database.collection("selectedclass");

    const verifyAdmin = async (req, res, next) => {
      const useremail = req.decoded.email;

      const query = { email: req.decoded.email };
      const user = await userCollection.findOne(query);
      console.log(user);
      if (user?.role !== "admin") {
        return res.status(403).send({ error: true, message: "forbidden" });
      }
      next();
    };

    // JWT
    app.post("/jwt", (req, res) => {
      const user = req.body;
      // console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    //make user roll

    // app.get("/users/admin/:email", verifyjwt, async (req, res) => {
    //   const email = req.params.email;
    //   if (req.decoded.email !== email) {
    //     return res.send({ admin: false });
    //   }
    //   const query = { email: email };
    //   // console.log(4, email, req.decoded.email);
    //   const user = await userCollection.findOne(query);
    //   // console.log(user);
    //   const result = { admin: user?.role === "admin" };
    //   res.send(result);
    // });

    // verify user**********
    app.get("/users/admin", async (req, res) => {
      let query = {};
      const email = req.query.email;
      if (req.query?.email) {
        query = { email: email };
      }
      // const cursor = userCollection.findOne(query);
      const result = await userCollection.findOne(query);
      res.send(result);
    });

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);

      res.send(result);
    });

    app.patch("/users/instructor/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "instructor",
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);

      res.send(result);
    });

    // // for approved
    // app.patch("/users/approved/:id", async (req, res) => {
    //   const id = req.params.id;
    //   const filter = { _id: new ObjectId(id) };
    //   const updateDoc = {
    //     $set: {
    //       status: "approved",
    //     },
    //   };
    //   const result = await userCollection.updateOne(filter, updateDoc);

    //   res.send(result);
    // });

    // selected class--
    app.post("/selectedclass", async (req, res) => {
      const selectedClassData = req.body;
      console.log(selectedClassData);
      const result = await selectedClassCollection.insertOne(selectedClassData);
      res.send(result);
    });

    app.delete("/selectedclass/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await selectedClassCollection.deleteOne(query);
      res.send(result);
    });

    // selected class get api--
    app.get("/selectedclass", async (req, res) => {
      let query = {};
      const email = req.query.studentEmail;
      console.log(email);
      if (req.query?.studentEmail) {
        query = { studentEmail: email };
      }

      const cursor = selectedClassCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    // class api
    app.post("/classes", async (req, res) => {
      const classData = req.body;
      console.log(classData);
      const result = await classCollection.insertOne(classData);
      res.send(result);
    });

    app.get("/classes", async (req, res) => {
      let query = {};
      const email = req.query.instructorEmail;
      console.log(email);
      if (req.query?.instructorEmail) {
        query = { instructorEmail: email };
      }
      const cursor = classCollection.find(query);
      const result = await cursor.toArray();

      res.send(result);
    });

    //single data--
    app.get("/classes/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await classCollection.findOne(query);
      res.send(result);
    });

    // user api:todo:verifyAdmin
    app.get("/users", async (req, res) => {
      const cursor = userCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      // console.log(4, user);
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exist" });
      }
      const result = await userCollection.insertOne(user);
      // console.log({ result });
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello ");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
