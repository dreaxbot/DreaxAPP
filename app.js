import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, getDoc, collection, addDoc, query, where, onSnapshot, deleteDoc, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// KENDİ FIREBASE BİLGİLERİNİ BURAYA YAPIŞTIR
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
let currentChatId = null; // Hangi sohbette olduğumuzu takip etmek için

// ARAYÜZ ELEMENTLERİ (HTML'indeki id'lerin böyle olduğunu varsayıyorum)
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

// MESAJLAŞMA ELEMENTLERİ
const messageInput = document.getElementById("message-input"); 
const sendBtn = document.getElementById("send-btn"); // HTML'de butonun id'si farklıysa burayı ona göre düzelt!

// 1. GİRİŞ YAPMA
loginBtn.addEventListener("click", async () => {
    const user = usernameInput.value.trim();
    const pass = passwordInput.value.trim();
    if(user === "" || pass === "") return;
    const userSnap = await getDoc(doc(db, "users", user));
    if (userSnap.exists() && userSnap.data().password === pass) {
        currentUser = user;
        currentUserDisplay.textContent = currentUser;
        loginScreen.style.display = "none";
        mainScreen.style.display = "flex";
        listenForRequests();
        listenForContacts(); 
    } else {
        errorMsg.style.display = "block";
    }
});

// 2. İSTEK ATMA MODALI
addChatBtn.addEventListener("click", () => addChatModal.style.display = "flex");
closeModalBtn.addEventListener("click", () => { addChatModal.style.display = "none"; targetUsernameInput.value = ""; });

sendRequestBtn.addEventListener("click", async () => {
    const target = targetUsernameInput.value.trim();
    if(target === "" || target === currentUser) return;
    const targetSnap = await getDoc(doc(db, "users", target));
    if(targetSnap.exists()) {
        await addDoc(collection(db, "requests"), { from: currentUser, to: target, status: "pending" });
        alert("İstek gönderildi!");
        addChatModal.style.display = "none";
    } else {
        alert("Kullanıcı bulunamadı!");
    }
});

// 3. İSTEKLERİ DİNLEME VE KABUL ETME
function listenForRequests() {
    const q = query(collection(db, "requests"), where("to", "==", currentUser), where("status", "==", "pending"));
    onSnapshot(q, (snapshot) => {
        const requestsList = document.getElementById("requests-list");
        requestsList.innerHTML = ""; 
        snapshot.forEach((requestDoc) => {
            const data = requestDoc.data();
            const li = document.createElement("li");
            li.innerHTML = `${data.from} sana istek attı! <button style="background:green; color:white; border:none; padding:5px; margin-left:5px; cursor:pointer;" onclick="acceptRequest('${requestDoc.id}', '${data.from}')">Kabul Et</button>`;
            requestsList.appendChild(li);
        });
    });
}

window.acceptRequest = async function(requestId, fromUser) {
    await addDoc(collection(db, "chats"), { users: [currentUser, fromUser] });
    await deleteDoc(doc(db, "requests", requestId));
}

// 4. SOHBETLERİ LİSTELEME
function listenForContacts() {
    const q = query(collection(db, "chats"), where("users", "array-contains", currentUser));
    onSnapshot(q, (snapshot) => {
        const contactsList = document.getElementById("contacts-list");
        contactsList.innerHTML = "";
        snapshot.forEach((chatDoc) => {
            const data = chatDoc.data();
            const otherUser = data.users.find(u => u !== currentUser);
            const li = document.createElement("li");
            li.textContent = otherUser;
            li.onclick = () => openChat(chatDoc.id, otherUser);
            contactsList.appendChild(li);
        });
    });
}

// 5. SOHBETİ AÇMA VE MESAJLARI CANLI DİNLEME (YENİ EKLENDİ)
window.openChat = function(chatId, otherUser) {
    currentChatId = chatId; 
    document.getElementById("chat-title").textContent = otherUser;
    document.getElementById("message-inputs").style.display = "flex";
    
    const messagesDiv = document.getElementById("messages");
    
    // Mesajları zaman sırasına göre çekiyoruz
    const q = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp", "asc"));
    onSnapshot(q, (snapshot) => {
        messagesDiv.innerHTML = ""; 
        snapshot.forEach((msgDoc) => {
            const msgData = msgDoc.data();
            const p = document.createElement("p");
            
            // Mesajı biz attıysak sağda mavi, o attıysa solda gri görünsün
            if(msgData.sender === currentUser) {
                p.innerHTML = `<span style="background:#007bff; color:white; padding:8px 12px; border-radius:15px; float:right; margin:5px; max-width:70%;">${msgData.text}</span><div style="clear:both;"></div>`;
            } else {
                p.innerHTML = `<span style="background:#444; color:white; padding:8px 12px; border-radius:15px; float:left; margin:5px; max-width:70%;"><b>${msgData.sender}:</b> ${msgData.text}</span><div style="clear:both;"></div>`;
            }
            messagesDiv.appendChild(p);
        });
        messagesDiv.scrollTop = messagesDiv.scrollHeight; // Yeni mesaj gelince en alta kaydır
    });
}

// 6. MESAJ GÖNDERME BUTONU (YENİ EKLENDİ)
if(sendBtn) {
    sendBtn.addEventListener("click", async () => {
        if (!currentChatId) return; 
        const text = messageInput.value.trim();
        if (text === "") return; 

        messageInput.value = ""; // Gönderdikten sonra kutuyu temizle

        await addDoc(collection(db, "chats", currentChatId, "messages"), {
            text: text,
            sender: currentUser,
            timestamp: serverTimestamp() 
        });
    });
}
