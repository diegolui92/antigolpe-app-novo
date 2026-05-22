require("dotenv").config();

const express=require("express");
const cors=require("cors");
const axios=require("axios");
const {createClient}=require("@supabase/supabase-js");

const app=express();

app.use(cors());
app.use(express.json());

const GOOGLE_SAFE_KEY=process.env.GOOGLE_SAFE_BROWSING_KEY;
const URLSCAN_KEY=process.env.URLSCAN_API_KEY;
const WHOIS_KEY=process.env.WHOIS_API_KEY;

const supabase=createClient(
process.env.SUPABASE_URL,
process.env.SUPABASE_ANON_KEY
);

function validarCPF(cpf){

cpf=cpf.replace(/\D/g,'');

if(cpf.length!==11)return false;
if(/^(\d)\1+$/.test(cpf))return false;

let soma=0;

for(let i=0;i<9;i++){
soma+=parseInt(cpf[i])*(10-i);
}

let resto=(soma*10)%11;

if(resto>=10)resto=0;

if(resto!==parseInt(cpf[9]))
return false;

soma=0;

for(let i=0;i<10;i++){
soma+=parseInt(cpf[i])*(11-i);
}

resto=(soma*10)%11;

if(resto>=10)resto=0;

return resto===parseInt(cpf[10]);

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
numeros.length>=10 &&
numeros.length<=13
){
return "TELEFONE";
}

if(
texto.includes("http")
||
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

function calcularConfianca(score){

if(score>=100)return 98;
if(score>=70)return 95;
if(score>=40)return 85;
if(score>=20)return 75;

return 99;

}

function analisarRisco(texto){

texto=texto.toLowerCase();

let score=0;
let motivos=[];

const dominio=
extrairDominio(texto);

const suspeitos=[

".xyz",
"ganhe",
"pix",
"bonus",
"premio",
"urgente",
"senha",
"login",
"seguranca",
"verificacao",
"bloqueado",
"atualizar"

];

suspeitos.forEach(item=>{

if(texto.includes(item)){

score+=15;

motivos.push(
`Indicador suspeito: ${item}`
);

}

});

const encurtadores=[

"bit.ly",
"tinyurl",
"cutt.ly"

];

encurtadores.forEach(item=>{

if(texto.includes(item)){

score+=40;

motivos.push(
`Encurtador detectado: ${item}`
);

}

});

const partes=
dominio.split(".");

if(partes.length>3){

score+=30;

motivos.push(
"Subdomínios excessivos detectados"
);

}

// ETAPA 13

const regexIP=
/\b(?:\d{1,3}\.){3}\d{1,3}\b/;

if(regexIP.test(dominio)){

score+=60;

motivos.push(
"URL utilizando IP direto"
);

}

const hifens=
(dominio.match(/-/g)||[]).length;

if(hifens>=3){

score+=30;

motivos.push(
"Excesso de hífens no domínio"
);

}

if(dominio.length>35){

score+=20;

motivos.push(
"Domínio excessivamente longo"
);

}

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

const dominio=
extrairDominio(texto);

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
"SOCIAL_ENGINEERING"
],
platformTypes:[
"ANY_PLATFORM"
],
threatEntryTypes:[
"URL"
],
threatEntries:[
{url:texto}
]
}
}
);

if(google.data.matches){

score+=100;

motivos.push(
"Google detectou ameaça"
);

}

}catch{}

}

let status="SEGURO";

if(score>=70){
status="ALTO RISCO";
}
else if(score>=30){
status="SUSPEITO";
}

const confianca=
calcularConfianca(score);

let motivoFinal=
motivos.join(". ");

if(!motivoFinal){

motivoFinal=
"Nenhum comportamento suspeito encontrado.";

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