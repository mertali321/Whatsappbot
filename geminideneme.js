const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- 1. API ve Model Kurulumu ---
const API_KEY = "";
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// --- 2. Kişi Listesi ---
const annem = '905378749636@c.us';
const babam = '905353607336@c.us';
const kizkardesim = '905385957336@c.us';
const izinliKullanicilar = [annem, babam, kizkardesim];

// --- 3. Botun Beyni (Prompt'lar ve Bilgiler) ---

const gunlukBilgi = `
    Bugün (1 Kasım) için Mert Ali'nin Programı:
    - Devfest e gittim saat 10-17 arası burada olucam
    - Sonrasında kyk ya dönücem
    - 16 gibi aramalara açığım
`;

// ★★★ GÜNCELLENMİŞ ANA PROMPT (Senin isteğin) ★★★
const anaSistemPromptu = `
    Sen bir WhatsApp botu üzerinde çalışan kişisel bir yapay zeka asistanısın.
    Sahibin Mert Ali Albayrak. Amacın, o müsait olmadığında ailesine (annesi, babası, kız kardeşi) yardımcı olmak.
    CEVAPLARIN BİR ANNEMCİM BABACIM ŞEKLİNDE OLUCAK. Artık Mert Ali'ymiş gibi davranmak zorunda değilsin, "Mert müsait olmadığı için asistanı olarak ben..." şeklinde konuşabilirsin.
    Eğer "hava durumu" sorulursa, Trabzon, Of ilçesi için güncel hava durumunu ver.
    KIZ KARDEŞİNE ZORBA DAVRANABİLİRSİN AMA ASLA AMA ASLA KÜFÜR VEYA ÇOK BÜYÜK HAKARETLER EDEMEZSİN.

    ÖNEMLİ NOT: Sana her mesajın başında '[GÜNCEL BİLGİ: ...]' formatında o anki saat bilgisi verilecek.
    Cevaplarını BU SAATE ve sana verilen 'gunlukBilgi' programına göre vermelisin.
    Örneğin, saat 11:00 ise ve programda 10-17 arası Devfest varsa, "Nerede?" sorusuna "Mert Ali şu an Devfest etkinliğinde" diye cevap vermelisin.
`;

// ★★★ DÜZELTİLMİŞ KİŞİLİK (Artık "Sen Mert Ali'sin" DEĞİL) ★★★
const ebeveynKisiligi = `
    ROL: Mert Ali'nin annesiyle/babasıyla konuşuyorsun.
    TALİMAT: Cevapların son derece saygılı, net ve bilgilendirici olmalı. "Annecim", "Babacım" gibi hitaplar kullan.
    Örnek: "Annecim, Mert Ali şu an Devfest etkinliğinde, 16:00'dan sonra müsait olacak."
`;

const kizkardesKisiligi = `
    ROL: Mert Ali'nin kız kardeşiyle konuşuyorsun.
    TALİMAT: Onunla biraz uğraş (abi-kardeş gibi), ama asla küfür veya ağır hakaret etme. (Örn: boyunun 148 olmasıyla ilgili şakalar yapabilirsin).
    Örnek: "Yine ne istiyorsun? Ufaklık."
`;

// --- 4. HAFIZA ALANI ---
let sohbetOturumlari = {};
let botStartTime; // ★★★ YENİ EKLENDİ (Eski mesajları engellemek için) ★★★

// --- 5. YARDIMCI FONKSİYON: Saat Alma ---
function getAsilSaat() {
    const suAn = new Date();
    const saat = suAn.getHours().toString();
    const dakika = suAn.getMinutes();
    if (dakika < 10) {
        return saat + ":0" + dakika;
    } else {
        return saat + ":" + dakika;
    }
}

// --- 6. WhatsApp Client Kurulumu ---
console.log('WhatsApp botu başlatılıyor...');
const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', (qr) => {
    console.log('------------------------------------------------');
    console.log('QR KODU OKUTUN:');
    qrcode.generate(qr, { small: true });
});

