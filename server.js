const express = require("express");
const app = express();

const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Hi, Welcome to the API!");
});
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
