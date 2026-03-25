import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// 👇 นำเข้า Auth เพิ่มเติม
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBlFZBi7MQWRl7uZZGrZPlTKmL559GN6mU",
  authDomain: "beastrealm-5a869.firebaseapp.com",
  projectId: "beastrealm-5a869",
  storageBucket: "beastrealm-5a869.firebasestorage.app",
  messagingSenderId: "987837920919",
  appId: "1:987837920919:web:c3062c31e5979a426e5bd2",
  measurementId: "G-KW7816QMR3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
// 👇 ประกาศใช้งานตัวแปร auth
export const auth = getAuth(app);