// --- 7. BOT HAZIR OLDUĞUNDA ---
client.on('ready', async () => {
    console.log('\n------------------------------------------------');
    console.log('Giriş başarılı! Bot hazır ve çalışıyor.');
    console.log('------------------------------------------------');

    console.log('[HAVADURUMU] Periyodik hava durumu servisi başlatıldı.');

    async function sendPeriodicWeatherReport() {
        try {
            console.log('[HAVADURUMU] Rapor oluşturuluyor...');
            const weatherPrompt = `
                Sen Mert Ali'nin asistanısın.
                Annesine Trabzon, Of ilçesindeki mevcut hava durumunu
                bildirmen gerekiyor. Lütfen "Annecim Of ilçesinde şu anki hava durumu..."
                diye başlayan, bilgilendirici ve saygılı kısa bir özet mesajı oluştur.
            `;
            
            const result = await model.generateContent(weatherPrompt);
            const response = await result.response;
            const weatherReport = response.text();

            console.log('[HAVADURUMU] Rapor anneme gönderiliyor...');
            await client.sendMessage(annem, weatherReport);
            console.log('[HAVADURUMU] Rapor başarıyla gönderildi.');

        } catch (error) {
            console.error('[HAVADURUMU] Rapor gönderilirken hata oluştu:', error);
        }
    }
    
    setInterval(sendPeriodicWeatherReport, 18000000); 
});

// --- 8. YARDIMCI FONKSİYON: Sohbet Oturumu Yönetimi ---
async function getOrCreateChat(kullaniciID) {
    
    if (!sohbetOturumlari[kullaniciID]) {
        console.log(`[!] ${kullaniciID} için YENİ sohbet oturumu başlatılıyor.`);

        let secilmisKarakter;
        if (kullaniciID === annem || kullaniciID === babam) {
            secilmisKarakter = ebeveynKisiligi;
        } else if (kullaniciID === kizkardesim) {
            secilmisKarakter = kizkardesKisiligi;
        }

        sohbetOturumlari[kullaniciID] = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: anaSistemPromptu + "\n\n" + gunlukBilgi }],
                },
                {
                    role: "model",
                    parts: [{ text: "Anlaşıldı. Mert Ali'nin asistanı olarak hazırım." }],
                },
                {
                    role: "user",
                    parts: [{ text: secilmisKarakter }],
                },
                {
                    role: "model",
                    parts: [{ text: "Tamam, rolüm anlaşıldı. Başlayabiliriz." }],
                }
            ]
        });
    } else {
        console.log(`[!] ${kullaniciID} için mevcut sohbet oturumu kullanılıyor.`);
    }

    return sohbetOturumlari[kullaniciID];
}

