import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, getDoc, collection, addDoc, query, where, onSnapshot, deleteDoc, orderBy, serverTimestamp, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ⚠️ FIREBASE BİLGİLERİN
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
const DEFAULT_PP = "https://via.placeholder.com/50x50.png?text=PP";

// HTML Elementleri
const screens = { login: document.getElementById("login-screen"), main: document.getElementById("main-screen") };
const inputs = { user: document.getElementById("username"), pass: document.getElementById("password"), msg: document.getElementById("message-input") };
const buttons = { login: document.getElementById("login-btn"), sendMsg: document.getElementById("send-btn") };

// ==========================================
// 1️⃣ GİRİŞ VE PROFİL YÜKLEME SİSTEMİ
// ==========================================
buttons.login.addEventListener("click", async () => {
    const user = inputs.user.value.trim();
    const pass = inputs.pass.value.trim();
    if (!user || !pass) return;
    
    const userSnap = await getDoc(doc(db, "users", user));
    if (userSnap.exists() && userSnap.data().password === pass) {
        currentUser = user;
        const userData = userSnap.data();
        
        // Sağ-Sol menü geçişi
        screens.login.style.display = "none";
        screens.main.style.display = "flex";
        
        // Kullanıcı verilerini ekrana bas
        document.getElementById("current-user-display").textContent = currentUser;
        document.getElementById("sidebar-bio").textContent = userData.bio || "Merhaba! Ben DreaxAPP kullanıyorum.";
        document.getElementById("sidebar-pp").src = userData.pp || DEFAULT_PP;
        
        // Profil düzenleme penceresi için ön hazırlık
        document.getElementById("profilAciklama").value = userData.bio || "";
        document.getElementById("profilDuzenleOnizleme").src = userData.pp || DEFAULT_PP;
        
        listenForRequests();
        listenForContacts();
    } else {
        document.getElementById("error-msg").style.display = "block";
    }
});

// ==========================================
// 2️⃣ PROFİL DÜZENLEME SİSTEMİ (YENİ)
// ==========================================
const profilModal = document.getElementById("profilModal");
const profilPpSecici = document.getElementById("profilPpSecici");
const profilDuzenleOnizleme = document.getElementById("profilDuzenleOnizleme");
let base64YeniPp = null;

document.getElementById("btnProfilDuzenle").addEventListener("click", () => profilModal.style.display = "flex");
document.getElementById("close-profile-btn").addEventListener("click", () => profilModal.style.display = "none");

// Fotoğraf seçildiğinde önizleme yap
profilPpSecici.addEventListener("change", function() {
    const dosya = this.files[0];
    if (dosya) {
        const okuyucu = new FileReader();
        okuyucu.onload = function(e) {
            base64YeniPp = e.target.result;
            profilDuzenleOnizleme.src = base64YeniPp;
        }
        okuyucu.readAsDataURL(dosya);
    }
});

// Profil Değişikliklerini Kaydet
document.getElementById("profilKaydetBtn").addEventListener("click", async () => {
    const yeniBio = document.getElementById("profilAciklama").value.trim();
    const guncellenecekVeri = { bio: yeniBio };
    
    // Eğer yeni fotoğraf seçildiyse objeye ekle
    if (base64YeniPp) guncellenecekVeri.pp = base64YeniPp;
    
    // Veritabanını güncelle
    await updateDoc(doc(db, "users", currentUser), guncellenecekVeri);
    
    // Anında ekranı (Sol Sidebar) güncelle
    document.getElementById("sidebar-bio").textContent = yeniBio || "Merhaba! Ben DreaxAPP kullanıyorum.";
    if (base64YeniPp) document.getElementById("sidebar-pp").src = base64YeniPp;
    
    alert("Profilin başarıyla güncellendi!");
    profilModal.style.display = "none";
});

// ==========================================
// 3️⃣ İSTEK ATMA VE KİŞİ EKLEME
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
        document.getElementById("target-username").value = "";
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
            li.innerHTML = `<span style="flex:1;">${data.from}</span> <button style="background:green; color:white; border:none; padding:5px 10px; border-radius:3px; cursor:pointer;" onclick="acceptRequest('${reqDoc.id}', '${data.from}')">Kabul Et</button>`;
            list.appendChild(li);
        });
    });
}

