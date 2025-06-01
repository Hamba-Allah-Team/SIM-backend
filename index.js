require("dotenv").config();
require("./jobs/cronJob");
const express = require("express");
const cors = require("cors");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
require("./routes/auth.routes")(app);
require("./routes/user.routes")(app);
require("./routes/content.routes")(app);
require("./routes/about.routes")(app);
require("./routes/wallet.routes")(app);
require("./routes/activity.routes")(app);
require("./routes/activation.routes")(app);
require("./routes/reset-password.routes")(app);
app.use("/uploads", express.static("uploads"));
require("./routes/room.routes")(app);
require("./routes/reservation.routes")(app);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});
