import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, getDoc, collection, addDoc, query, where, onSnapshot, deleteDoc, orderBy, serverTimestamp, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==========================================
// ⚙️ FİREBASE YAPILANDIRMASI
// ==========================================
const firebaseConfig = {
    apiKey: "SENIN_API_KEY_BURAYA",
    authDomain: "dreaxapp.firebaseapp.com",
    projectId: "dreaxapp",
    storageBucket: "dreaxapp.appspot.com",
    messagingSenderId: "...",
    appId: "..."
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let currentUser = "";
let currentChatId = null;

// DOM ELEMENTLERİ
const screens = { login: document.getElementById("login-screen"), main: document.getElementById("main-screen") };
const inputs = { user: document.getElementById("username"), pass: document.getElementById("password"), msg: document.getElementById("message-input") };
const buttons = { login: document.getElementById("login-btn"), sendMsg: document.getElementById("send-btn"), voiceCall: document.getElementById("voice-call-btn") };

// ==========================================
// 1️⃣ GİRİŞ VE KİMLİK DOĞRULAMA
// ==========================================
buttons.login.addEventListener("click", async () => {
    const user = inputs.user.value.trim();
    const pass = inputs.pass.value.trim();
    if (!user || !pass) return;
    
    const userSnap = await getDoc(doc(db, "users", user));
    if (userSnap.exists() && userSnap.data().password === pass) {
        currentUser = user;
        document.getElementById("current-user-display").textContent = currentUser;
        screens.login.style.display = "none";
        screens.main.style.display = "flex";
        
        listenForRequests();
        listenForContacts();
    } else {
        document.getElementById("error-msg").style.display = "block";
    }
});

// ==========================================
// 2️⃣ KİŞİ EKLEME (BİREBİR)
// ==========================================
const addChatModal = document.getElementById("add-chat-modal");
document.getElementById("add-chat-btn").addEventListener("click", () => addChatModal.style.display = "flex");
document.getElementById("close-modal-btn").addEventListener("click", () => addChatModal.style.display = "none");

document.getElementById("send-request-btn").addEventListener("click", async () => {
    const target = document.getElementById("target-username").value.trim();
    if(!target || target === currentUser) return;
    
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
        const list = document.getElementById("requests-list");
        list.innerHTML = "";
        snapshot.forEach((reqDoc) => {
            const data = reqDoc.data();
            const li = document.createElement("li");
            li.innerHTML = `<span>${data.from}</span> <button style="background:green; color:white; border:none; padding:5px 10px; border-radius:3px; cursor:pointer;" onclick="acceptRequest('${reqDoc.id}', '${data.from}')">Kabul Et</button>`;
            list.appendChild(li);
        });
    });
}

window.acceptRequest = async function(requestId, fromUser) {
    await addDoc(collection(db, "chats"), { isGroup: false, users: [currentUser, fromUser] });
    await deleteDoc(doc(db, "requests", requestId));
};

// ==========================================
// 3️⃣ GRUP OLUŞTURMA SİSTEMİ
// ==========================================
const grupModal = document.getElementById("grupModal");
const gorselOnizleme = document.getElementById("gorselOnizleme");
const dosyaSecici = document.getElementById("grupGorseli");

document.getElementById("btnGrupOlustur").addEventListener("click", () => grupModal.style.display = "flex");
document.getElementById("close-group-modal-btn").addEventListener("click", () => { grupModal.style.display = "none"; document.getElementById("grupForm").reset(); gorselOnizleme.style.display="none"; });

let base64Gorsel = ""; // Resmi metin formatında tutmak için

dosyaSecici.addEventListener("change", function() {
    const dosya = this.files[0];
    if (dosya) {
        const okuyucu = new FileReader();
        okuyucu.onload = function(e) {
            base64Gorsel = e.target.result;
            gorselOnizleme.src = base64Gorsel;
            gorselOnizleme.style.display = "block";
        }
        okuyucu.readAsDataURL(dosya);
    }
});

