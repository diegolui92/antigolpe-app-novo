require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(cors());
app.use(express.json());

const GOOGLE_SAFE_KEY =
process.env.GOOGLE_SAFE_BROWSING_KEY;

const URLSCAN_KEY =
process.env.URLSCAN_API_KEY;

const WHOIS_KEY =
process.env.WHOIS_API_KEY;

const supabase = createClient(
process.env.SUPABASE_URL,
process.env.SUPABASE_ANON_KEY
);


// =========================
// DETECTAR TIPO
// =========================

function detectarTipo(texto){

texto=texto.toLowerCase();

if(texto.includes("@"))
return "EMAIL";

if(
texto.includes("http") ||
texto.includes(".com") ||
texto.includes(".xyz")
){
return "SITE";
}

if(texto.length>=11){
return "TELEFONE/PIX";
}

return "DESCONHECIDO";

}


// =========================
// IA LOCAL
// =========================

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

const marcas=[
"google",
"youtube",
"mercadolivre",
"netflix",
"facebook",
"instagram"
];

marcas.forEach(marca=>{

if(
texto.includes(marca)
&&
texto!==`${marca}.com`
){

score+=50;

motivos.push(
"Possível domínio clonado"
);

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

app.post(
"/api/verificar",
async(req,res)=>{

try{

const {
texto,
usuario_id
}=req.body;

if(!texto){

return res.status(400).json({
erro:"Texto não enviado"
});

}

const tipo=
detectarTipo(texto);

const analise=
analisarRisco(texto);

let score=
analise.score;

let motivos=[
...analise.motivos
];


// REPUTAÇÃO GLOBAL

const {data:reputacao}=await supabase
.from("reputacoes")
.select("*")
.eq("conteudo",texto)
.limit(1);

const {data:denunciasBanco}=await supabase
.from("lista_negra")
.select("*")
.eq("conteudo",texto);

const totalDenuncias =
denunciasBanco?.length || 0;


// REDE APRENDE

if(totalDenuncias>=3){

score+=50;

motivos.push(
"Comunidade reportou várias vezes"
);

}

if(totalDenuncias>=10){

score+=100;

motivos.push(
"Alto volume de denúncias"
);

}

if(
reputacao &&
reputacao.length>0
){

score+=
reputacao[0].score || 0;

}


// IA GLOBAL

if(tipo==="SITE"){

try{

const google=await axios.post(
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

motivos.push(
"Detectado pelo Google Safe Browsing"
);

}

}catch(e){}

}


// STATUS FINAL

let status="SEGURO";

if(score>=120){

status="ALTO RISCO";

}else if(score>=50){

status="SUSPEITO";

}

const motivo=
motivos.join(", ");


// SALVAR HISTÓRICO

await supabase
.from("verificacoes")
.insert([
{
conteudo:texto,
tipo,
resultado:status,
score,
risco:motivo,
usuario_id
}
]);

return res.json({

tipo,
status,
score,
denuncias:totalDenuncias,
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


// =========================
// DENUNCIAR
// =========================

app.post(
"/api/denunciar",
async(req,res)=>{

try{

const {
conteudo,
motivo,
descricao,
usuario_id
}=req.body;

const tipo=
detectarTipo(
conteudo
);

await supabase
.from("lista_negra")
.insert([
{
conteudo,
tipo,
motivo,
categoria:descricao,
risco:"ALTO",
usuario_id
}
]);


// ATUALIZA REPUTAÇÃO GLOBAL

const {data:existente}=await supabase
.from("reputacoes")
.select("*")
.eq("conteudo",conteudo)
.limit(1);

if(
existente &&
existente.length>0
){

await supabase
.from("reputacoes")
.update({
score:
(existente[0].score||0)+20
})
.eq(
"conteudo",
conteudo
);

}else{

await supabase
.from("reputacoes")
.insert([
{
conteudo,
score:20
}
]);

}

return res.json({
sucesso:true
});

}catch(error){

console.log(error);

return res.status(500)
.json({
erro:"Erro"
});

}

});


// FAVORITOS e HISTÓRICO permanecem iguais