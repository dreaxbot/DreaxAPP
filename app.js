import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
// Yeni eklenenler: deleteDoc (silmek için)
import { getFirestore, doc, getDoc, collection, addDoc, query, where, onSnapshot, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// KENDİ FIREBASE BİLGİLERİNİ BURAYA YAPIŞTIRMAYI UNUTMA!
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

let currentUser = ""; 

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

// 1. GİRİŞ YAPMA İŞLEMİ
loginBtn.addEventListener("click", async () => {
    const user = usernameInput.value.trim();
    const pass = passwordInput.value.trim();

    if(user === "" || pass === "") return;

    const userRef = doc(db, "users", user);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists() && userSnap.data().password === pass) {
        currentUser = user;
        currentUserDisplay.textContent = currentUser;
        loginScreen.style.display = "none";
        mainScreen.style.display = "flex";
        
        listenForRequests();
        listenForContacts(); // Giriş yapınca sohbetlerimizi de çekmeye başla
    } else {
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

    const targetRef = doc(db, "users", target);
    const targetSnap = await getDoc(targetRef);

    if(targetSnap.exists()) {
        await addDoc(collection(db, "requests"), {
            from: currentUser,
            to: target,
            status: "pending" 
        });
        alert("İstek başarıyla gönderildi!");
        addChatModal.style.display = "none";
    } else {
        alert("Böyle bir kullanıcı bulunamadı!");
    }
});

// 4. GELEN İSTEKLERİ DİNLEME
function listenForRequests() {
    const q = query(collection(db, "requests"), where("to", "==", currentUser), where("status", "==", "pending"));
    
    onSnapshot(q, (snapshot) => {
        const requestsList = document.getElementById("requests-list");
        requestsList.innerHTML = ""; 
        
        snapshot.forEach((requestDoc) => {
            const data = requestDoc.data();
            const li = document.createElement("li");
            li.innerHTML = `
                ${data.from} sana istek attı! 
                <button style="background:green; color:white; border:none; padding:5px; margin-left:5px; border-radius:3px; cursor:pointer;" onclick="acceptRequest('${requestDoc.id}', '${data.from}')">Kabul Et</button>
            `;
            requestsList.appendChild(li);
        });
    });
}

// 5. İSTEĞİ KABUL ETME (ASIL İŞLEM BURADA)
window.acceptRequest = async function(requestId, fromUser) {
    try {
        // "chats" adında yeni bir koleksiyona ikinizi (sohbet odası olarak) ekliyoruz
        await addDoc(collection(db, "chats"), {
            users: [currentUser, fromUser]
        });
        
        // Sohbet açıldığı için bekleyen isteği veritabanından tamamen siliyoruz
        await deleteDoc(doc(db, "requests", requestId));
        
    } catch (error) {
        console.error("Kabul ederken hata oluştu:", error);
    }
}

// 6. KABUL EDİLEN SOHBETLERİ LİSTELEME
function listenForContacts() {
    // İçinde bizim kullanıcı adımız geçen sohbetleri buluyoruz
    const q = query(collection(db, "chats"), where("users", "array-contains", currentUser));
    
    onSnapshot(q, (snapshot) => {
        const contactsList = document.getElementById("contacts-list");
        contactsList.innerHTML = "";
        
        snapshot.forEach((chatDoc) => {
            const data = chatDoc.data();
            // Sohbet odasındaki 2 kişiden bizim dışımızdaki (diğer) kişiyi bul
            const otherUser = data.users.find(u => u !== currentUser);
            
            const li = document.createElement("li");
            li.textContent = otherUser;
            // Listeden kişiye tıklanınca o sohbeti açacak
            li.onclick = () => openChat(chatDoc.id, otherUser);
            contactsList.appendChild(li);
        });
    });
}

// 7. SOHBET PENCERESİNİ AÇMA
window.openChat = function(chatId, otherUser) {
    const chatTitle = document.getElementById("chat-title");
    const messageInputs = document.getElementById("message-inputs");
    const messagesDiv = document.getElementById("messages");
    
    // Sağ taraftaki ekranı seçilen kişiye göre güncelle
    chatTitle.textContent = otherUser + " ile mesajlaşıyorsunuz";
    messageInputs.style.display = "flex"; // Mesaj yazma kutusunu aç
    messagesDiv.innerHTML = "<p style='color:#888; text-align:center;'>Burada mesajlarınız görünecek... (Sıradaki Adım)</p>";
}
