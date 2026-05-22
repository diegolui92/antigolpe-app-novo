require("dotenv").config();

const express=require("express");
const cors=require("cors");
const axios=require("axios");
const {createClient}=require("@supabase/supabase-js");
const {GoogleGenAI}=require("@google/genai");

const app=express();

app.use(cors());
app.use(express.json());

const GOOGLE_SAFE_KEY=
process.env.GOOGLE_SAFE_BROWSING_KEY;

const URLSCAN_KEY=
process.env.URLSCAN_API_KEY;

const WHOIS_KEY=
process.env.WHOIS_API_KEY;

const GEMINI_API_KEY=
process.env.GEMINI_API_KEY;

const supabase=createClient(
process.env.SUPABASE_URL,
process.env.SUPABASE_ANON_KEY
);

const ai=new GoogleGenAI({
apiKey:GEMINI_API_KEY
});

function validarCPF(cpf){

cpf=cpf.replace(/\D/g,'');

if(cpf.length!==11)return false;
if(/^(\d)\1+$/.test(cpf))return false;

let soma=0;

for(let i=0;i<9;i++){
soma+=parseInt(cpf.charAt(i))*(10-i);
}

let resto=(soma*10)%11;

if(resto===10||resto===11)
resto=0;

if(resto!==parseInt(cpf.charAt(9)))
return false;

soma=0;

for(let i=0;i<10;i++){
soma+=parseInt(cpf.charAt(i))*(11-i);
}

resto=(soma*10)%11;

if(resto===10||resto===11)
resto=0;

return resto===parseInt(cpf.charAt(10));

}

function detectarTipo(texto){

texto=texto.trim();

if(texto.includes("@"))
return "EMAIL";

const numeros=
texto.replace(/\D/g,'');

if(
numeros.length===11 &&
validarCPF(numeros)
){
return "CPF";
}

if(
texto.length>=25 &&
texto.length<=36 &&
!texto.includes("@")
){
return "PIX";
}

if(
numeros.length===10 ||
numeros.length===11 ||
numeros.length===13
){
return "TELEFONE";
}

if(
texto.includes("http") ||
texto.includes(".")
){
return "SITE";
}

return "DESCONHECIDO";

}

function extrairDominio(url){

return url
.replace("https://","")
.replace("http://","")
.replace("www.","")
.split("/")[0]
.toLowerCase();

}

function analisarRisco(texto){

texto=
texto.toLowerCase();

let score=0;
let motivos=[];

const suspeitos=[

".xyz",
"bit.ly",
"tinyurl",
"ganhe",
"pix",
"bonus",
"premio",
"urgente",
"senha",
"login",
"seguranca"

];

suspeitos.forEach(item=>{

if(texto.includes(item)){

score+=15;

motivos.push(
`Indicador suspeito: ${item}`
);

}

});

const marcas=[

"google",
"youtube",
"facebook",
"netflix",
"mercadolivre",
"instagram",
"amazon",
"nubank"

];

marcas.forEach(marca=>{

if(

texto.includes(`${marca}.com.`)
||
texto.includes(`${marca}.com.com`)
||
texto.includes(`${marca}.xyz`)
||
texto.includes(`${marca}-`)
||
texto.includes(`${marca}login`)
||
texto.includes(`${marca}seguranca`)

){

score+=70;

motivos.push(
`Possível falsificação de ${marca}`
);

}

});

return{
score,
motivos
};

}

app.post("/api/verificar",async(req,res)=>{

try{

const {texto,usuario_id}=req.body;

const tipo=
detectarTipo(texto);

const analise=
analisarRisco(texto);

let score=
analise.score;

let motivos=[
...analise.motivos
];

const {data:denunciasBanco}=await supabase
.from("lista_negra")
.select("*")
.eq("conteudo",texto);

const totalDenuncias=
denunciasBanco?.length||0;

if(totalDenuncias>0){

score+=totalDenuncias*10;

motivos.push(
`${totalDenuncias} denúncias encontradas`
);

}

if(tipo==="SITE"){

const dominio=
extrairDominio(texto);

try{

const google=
await axios.post(
`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${GOOGLE_SAFE_KEY}`,
{
client:{
clientId:"antigolpe",
clientVersion:"1.0"
},
threatInfo:{
threatTypes:[
"MALWARE",
"SOCIAL_ENGINEERING",
"UNWANTED_SOFTWARE"
],
platformTypes:[
"ANY_PLATFORM"
],
threatEntryTypes:[
"URL"
],
threatEntries:[
{
url:texto
}
]
}
}
);

if(google.data.matches){

score+=100;

motivos.push(
"Google Safe Browsing detectou ameaça"
);

}

}catch{}

try{

const whois=
await axios.get(
`https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=${WHOIS_KEY}&domainName=${dominio}&outputFormat=JSON`
);

const criado=
whois.data
?.WhoisRecord
?.createdDate;

if(criado){

const dias=
(Date.now()-new Date(criado))
/86400000;

if(dias<30){

score+=40;

motivos.push(
"Domínio criado recentemente"
);

}

}

}catch{}

try{

await axios.post(
"https://urlscan.io/api/v1/scan/",
{
url:texto,
visibility:"public"
},
{
headers:{
"API-Key":URLSCAN_KEY
}
}
);

motivos.push(
"URL verificada globalmente"
);

}catch{}

}

let status="SEGURO";
let confianca=99;
let motivoFinal="";

try{

const prompt=`
Analise antifraude:

Texto:${texto}
Tipo:${tipo}
Score:${score}
Motivos:${motivos.join(",")}

Retorne JSON:
{
"status":"",
"motivo":""
}
`;

const resposta=
await ai.models.generateContent({

model:"gemini-2.5-flash",
contents:prompt

});

const textoIA=
resposta.text
.replace(/```json/g,"")
.replace(/```/g,"")
.trim();

const resultado=
JSON.parse(textoIA);

status=
resultado.status;

motivoFinal=
resultado.motivo;

}catch{

if(score>=70){

status="ALTO RISCO";
confianca=95;

}else if(score>=30){

status="SUSPEITO";
confianca=85;

}

if(tipo==="EMAIL"){
motivoFinal=
"Email identificado e analisado.";
}

if(tipo==="PIX"){
motivoFinal=
"Chave PIX identificada.";
}

if(tipo==="TELEFONE"){
motivoFinal=
"Número telefônico identificado.";
}

if(tipo==="CPF"){
motivoFinal=
"CPF validado estruturalmente.";
}

if(tipo==="SITE"){
motivoFinal=
motivos.join(". ");
}

}

await supabase
.from("verificacoes")
.insert([{
conteudo:texto,
tipo,
resultado:status,
score,
risco:motivoFinal,
usuario_id
}]);

return res.json({
tipo,
status,
score,
confianca,
denuncias:totalDenuncias,
motivo:motivoFinal
});

}catch(error){

console.log(error);

return res.status(500).json({
erro:"Erro verificar"
});

}

});

const PORT=
process.env.PORT||3000;

app.listen(PORT,()=>{

console.log(
"Servidor AntiGolpe rodando"
);

});