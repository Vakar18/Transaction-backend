const express = require("express");
const router = express.Router();
const {
    getTransactions,
    getStatistics,
    getBarChart,
    getPieChart,    
    getCombinedData,
    initializeDatabase, 
} = require("../controllers/transactionController");

router.get("/initialize", initializeDatabase);
router.get("/transactions", getTransactions);
router.get("/statistics", getStatistics);
router.get("/barchart", getBarChart);
router.get("/piechart", getPieChart); 
router.get("/combined", getCombinedData);

module.exports = router;
