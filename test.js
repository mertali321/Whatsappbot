
let suAn;
let saat;
let dakika;

async function time(){
    suAn = new Date();
    saat = suAn.getHours().toString();
    dakika = suAn.getMinutes();
    textdakika= dakika.toString();
     if(dakika<10){
        asilsaat = saat+":"+"0"+dakika;
    }
    else{
       asilsaat = saat+":"+dakika;
    }
    
    return asilsaat;
    
    
}
console.log(asilsaat);