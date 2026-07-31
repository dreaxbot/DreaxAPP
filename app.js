import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, getDoc, collection, addDoc, query, where, onSnapshot, deleteDoc, orderBy, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ⚠️ KENDİ FIREBASE BİLGİLERİNİ BURAYA YAPIŞTIR ⚠️
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
let currentChatId = null;

// ==========================================
// 🖥️ ARAYÜZ VE HTML ELEMENTLERİ
// ==========================================
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

const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const voiceCallBtn = document.getElementById("voice-call-btn");

// ==========================================
// 1️⃣ GİRİŞ YAPMA SİSTEMİ
// ==========================================
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

// ==========================================
// 2️⃣ İSTEK ATMA VE KABUL ETME SİSTEMİ
// ==========================================
addChatBtn.addEventListener("click", () => addChatModal.style.display = "flex");
closeModalBtn.addEventListener("click", () => { addChatModal.style.display = "none"; targetUsernameInput.value = ""; });

sendRequestBtn.addEventListener("click", async () => {
    const target = targetUsernameInput.value.trim();
    if(target === "" || target === currentUser) return;
    
    const targetSnap = await getDoc(doc(db, "users", target));
    if(targetSnap.exists()) {
        await addDoc(collection(db, "requests"), { from: currentUser, to: target, status: "pending" });
        alert("İstek başarıyla gönderildi!");
        addChatModal.style.display = "none";
    } else {
        alert("Böyle bir kullanıcı bulunamadı!");
    }
});

function listenForRequests() {
    const q = query(collection(db, "requests"), where("to", "==", currentUser), where("status", "==", "pending"));
    onSnapshot(q, (snapshot) => {
        const requestsList = document.getElementById("requests-list");
        requestsList.innerHTML = "";
        snapshot.forEach((requestDoc) => {
            const data = requestDoc.data();
            const li = document.createElement("li");
            li.innerHTML = `${data.from} sana istek attı! <button style="background:green; color:white; border:none; padding:5px; margin-left:5px; border-radius:3px; cursor:pointer;" onclick="acceptRequest('${requestDoc.id}', '${data.from}')">Kabul Et</button>`;
            requestsList.appendChild(li);
        });
    });
}

window.acceptRequest = async function(requestId, fromUser) {
    await addDoc(collection(db, "chats"), { users: [currentUser, fromUser] });
    await deleteDoc(doc(db, "requests", requestId));
}

// ==========================================
// 3️⃣ SOHBET PENCERESİ VE MESAJLAŞMA SİSTEMİ
// ==========================================
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

window.openChat = function(chatId, otherUser) {
    currentChatId = chatId;
    
    // Sağ tarafı aktif et
    document.getElementById("chat-title").textContent = otherUser;
    document.getElementById("message-inputs").style.display = "flex";
    voiceCallBtn.style.display = "block"; // Sesli Arama butonunu görünür yap
    
    const messagesDiv = document.getElementById("messages");
    
    // Mesajları çek ve ekrana bas
    const q = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp", "asc"));
    onSnapshot(q, (snapshot) => {
        messagesDiv.innerHTML = "";
        snapshot.forEach((msgDoc) => {
            const msgData = msgDoc.data();
            const p = document.createElement("p");
            
            if(msgData.sender === currentUser) {
                p.innerHTML = `<span style="background:#007bff; color:white; padding:8px 12px; border-radius:15px; float:right; margin:5px; max-width:70%;">${msgData.text}</span><div style="clear:both;"></div>`;
            } else {
                p.innerHTML = `<span style="background:#444; color:white; padding:8px 12px; border-radius:15px; float:left; margin:5px; max-width:70%;"><b>${msgData.sender}:</b> ${msgData.text}</span><div style="clear:both;"></div>`;
            }
            messagesDiv.appendChild(p);
        });
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
}

if(sendBtn) {
    sendBtn.addEventListener("click", async () => {
        if (!currentChatId) return;
        const text = messageInput.value.trim();
        if (text === "") return;

        messageInput.value = ""; // Kutuyu temizle

        await addDoc(collection(db, "chats", currentChatId, "messages"), {
            text: text,
            sender: currentUser,
            timestamp: serverTimestamp()
        });
    });
}

// ==========================================
// 🎙️ 4️⃣ DİSCORD KALİTESİNDE GRUP SES SİSTEMİ
// ==========================================

const voiceConstraints = {
    audio: {
        echoCancellation: true,    // Yankı önleme
        noiseSuppression: true,    // Arka plan gürültü engelleme
        autoGainControl: true,     // Ses seviyesini otomatik dengeleme
        sampleRate: 48000,
        channelCount: 1
    },
    video: false
};

let localStream = null;
let peerConnections = {};

if(voiceCallBtn) {
    voiceCallBtn.addEventListener("click", async () => {
        if (!currentChatId) return;
        
        if (voiceCallBtn.style.backgroundColor === "red") {
            leaveVoiceChat();
        } else {
            await startVoiceChat();
        }
    });
}

async function startVoiceChat() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia(voiceConstraints);
        document.getElementById("local-audio").srcObject = localStream;
        
        voiceCallBtn.innerHTML = "📞 Aramayı Kapat";
        voiceCallBtn.style.backgroundColor = "red";
        alert("Mikrofon açıldı, gürültü engelleme devrede! Odaya bağlanılıyor...");

        const callDocRef = doc(db, "chats", currentChatId, "call_room", "main_room");
        
        await setDoc(callDocRef, {
            activeUsers: {
                [currentUser]: "joined"
            }
        }, { merge: true });

        listenForGroupMembers(callDocRef);

    } catch (error) {
        console.error("Mikrofon hatası:", error);
        alert("Mikrofon izni vermeniz gerekiyor!");
    }
}

function listenForGroupMembers(callDocRef) {
    onSnapshot(callDocRef, (snapshot) => {
        if (!snapshot.exists()) return;
        
        const data = snapshot.data();
        if (data && data.activeUsers) {
            Object.keys(data.activeUsers).forEach(user => {
                if (user !== currentUser && !peerConnections[user]) {
                    console.log(user + " odaya katıldı. Bağlantı kuruluyor...");
                }
            });
        }
    });
}

async function leaveVoiceChat() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    
    voiceCallBtn.innerHTML = "📞 Sesli Ara";
    voiceCallBtn.style.backgroundColor = "#28a745";
    
    if (currentChatId) {
        const callDocRef = doc(db, "chats", currentChatId, "call_room", "main_room");
        await setDoc(callDocRef, {
            activeUsers: {
                [currentUser]: null
            }
        }, { merge: true });
    }
    
    peerConnections = {};
    alert("Aramadan çıkıldı.");
}
