const axios = require('axios');
const Transaction = require('../models/ProductTransaction');
const connectDB = require('../config/db');

// Initialize Database with Third-Party Data
exports.initializeDatabase = async (req, res) => {
  try {
    const response = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
    const data = response.data;

    // Clear existing data
    await Transaction.deleteMany({});

    // Insert new data
    await Transaction.insertMany(data);

    res.status(200).json({ message: 'Database initialized successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error initializing database', error });
  }
};

// Helper function to build month filter
const getMonthFilter = (month) => {
    const parsedMonth = parseInt(month, 10);
    if (isNaN(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
      throw new Error("Invalid month provided. Month must be between 1 and 12.");
    }
    
    return {
      $expr: { $eq: [{ $month: "$dateOfSale" }, parsedMonth] }
    };
  };

// 1. List Transactions with Search and Pagination
exports.getTransactions = async (req, res) => {
  const { month, search = '', page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  try {
    const query = {
      ...getMonthFilter(month),
      $or: [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { price: isNaN(parseFloat(search)) ? { $exists: true } : parseFloat(search) },
      ],
    };

    const transactions = await Transaction.find(query).skip(skip).limit(parseInt(limit));

    if (res) {
      return res.status(200).json(transactions);
    }
    return transactions;
  } catch (error) {
    console.error("Error fetching transactions:", error.stack || error);
    if (res) {
      return res.status(500).json({ message: 'Error fetching transactions', error: error.message || error });
    }
    throw new Error('Error fetching transactions: ' + error.message);
  }
};

// 2. Statistics API
exports.getStatistics = async (req, res) => {
  const { month } = req.query;
  try {
    const soldItems = await Transaction.countDocuments({
      ...getMonthFilter(month),
      sold: true,
    });

    const notSoldItems = await Transaction.countDocuments({
      ...getMonthFilter(month),
      sold: false,
    });

    const totalSaleAmountResult = await Transaction.aggregate([
      {
        $match: {
          ...getMonthFilter(month),
          sold: true,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$price" },
        },
      },
    ]);

    const totalSaleAmount = totalSaleAmountResult[0]?.total || 0;

    const result = {
      totalSaleAmount,
      soldItems,
      notSoldItems,
    };

    if (res) {
      return res.status(200).json(result);
    }
    return result;
  } catch (error) {
    console.error("Error fetching statistics:", error.stack || error);
    if (res) {
      return res.status(500).json({ message: 'Error fetching statistics', error: error.message || error });
    }
    throw new Error('Error fetching statistics: ' + error.message);
  }
};

// 3. Bar Chart API
exports.getBarChart = async (req, res) => {
    const { month } = req.query;
  
    // Ensure month is provided and log it
    if (!month) {
      return res.status(400).json({ message: 'Month parameter is required' });
    }
    console.log(`Fetching bar chart data for month: ${month}`);
  
    const priceRanges = [
      { min: 0, max: 100 },
      { min: 101, max: 200 },
      { min: 201, max: 300 },
      { min: 301, max: 400 },
      { min: 401, max: 500 },
      { min: 501, max: 600 },
      { min: 601, max: 700 },
      { min: 701, max: 800 },
      { min: 801, max: 900 },
      { min: 901, max: Infinity }
    ];
  
    try {
      // Create bar chart data based on price ranges and month filter
      const result = await Promise.all(priceRanges.map(async (range) => {
        const query = {
          ...getMonthFilter(month),
          price: range.max === Infinity ? { $gte: range.min } : { $gte: range.min, $lte: range.max },
        };
  
        const count = await Transaction.countDocuments(query);
        return { range: `${range.min}-${range.max === Infinity ? 'above' : range.max}`, count };
      }));
  
      // Send the result back in the response
      return res.status(200).json(result);
    } catch (error) {
      console.error("Error fetching bar chart data:", error.stack || error);
      return res.status(500).json({ message: 'Error fetching bar chart data', error: error.message || error });
    }
  };

// 4. Pie Chart API
exports.getPieChart = async (req, res) => {
  const { month } = req.query;
  try {
    const categories = await Transaction.aggregate([
      {
        $match: {
          ...getMonthFilter(month),
        },
      },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          category: "$_id",
          count: 1,
          _id: 0,
        },
      },
    ]);

    if (res) {
      return res.status(200).json(categories);
    }
    return categories;
  } catch (error) {
    console.error("Error fetching pie chart data:", error.stack || error);
    if (res) {
      return res.status(500).json({ message: 'Error fetching pie chart data', error: error.message || error });
    }
    throw new Error('Error fetching pie chart data: ' + error.message);
  }
};

// 5. Combined API
exports.getCombinedData = async (req, res) => {
  try {
    const transactionsPromise = exports.getTransactions(req);
    const statisticsPromise = exports.getStatistics(req);
    const barChartPromise = exports.getBarChart(req);
    const pieChartPromise = exports.getPieChart(req);

    const [transactions, statistics, barChart, pieChart] = await Promise.all([
      transactionsPromise,
      statisticsPromise,
      barChartPromise,
      pieChartPromise,
    ]);

    res.status(200).json({
      transactions,
      statistics,
      barChart,
      pieChart,
    });
  } catch (error) {
    console.error("Error fetching combined data:", error.stack || error);
    res.status(500).json({ message: "Error fetching combined data", error: error.message || error });
  }
};
