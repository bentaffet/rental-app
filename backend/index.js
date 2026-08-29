require("dotenv").config();

const app = require("./src/app");

const port = Number(process.env.PORT || 4000);

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Rental API listening on http://localhost:${port}`);
  });
}

module.exports = app;
