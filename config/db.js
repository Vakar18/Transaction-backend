const mongoose = require("mongoose");

const connectDB = async () => {
    const dbURI = process.env.MONGODB_URI || "mongodb://localhost:27017/transactionsDB"; 

    try {
        await mongoose.connect(dbURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("MongoDB connected");
    } catch (error) {
        console.error("Error connecting to MongoDB", error);
        process.exit(1);
    }
};

module.exports = connectDB;
