const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');


const annem = '905378749636@c.us';
const babam = '905353607336@c.us';
const kendim = '905318570630@c.us';
const arkadas = '905333079430@c.us';
const arkadas2 = '905541821686@c.us';

console.log('WhatsApp botu başlatılıyor...');

const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', (qr) => {
    console.log('------------------------------------------------');
    console.log('Giriş yapmak için lütfen bu QR kodu telefonunuzdaki');
    console.log('WhatsApp > Bağlı Cihazlar > Cihaz Bağla menüsünden okutun:');
    console.log('------------------------------------------------');

    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('\n------------------------------------------------');
    console.log('Giriş başarılı! Bot hazır ve çalışıyor.');
    console.log('------------------------------------------------');
});

client.on('message', async (message) => {
    let gun = new Date().getDay();
    console.log(`Yeni mesaj alındı. Gönderen: ${message.from}`);

    if (message.from === annem || message.from === babam || message.from === kendim || message.from === arkadas || message.from === arkadas2) {
        let mesaj = message.body
        console.log(`[!] Hedef numaradan bir mesaj geldi!`);
        console.log(`    Gelen Mesaj: "${message.body}"`);

        try {
    if(mesaj == "ders" || mesaj == "Ders" || mesaj == "DERS"){
    if(gun == 1){
        
        await client.sendMessage(message.from, "Bugün Pazartesi. Derslerin:\n\n" +
                        "10:00 - 12:00  Matematik-1\n" +
                        "13:00 - 15:00  Yazılım Müh. Giriş");
        console.log(`[!] Otomatik yanıt başarıyla gönderildi.`);
    }
    else if(gun == 2)
    {
        
        await client.sendMessage(message.from, "Bugün Salı. Derslerin:\n\n" +
                        "10:00 - 12:00  Programlama\n" +
                        "13:00 - 15:00  Fizik\n" +
                        "15:00 - 17:00  Matematik-1");
        console.log(`[!] Otomatik yanıt başarıyla gönderildi.`);
    }
    else if(gun == 3){
        
        await client.sendMessage(message.from, "Bugün Çarşamba. Derslerin:\n\n" +
                        "08:00 - 10:00  İngilizce\n" +
                        "10:00 - 14:00  Programlama");
        console.log(`[!] Otomatik yanıt başarıyla gönderildi.`);
    }
    else if(gun == 4){
       
        await client.sendMessage(message.from, "Bugün Perşembe. Derslerin:\n\n" +
                        "09:00 - 12:00  Bilgisayar Temelleri\n" +
                        "13:00 - 14:00  İş Sağlığı\n" +
                        "15:00 - 17:00  Fizik");

    
    }
    else if(gun == 5){
        
        await client.sendMessage(message.from, "Bugün Cuma. Uzaktan ders");
        console.log(`[!] Otomatik yanıt başarıyla gönderildi.`);
    
    }
    else if(gun == 6){
        
        await client.sendMessage(message.from, "Bügün Cumartesi full serbest");
        console.log(`[!] Otomatik yanıt başarıyla gönderildi.`);
    }

    else if(gun == 0){
        
        await client.sendMessage(message.from, "Bügün Pazar Yarın Pazartesi Dersleri Var");
        console.log(`[!] Otomatik yanıt başarıyla gönderildi.`);
    
    }
    else{
             await client.sendMessage(message.from,"Lütfen Sadece Ders Yazınız");
            console.log(`[!] Otomatik yanıt başarıyla gönderildi.`);
    }
             }
              
        } catch (hata) {
            console.error('[HATA] Otomatik yanıt gönderilirken bir sorun oluştu:', hata);
        }
        
    } else {
        console.log(`    Kayıtlı Numaralardan mesaj gelmedi`);
    }
});

client.initialize();
