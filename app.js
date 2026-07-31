import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, getDoc, collection, addDoc, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// KENDİ FİREBASE BİLGİLERİNİ BURAYA GİR
const firebaseConfig = {
  apiKey: "AIzaSyCIa-z4ix0DFudPRtXoXkpaeiye57KzrFw",
  authDomain: "dreaxapp.firebaseapp.com",
  projectId: "dreaxapp",
  storageBucket: "dreaxapp.appspot.com",
  messagingSenderId: "128747570626",
  appId: "1:128747570626:web:557670dc640e8ce059825b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let currentUser = ""; // Giriş yapan kişiyi hafızada tutacağız

// ARAYÜZ ELEMENTLERİ
const loginBtn = document.getElementById("login-btn");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const errorMsg = document.getElementById("error-msg");

const loginScreen = document.getElementById("login-screen");
const mainScreen = document.getElementById("main-screen");
const currentUserDisplay = document.getElementById("current-user-display");

const addChatBtn = document.getElementById("add-chat-btn");
const addChatModal = document.getElementById("add-chat-modal");
const closeModalBtn = document.getElementById("close-modal-btn");
const sendRequestBtn = document.getElementById("send-request-btn");
const targetUsernameInput = document.getElementById("target-username");

// 1. GİRİŞ YAPMA İŞLEMİ (Veritabanındaki "users" koleksiyonundan kontrol eder)
loginBtn.addEventListener("click", async () => {
    const user = usernameInput.value.trim();
    const pass = passwordInput.value.trim();

    if(user === "" || pass === "") return;

    // Firebase'de "users" koleksiyonunda bu kullanıcı adında bir belge var mı bakıyoruz
    const userRef = doc(db, "users", user);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists() && userSnap.data().password === pass) {
        // Giriş Başarılı
        currentUser = user;
        currentUserDisplay.textContent = currentUser;
        loginScreen.style.display = "none";
        mainScreen.style.display = "flex";
        
        // Giriş yapınca istekleri dinlemeye başla
        listenForRequests();
    } else {
        // Hata
        errorMsg.style.display = "block";
    }
});

// 2. SOHBET EKLE (Modal Aç/Kapa)
addChatBtn.addEventListener("click", () => {
    addChatModal.style.display = "flex";
});
closeModalBtn.addEventListener("click", () => {
    addChatModal.style.display = "none";
    targetUsernameInput.value = "";
});

// 3. İSTEK GÖNDERME
sendRequestBtn.addEventListener("click", async () => {
    const target = targetUsernameInput.value.trim();
    if(target === "" || target === currentUser) return;

    // Hedef kullanıcı veritabanında kayıtlı mı diye kontrol et
    const targetRef = doc(db, "users", target);
    const targetSnap = await getDoc(targetRef);

    if(targetSnap.exists()) {
        // Kayıtlıysa "requests" (İstekler) koleksiyonuna yeni istek ekle
        await addDoc(collection(db, "requests"), {
            from: currentUser,
            to: target,
            status: "pending" // Bekliyor
        });
        alert("İstek başarıyla gönderildi!");
        addChatModal.style.display = "none";
    } else {
        alert("Böyle bir kullanıcı bulunamadı!");
    }
});

// 4. GELEN İSTEKLERİ DİNLEME (Canlı olarak)
function listenForRequests() {
    const q = query(collection(db, "requests"), where("to", "==", currentUser), where("status", "==", "pending"));
    
    // onSnapshot, veritabanına yeni bir istek eklendiği anda sayfayı yenilemeden bunu çeker
    onSnapshot(q, (snapshot) => {
        const requestsList = document.getElementById("requests-list");
        requestsList.innerHTML = ""; // Listeyi temizle
        
        snapshot.forEach((doc) => {
            const data = doc.data();
            const li = document.createElement("li");
            li.innerHTML = `
                ${data.from} sana istek attı! 
                <button style="background:green; color:white; border:none; padding:5px; margin-left:5px; cursor:pointer;" onclick="acceptRequest('${doc.id}', '${data.from}')">Kabul Et</button>
            `;
            requestsList.appendChild(li);
        });
    });
}

// (Not: acceptRequest fonksiyonunu genel kapsama almak için window objesine ekliyoruz)
window.acceptRequest = async function(requestId, fromUser) {
    alert(fromUser + " ile sohbet isteği kabul edildi! (Mesajlaşma kodları eklenecek)");
    // İlerleyen aşamada burada isteğin durumunu "accepted" yapacağız ve sohbeti başlatacağız.
}