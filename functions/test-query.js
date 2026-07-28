const admin = require("firebase-admin");
admin.initializeApp({ projectId: "roadmapp-e6c2c" });
const db = admin.firestore();
async function run() {
  const trips = await db.collection("trips").where("userId", "==", "nWGVU8lw73YCnZDhKIrvuvYcxEw2").get();
  trips.forEach(d => console.log(d.id, d.data().title, "alias:", d.data().emailAlias));
}
run();