document.getElementById("grupForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const ad = document.getElementById("grupAdi").value.trim();
    const uyelerHam = document.getElementById("grupUyeleri").value;
    
    // Üyeleri ayır, boşlukları sil, kendini ekle
    let uyeler = uyelerHam.split(',').map(u => u.trim()).filter(u => u !== "");
    uyeler.push(currentUser); // Grubu kuranı otomatik ekle
    
    await addDoc(collection(db, "chats"), {
        isGroup: true,
        groupName: ad,
        groupImage: base64Gorsel, // Resmi veritabanına kaydet
        users: uyeler,
        admin: currentUser,
        createdAt: serverTimestamp()
    });
    
    alert(`"${ad}" grubu oluşturuldu!`);
    grupModal.style.display = "none";
    document.getElementById("grupForm").reset();
    gorselOnizleme.style.display = "none";
    base64Gorsel = "";
});

// ==========================================
// 4️⃣ SOHBET LİSTESİ VE MESAJLAŞMA
// ==========================================
function listenForContacts() {
    const q = query(collection(db, "chats"), where("users", "array-contains", currentUser));
    onSnapshot(q, (snapshot) => {
        const list = document.getElementById("contacts-list");
        list.innerHTML = "";
        snapshot.forEach((chatDoc) => {
            const data = chatDoc.data();
            const li = document.createElement("li");
            
            if (data.isGroup) {
                // Grup ise grup adını ve görselini göster
                const img = data.groupImage ? `<img src="${data.groupImage}" class="group-icon">` : '👥';
                li.innerHTML = `${img} <b>${data.groupName}</b>`;
                li.onclick = () => openChat(chatDoc.id, data.groupName, true);
            } else {
                // Birebir sohbet ise karşı tarafın adını göster
                const otherUser = data.users.find(u => u !== currentUser);
                li.innerHTML = `👤 ${otherUser}`;
                li.onclick = () => openChat(chatDoc.id, otherUser, false);
            }
            list.appendChild(li);
        });
    });
}

window.openChat = function(chatId, title, isGroup) {
    currentChatId = chatId;
    document.getElementById("chat-title").textContent = title;
    document.getElementById("message-inputs").style.display = "flex";
    
    // Sesli aramayı grup değilse göster (WebRTC Mesh karmaşasını önlemek için)
    buttons.voiceCall.style.display = isGroup ? "none" : "block"; 
    
    const messagesDiv = document.getElementById("messages");
    const q = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp", "asc"));
    onSnapshot(q, (snapshot) => {
        messagesDiv.innerHTML = "";
        snapshot.forEach((msgDoc) => {
            const m = msgDoc.data();
            const div = document.createElement("div");
            if(m.sender === currentUser) {
                div.innerHTML = `<div style="background:#0084ff; color:white; padding:10px 15px; border-radius:15px 15px 0 15px; float:right; max-width:70%; word-wrap: break-word;">${m.text}</div><div style="clear:both;"></div>`;
            } else {
                div.innerHTML = `<div style="background:#333; color:white; padding:10px 15px; border-radius:15px 15px 15px 0; float:left; max-width:70%; word-wrap: break-word;"><span style="font-size:11px; color:#aaa; display:block;">${m.sender}</span>${m.text}</div><div style="clear:both;"></div>`;
            }
            messagesDiv.appendChild(div);
        });
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });

    listenForCalls(); // Odaya girince WebRTC çağrılarını dinle
};

buttons.sendMsg.addEventListener("click", async () => {
    if (!currentChatId || !inputs.msg.value.trim()) return;
    const text = inputs.msg.value.trim();
    inputs.msg.value = "";
    await addDoc(collection(db, "chats", currentChatId, "messages"), { text: text, sender: currentUser, timestamp: serverTimestamp() });
});

// Enter tuşuyla mesaj gönderme
inputs.msg.addEventListener("keypress", (e) => { if (e.key === "Enter") buttons.sendMsg.click(); });

// ==========================================
// 🎙️ 5️⃣ WEBRTC SES MOTORU VE ÇALDIRMA (BİREBİR)
// ==========================================
const servers = { iceServers: [{ urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }] };
let localStream, remoteStream, peerConnection;

