// นำเข้าคำสั่งที่จำเป็น
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// ค่าตั้งค่า Firebase ของคุณ (ผมดึงมาจากที่คุณส่งให้เมื่อกี้)
const firebaseConfig = {
  apiKey: "AIzaSyBlFZBi7MQWRl7uZZGrZPlTKmL559GN6mU",
  authDomain: "beastrealm-5a869.firebaseapp.com",
  projectId: "beastrealm-5a869",
  storageBucket: "beastrealm-5a869.firebasestorage.app",
  messagingSenderId: "987837920919",
  appId: "1:987837920919:web:c3062c31e5979a426e5bd2",
  measurementId: "G-KW7816QMR3"
};

// เริ่มต้นการทำงาน Firebase
const app = initializeApp(firebaseConfig);

// ส่งออกตัวแปร db เพื่อให้ไฟล์เกม (App.jsx) เรียกใช้ได้
export const db = getFirestore(app);