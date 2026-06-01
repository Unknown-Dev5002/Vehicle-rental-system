const db = require("./src/db");

const TEST_VEHICLE_NAMES = ["Test City Car", "API Test Car"];

db.whenReady
  .then(() => {
    db.run(
      `DELETE FROM vehicles WHERE name IN (${TEST_VEHICLE_NAMES.map(() => "?").join(", ")})`,
      TEST_VEHICLE_NAMES,
      function onDelete(err) {
        if (err) {
          console.error("[delete-test-vehicles]", err.message);
          process.exit(1);
        }
        console.log(`Deleted ${this.changes} row(s).`);
        db.close((closeErr) => {
          if (closeErr) {
            console.error("[delete-test-vehicles]", closeErr.message);
            process.exit(1);
          }
          process.exit(0);
        });
      }
    );
  })
  .catch((err) => {
    console.error("[delete-test-vehicles]", err.message);
    process.exit(1);
  });