const incomingCallScreen = document.getElementById("incoming-call-screen");
const callerName = document.getElementById("caller-name");
const ringtone = document.getElementById("ringtone");

buttons.voiceCall.addEventListener("click", async () => {
    if (buttons.voiceCall.style.backgroundColor === "red") {
        hangUp();
    } else {
        await createCall();
    }
});

async function createCall() {
    buttons.voiceCall.style.backgroundColor = "red";
    buttons.voiceCall.textContent = "📞 Aramayı Kapat";

    const callDoc = doc(db, "chats", currentChatId, "calls", "currentCall");
    const offerCandidates = collection(callDoc, "offerCandidates");
    const answerCandidates = collection(callDoc, "answerCandidates");

    localStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
    document.getElementById("local-audio").srcObject = localStream;
    peerConnection = new RTCPeerConnection(servers);
    
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    peerConnection.ontrack = (e) => document.getElementById("remote-audio").srcObject = e.streams[0];

    peerConnection.onicecandidate = (e) => { if (e.candidate) addDoc(offerCandidates, e.candidate.toJSON()); };

    const offerDescription = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offerDescription);
    await setDoc(callDoc, { offer: { sdp: offerDescription.sdp, type: offerDescription.type }, caller: currentUser });

    onSnapshot(callDoc, (snapshot) => {
        const data = snapshot.data();
        if (!peerConnection.currentRemoteDescription && data?.answer) {
            peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
    });

    onSnapshot(answerCandidates, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') peerConnection.addIceCandidate(new RTCIceCandidate(change.doc.data()));
        });
    });
}

function listenForCalls() {
    const callDoc = doc(db, "chats", currentChatId, "calls", "currentCall");
    onSnapshot(callDoc, (snapshot) => {
        const data = snapshot.data();
        if (data?.offer && data.caller !== currentUser && !peerConnection) {
            incomingCallScreen.style.display = "block";
            callerName.textContent = `${data.caller} arıyor...`;
            ringtone.play().catch(e => console.log("Ses çalma izni gerekli"));
        }
    });
}

document.getElementById("answer-btn").addEventListener("click", async () => {
    incomingCallScreen.style.display = "none";
    ringtone.pause(); ringtone.currentTime = 0;
    buttons.voiceCall.style.backgroundColor = "red";
    buttons.voiceCall.textContent = "📞 Aramayı Kapat";

    const callDoc = doc(db, "chats", currentChatId, "calls", "currentCall");
    const offerCandidates = collection(callDoc, "offerCandidates");
    const answerCandidates = collection(callDoc, "answerCandidates");

    localStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
    document.getElementById("local-audio").srcObject = localStream;
    peerConnection = new RTCPeerConnection(servers);

    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    peerConnection.ontrack = (e) => document.getElementById("remote-audio").srcObject = e.streams[0];

    peerConnection.onicecandidate = (e) => { if (e.candidate) addDoc(answerCandidates, e.candidate.toJSON()); };

    const callData = (await getDoc(callDoc)).data();
    await peerConnection.setRemoteDescription(new RTCSessionDescription(callData.offer));
    const answerDescription = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answerDescription);

    await updateDoc(callDoc, { answer: { type: answerDescription.type, sdp: answerDescription.sdp } });

    onSnapshot(offerCandidates, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') peerConnection.addIceCandidate(new RTCIceCandidate(change.doc.data()));
        });
    });
});

document.getElementById("reject-btn").addEventListener("click", hangUp);

async function hangUp() {
    incomingCallScreen.style.display = "none";
    ringtone.pause(); ringtone.currentTime = 0;
    buttons.voiceCall.style.backgroundColor = "#28a745";
    buttons.voiceCall.textContent = "📞 Sesli Ara";

    if (peerConnection) { peerConnection.close(); peerConnection = null; }
    if (localStream) localStream.getTracks().forEach(track => track.stop());
    
    if (currentChatId) await deleteDoc(doc(db, "chats", currentChatId, "calls", "currentCall"));
}
