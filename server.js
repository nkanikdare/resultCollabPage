// server/server.js
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const xlsx = require("xlsx");

const app = express();
app.use(cors());

// Use memory storage so the file remains in a buffer.
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

/**
 * Helper function to trim both keys and string values in an object.
 */
const trimRowValues = (obj) => {
  let newObj = {};
  for (let key in obj) {
    let newKey = key.trim();
    let value = obj[key];
    if (typeof value === "string") {
      value = value.trim();
    }
    newObj[newKey] = value;
  }
  return newObj;
};

app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    console.error("No file received.");
    return res.status(400).json({ error: "No file uploaded" });
  }
  try {
    // Read the Excel workbook from the uploaded file's buffer.
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetNames = workbook.SheetNames;
    
    // Process each sheet.
    const data = sheetNames.map((sheetName) => {
      const jsonData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
      const processedRows = jsonData.map((row) => {
        const tRow = trimRowValues(row);
        // Convert Pass Rate to a percentage if the value is given as a fraction.
        const rawPassRate = tRow["Pass Rate"];
        let calculatedPassRate = null;
        if (rawPassRate != null && parseFloat(rawPassRate) < 1) {
          calculatedPassRate = parseFloat((parseFloat(rawPassRate) * 100).toFixed(2));
        } else if (rawPassRate != null) {
          calculatedPassRate = parseFloat(parseFloat(rawPassRate).toFixed(2));
        }
        return {
          release: tRow["Release"] || "",
          wcBuild: tRow["WC - Build Number"] || "N/A",
          passRate: calculatedPassRate,
          totalCount: tRow["Test Case Count"] ? parseInt(tRow["Test Case Count"], 10) : 0,
          passed: tRow["Test Case Pass Count"] ? parseInt(tRow["Test Case Pass Count"], 10) : 0,
          failed: tRow["Test Case Fail Count"] ? parseInt(tRow["Test Case Fail Count"], 10) : 0,
          skipped: tRow["Test Case Skipped Count"] ? parseInt(tRow["Test Case Skipped Count"], 10) : 0,
          runStatus: tRow["Run Status"] || "",
          runtime: tRow["Runtime"] || "",
          serverUrl: tRow["Server URL"] || "#",
          resultLink: tRow["Result Link"] || "#"
        };
      });
      return { sheet: sheetName, rows: processedRows };
    });
    
    console.log("Processed Data:", JSON.stringify(data, null, 2));
    res.json(data);
  } catch (error) {
    console.error("Error processing file:", error);
    res.status(500).json({ error: "Failed to process file" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));