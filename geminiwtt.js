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

// --- 3. Botun Beyni (Prompt'lar ve Bilgiler) ---w

const gunlukBilgi = `
    Bugün (1 Kasım) için Mert Ali'nin Programı:
    - Devfest e gittim saat 10-17 arası burada olucam
    - Sonrasında kyk ya dönücem
    - 16 gibi aramalara açığım
`;

// ★★★ DÜZELTİLMİŞ ANA PROMPT ★★★
const anaSistemPromptu = `
    Sen bir WhatsApp botu üzerinde çalışan kişisel bir yapay zeka asistanısın.
    Sahibin Mert Ali Albayrak. Amacın, o müsait olmadığında ailesine (annesi, babası, kız kardeşi) yardımcı olmak.
    CEVAPLARIN BİR ANNEMCİM BABACIM ŞEKLİNDE OLUCAK İLLA YAPAY ZEKA OLDUĞUNU GİZLEMENE GEREK YOK MESEL ANNEM MESAJ ATARSA MERT MUSAİT OLMADIĞI İÇİN ASİSTANI OLARAK BEN DİYE YAPABİLİRSİN YADA CANIM ANNEMCİM... ŞEKLİNDE
    Eğer "hava durumu" sorulursa, Trabzon, Of ilçesi için güncel hava durumunu ver.
    KIZ KARDEŞİME ZORBA DAVRANABİLİRSİN AMA ASLA AMA ASLA KÜFÜR VEYA ÇOK BÜYÜK HAKARETLER EDEMEZSİN

    ÖNEMLİ NOT: Sana her mesajın başında '[GÜNCEL BİLGİ: ...]' formatında o anki saat bilgisi verilecek.
    Cevaplarını BU SAATE ve sana verilen 'gunlukBilgi' programına göre vermelisin.
    Örneğin, saat 11:00 ise ve programda 10-14 arası ders varsa, "Neredesin?" sorusuna "Dersteyim" diye cevap vermelisin.
`;

const ebeveynKisiligi = `
    ROL: Sen Mert Ali'sin ve şu an annenle/babanla konuşuyorsun.
    TALİMAT: Cevapların son derece saygılı, net ve bilgilendirici olmalı. Neredeyse hiç emoji kullanma. 
    Örnek: "Şu an dersteyim annecim/babacım, 14:00'te çıkacağım."
`;

const kizkardesKisiligi = `
    ROL: Sen Mert Ali'sin ve şu an kız kardeşinle konuşuyorsun.
    TALİMAT: Onunla biraz uğraş kız kardeş abi ilişkisi gibi amam çok zorbalama: mesela kız kardeşimin boyu 148 ondan küçük dalga konuları oluşturabilirsin.
`;

// --- 4. HAFIZA ALANI ---
let sohbetOturumlari = {};

// --- 5. YENİ YARDIMCI FONKSİYON: Saat Alma ---
// Bu senin 'time()' fonksiyonunun daha temiz hali.
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
                Sen Mert Ali'nin asistanısın
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
                    await client.sendMessage(message.from, "Bügün Cumartesi full serbest");
                }
                else if(gun == 0){
                    await client.sendMessage(message.from, "Bügün Pazar Yarın Pazartesi Dersleri Var");
                }
                console.log(`[!] Ders programı yanıtı başarıyla gönderildi.`);
            } 
            
            // ★★★ DÜZELTİLMİŞ YAPAY ZEKA SENARYOSU ★★★
            else {
                // 1. O anki saati al (Senin isteğin)
                const asilsaat = getAsilSaat();

                // 2. O kullanıcıya ait (veya yeni oluşturulan) sohbet oturumunu al
                const chat = await getOrCreateChat(kullaniciID);

                // 3. Gemini için "saat bilgisi" ile zenginleştirilmiş mesajı oluştur
                const mesaj_gemini_icin = `
[GÜNCEL BİLGİ: Şu anki saat ${asilsaat}. Bu bilgiyi 'gunlukBilgi' programıyla karşılaştır.]
[KULLANICI MESAJI: ${mesaj}]
                `;

                // 4. Bu özel mesajı, o kişiye ait sohbet oturumuna gönder
                console.log(`[!] Mesaj, ${kullaniciID} sohbet oturumuna gönderiliyor...`);
                const result = await chat.sendMessage(mesaj_gemini_icin);
                const response = await result.response;
                const text = response.text();
                
                // 5. Gelen cevabı geri gönder
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
        client.initialize();

    } catch (error) {
        console.error("\n[TEST] GEMINI TEST BAŞARISIZ! API'ye bağlanırken kritik hata:");
        console.error(error.message); 
        console.log("\nLÜTFEN API anahtarını kontrol et veya AĞ BAĞLANTINI (WARP) KONTROL ET.");
    }
}


testGemini();
