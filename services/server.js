require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");
const {GoogleGenAI}=require("@google/genai");

const app = express();

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

// =========================
// VALIDAR CPF
// =========================

function validarCPF(cpf){

cpf=cpf.replace(/\D/g,'');

if(cpf.length!==11)return false;

if(/^(\d)\1+$/.test(cpf))
return false;

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
numeros.length===10 ||
numeros.length===11 ||
numeros.length===13
){
return "TELEFONE";
}

if(
texto.length>=25 &&
texto.length<=36 &&
!texto.includes("@")
){
return "PIX";
}

if(
texto.includes("http") ||
texto.includes(".com") ||
texto.includes(".xyz")
){
return "SITE";
}

return "DESCONHECIDO";

}

function analisarRisco(texto){

texto=texto.toLowerCase();

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
"urgente"
];

suspeitos.forEach(item=>{

if(texto.includes(item)){

score+=20;
motivos.push(`Possui ${item}`);

}

});

return{
score,
motivos
};

}

// =========================
// VERIFICAR
// =========================

app.post("/api/verificar",async(req,res)=>{

try{

const {
texto,
usuario_id
}=req.body;

if(!texto){

return res.status(400)
.json({
erro:"Texto não enviado"
});

}

const tipo=
detectarTipo(texto);

const analise=
analisarRisco(texto);

let score=
analise.score;

let motivo=
analise.motivos.join(", ");

const {data:denunciasBanco}=await supabase
.from("lista_negra")
.select("*")
.eq("conteudo",texto);

if(tipo==="SITE"){

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

if(
google.data &&
google.data.matches
){

score+=100;

motivo+=
", Detectado pelo Google Safe Browsing";

}

}catch{}

}

let status="SEGURO";

try{

const prompt=`

Você é uma IA antifraude.

Conteúdo:
${texto}

Tipo:
${tipo}

Score:
${score}

Motivos:
${motivo}

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

let textoIA=
resposta.text
.replace(/```json/g,"")
.replace(/```/g,"")
.trim();

const resultado=
JSON.parse(textoIA);

status=
resultado.status;

motivo=
resultado.motivo;

}catch{

// FALLBACK

if(score>=70){

status="ALTO RISCO";

}else if(score>=30){

status="SUSPEITO";

}

if(tipo==="CPF"){
motivo=
"CPF identificado e validado estruturalmente.";
}

if(tipo==="TELEFONE"){
motivo=
"Número identificado como telefone.";
}

if(tipo==="PIX"){
motivo=
"Chave PIX identificada.";
}

}

await supabase
.from("verificacoes")
.insert([{

conteudo:texto,
tipo,
resultado:status,
score,
risco:motivo,
usuario_id

}]);

return res.json({

tipo,
status,
score,
denuncias:
denunciasBanco?.length||0,
motivo

});

}catch(error){

console.log(error);

return res.status(500)
.json({
erro:"Erro ao verificar"
});

}

});

const PORT=
process.env.PORT||3000;

app.listen(
PORT,
()=>{

console.log(
"Servidor AntiGolpe rodando"
);

});