window.acceptRequest = async function(requestId, fromUser) {
    await addDoc(collection(db, "chats"), { isGroup: false, users: [currentUser, fromUser] });
    await deleteDoc(doc(db, "requests", requestId));
};

// ==========================================
// 4️⃣ GRUP OLUŞTURMA SİSTEMİ
// ==========================================
const grupModal = document.getElementById("grupModal");
const gorselOnizleme = document.getElementById("gorselOnizleme");
const grupGorseli = document.getElementById("grupGorseli");
let base64GrupGorsel = ""; 

document.getElementById("btnGrupOlustur").addEventListener("click", () => grupModal.style.display = "flex");
document.getElementById("close-group-modal-btn").addEventListener("click", () => { grupModal.style.display = "none"; document.getElementById("grupForm").reset(); gorselOnizleme.style.display="none"; });

grupGorseli.addEventListener("change", function() {
    const dosya = this.files[0];
    if (dosya) {
        const okuyucu = new FileReader();
        okuyucu.onload = function(e) {
            base64GrupGorsel = e.target.result;
            gorselOnizleme.src = base64GrupGorsel;
            gorselOnizleme.style.display = "block";
        }
        okuyucu.readAsDataURL(dosya);
    }
});

document.getElementById("grupForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const ad = document.getElementById("grupAdi").value.trim();
    const uyelerHam = document.getElementById("grupUyeleri").value;
    
    // Üyeleri virgülle ayır, boşlukları temizle, kendini (admini) gruba ekle
    let uyeler = uyelerHam.split(',').map(u => u.trim()).filter(u => u !== "");
    if (!uyeler.includes(currentUser)) uyeler.push(currentUser);
    
    await addDoc(collection(db, "chats"), {
        isGroup: true,
        groupName: ad,
        groupImage: base64GrupGorsel || "https://via.placeholder.com/50x50.png?text=Grup",
        users: uyeler,
        admin: currentUser,
        createdAt: serverTimestamp()
    });
    
    alert(`"${ad}" grubu başarıyla oluşturuldu!`);
    grupModal.style.display = "none";
    document.getElementById("grupForm").reset();
    gorselOnizleme.style.display = "none";
    base64GrupGorsel = "";
});

// ==========================================
// 5️⃣ SOHBET LİSTESİ VE MESAJLAŞMA
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
                // Eğer Grupsa, kendi resmini yükle
                li.innerHTML = `<img src="${data.groupImage}" class="profile-icon"> <b>${data.groupName}</b>`;
                li.onclick = () => openChat(chatDoc.id, data.groupName, data.groupImage);
            } else {
                // Birebir Sohbet
                const otherUser = data.users.find(u => u !== currentUser);
                li.innerHTML = `<img src="${DEFAULT_PP}" class="profile-icon"> <span>${otherUser}</span>`;
                li.onclick = () => openChat(chatDoc.id, otherUser, DEFAULT_PP);
            }
            list.appendChild(li);
        });
    });
}

// Sohbeti Ekrana Açma
window.openChat = function(chatId, title, imageSrc) {
    currentChatId = chatId;
    document.getElementById("chat-title").textContent = title;
    
    const headerImg = document.getElementById("chat-header-img");
    headerImg.src = imageSrc;
    headerImg.style.display = "block";
    
    document.getElementById("message-inputs").style.display = "flex";
    
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
                div.innerHTML = `<div style="background:#333; color:white; padding:10px 15px; border-radius:15px 15px 15px 0; float:left; max-width:70%; word-wrap: break-word;"><span style="font-size:11px; color:#aaa; display:block; margin-bottom:3px;">${m.sender}</span>${m.text}</div><div style="clear:both;"></div>`;
            }
            messagesDiv.appendChild(div);
        });
        messagesDiv.scrollTop = messagesDiv.scrollHeight; // Ekranı en alta kaydır
    });
};

// Mesaj Gönderme
buttons.sendMsg.addEventListener("click", async () => {
    if (!currentChatId || !inputs.msg.value.trim()) return;
    const text = inputs.msg.value.trim();
    inputs.msg.value = "";
    await addDoc(collection(db, "chats", currentChatId, "messages"), { 
        text: text, 
        sender: currentUser, 
        timestamp: serverTimestamp() 
    });
});

inputs.msg.addEventListener("keypress", (e) => { if (e.key === "Enter") buttons.sendMsg.click(); });