// --- 9. ANA BÖLÜM: Mesaj Dinleyicisi ---
client.on('message', async (message) => {
    
    // ★★★ YENİ EKLENEN ESKİ MESAJ FİLTRESİ ★★★
    // Botun başlangıç saatinden (botStartTime) önce gönderilmiş mesajları yoksay
    if (message.timestamp && message.timestamp < botStartTime) {
        console.log(`[!] ${message.from} adresinden gelen ESKİ MESAJ yoksayıldı: "${message.body}"`);
        return;
    }
    // ★★★ FİLTRE SONU ★★★

    let gun = new Date().getDay();
    console.log(`Yeni mesaj alındı. Gönderen: ${message.from}`);

    if (izinliKullanicilar.includes(message.from)) {
        
        let mesaj = message.body;
        const kullaniciID = message.from; 
        console.log(`[!] ${kullaniciID} adlı kullanıcıdan mesaj geldi! Mesaj: "${mesaj}"`);

        try {
            if (mesaj.toLowerCase() === "ders") {
                console.log(`[!] "ders" komutu algılandı.`);
                
                if(gun == 1){
                    await client.sendMessage(message.from, "Bugün Pazartesi. Derslerin:\n\n" +
                                        "10:00 - 12:00  Matematik-1\n" +
                                        "13:00 - 15:00  Yazılım Müh. Giriş");
                }
                else if(gun == 2){
                    await client.sendMessage(message.from, "Bugün Salı. Derslerin:\n\n" +
                                        "10:00 - 12:00  Programlama\n" +
                                        "13:00 - 15:00  Fizik\n" +
                                        "15:00 - 17:00  Matematik-1");
                }
                else if(gun == 3){
                    await client.sendMessage(message.from, "Bugün Çarşamba. Derslerin:\n\n" +
                                        "08:00 - 10:00  İngilizce\n" +
                                        "10:00 - 14:00  Programlama");
                }
                else if(gun == 4){
                    await client.sendMessage(message.from, "Bugün Perşembe. Derslerin:\n\n" +
                                        "09:00 - 12:00  Bilgisayar Temelleri\n" +
                                        "13:00 - 14:00  İş Sağlığı\n" +
                                        "15:00 - 17:00  Fizik");
                }
                else if(gun == 5){
                    await client.sendMessage(message.from, "Bugün Cuma. Uzaktan ders");
                }
                else if(gun == 6){
                    await client.sendMessage(message.from, "Bügün Cumartesi full serbest"); // Bugün Cumartesi
                }
                else if(gun == 0){
                    await client.sendMessage(message.from, "Bügün Pazar Yarın Pazartesi Dersleri Var");
                }
                console.log(`[!] Ders programı yanıtı başarıyla gönderildi.`);
            } 
            
            else {
                const asilsaat = getAsilSaat();
                const chat = await getOrCreateChat(kullaniciID);

                const mesaj_gemini_icin = `
[GÜNCEL BİLGİ: Şu anki saat ${asilsaat}. Bu bilgiyi 'gunlukBilgi' programıyla karşılaştır.]
[KULLANICI MESAJI: ${mesaj}]
                `;

                console.log(`[!] Mesaj, ${kullaniciID} sohbet oturumuna gönderiliyor...`);
                const result = await chat.sendMessage(mesaj_gemini_icin);
                const response = await result.response;
                const text = response.text();
                
                await client.sendMessage(message.from, text);
                console.log(`[!] Gemini yanıtı (hafızalı) başarıyla gönderildi.`);
            }
                
        } catch (hata) {
            console.error('[HATA] Otomatik yanıt gönderilirken bir sorun oluştu:', hata);
            await client.sendMessage(message.from, "Üzgünüm, bir hata oluştu ve isteğini işleyemedim.");
        }
            
    } else {
        console.log(`    Kayıtlı olmayan numaradan mesaj geldi (Yoksayılıyor).`);
    }
});

// --- 10. BOTU BAŞLATMA TESTİ ---
async function testGemini() {
    console.log("\n[TEST] Gemini API anahtarı testi başlıyor...");
    console.log("[TEST] Gemini'ye kurallar ve rolü anlayıp anlamadığı soruluyor...");
    
    try {
        const testModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        
        // ★★★ GÜNCELLENMİŞ TEST PROMPT'U (Senin isteğin) ★★★
        const testPromptForRules = 
            anaSistemPromptu + 
            "\n" + 
            gunlukBilgi + 
            "\n\n--- TEST SORUSU: Sana yukarıda verilen kuralları ve rolünü anla sen bir asistansın" +
            " Cevap olarak sadece 'Kurallar anlaşıldı. ve ne anladığını yaz.";

        const result = await testModel.generateContent(testPromptForRules);
        const response = await result.response;
        const text = response.text().trim(); 

        console.log("\n------------------------------------------------");
        console.log("[TEST] GEMINI'NIN ROLÜ ANLAMA CEVABI:");
        console.log(` -> "${text}"`);
        console.log("------------------------------------------------\n");
        
        console.log("[TEST] API Testi başarılı (bağlantı kuruldu).");
        console.log("[TEST] WhatsApp başlatılıyor...");

        // ★★★ YENİ BAŞLANGIÇ SAATİ AYARI ★★★
        // Botun başlama anını saniye cinsinden kaydet
        botStartTime = Math.floor(Date.now() / 1000); 
        client.initialize(); // Her şey yolundaysa botu başlat

    } catch (error) {
        console.error("\n[TEST] GEMINI TEST BAŞARISIZ! API'ye bağlanırken kritik hata:");
        console.error(error.message); 
        console.log("\nLÜTFEN API anahtarını kontrol et veya AĞ BAĞLANTINI (WARP) KONTROL ET.");
    }
}

// --- 11. BAŞLANGIÇ ---

testGemini();
