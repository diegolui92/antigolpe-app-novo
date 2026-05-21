require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");
const { GoogleGenAI } = require("@google/genai");

const app = express();

app.use(cors());
app.use(express.json());

const GOOGLE_SAFE_KEY =
process.env.GOOGLE_SAFE_BROWSING_KEY;

const GEMINI_API_KEY =
process.env.GEMINI_API_KEY;

const URLSCAN_API_KEY =
process.env.URLSCAN_API_KEY;

const WHOIS_API_KEY =
process.env.WHOIS_API_KEY;

const supabase = createClient(
process.env.SUPABASE_URL,
process.env.SUPABASE_ANON_KEY
);

const ai =
new GoogleGenAI({
apiKey:GEMINI_API_KEY
});


// ========================
// DETECTAR TIPO
// ========================

function detectarTipo(texto){

texto=texto.toLowerCase();

if(texto.includes("@"))
return "EMAIL";

if(
texto.includes("http") ||
texto.includes(".")
){
return "SITE";
}

if(texto.length>=11)
return "TELEFONE/PIX";

return "DESCONHECIDO";

}


// ========================
// EXTRAIR DOMINIO
// ========================

function extrairDominio(url){

return url
.replace("https://","")
.replace("http://","")
.replace("www.","")
.split("/")[0];

}


// ========================
// VERIFICAR
// ========================

app.post(
"/api/verificar",
async(req,res)=>{

try{

const {
texto,
usuario_id
}=req.body;

if(!texto){

return res
.status(400)
.json({
erro:"Texto não enviado"
});

}

const tipo =
detectarTipo(texto);

let score=0;
let motivos=[];

const dominio =
extrairDominio(texto);


// ========================
// GOOGLE SAFE BROWSING
// ========================

try{

const google =
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

motivos.push(
"Detectado pelo Google Safe Browsing"
);

}

}catch(e){

console.log(
"Erro Google:",
e.message
);

}


// ========================
// WHOIS
// ========================

try{

const whois=
await axios.get(

`https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=${WHOIS_API_KEY}&domainName=${dominio}&outputFormat=JSON`

);

const criado=

whois.data
?.WhoisRecord
?.createdDate;

if(criado){

const anos=

new Date().getFullYear() -
new Date(criado).getFullYear();

if(anos<=1){

score+=25;

motivos.push(
"Domínio muito recente"
);

}

}

}catch(e){

console.log(
"Erro WHOIS:",
e.message
);

}


// ========================
// URLSCAN
// ========================

try{

const scan=
await axios.post(

"https://urlscan.io/api/v1/scan/",

{
url:texto,
visibility:"public"
},

{
headers:{
"API-Key":
URLSCAN_API_KEY
}
}

);

if(scan.data){

motivos.push(
"URL analisada pelo URLScan"
);

}

}catch(e){

console.log(
"Erro URLSCAN:",
e.message
);

}


// ========================
// COMUNIDADE
// ========================

const{
data:denuncias
}=await supabase
.from("lista_negra")
.select("*")
.eq(
"conteudo",
texto
);

const totalDenuncias=
denuncias?.length||0;

if(totalDenuncias>0){

score+=
(totalDenuncias*5);

motivos.push(
`${totalDenuncias} denúncias encontradas`
);

}


// ========================
// GEMINI
// ========================

let resultado;

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
${motivos.join(", ")}

Classifique:

SEGURO
SUSPEITO
ALTO RISCO

Retorne JSON:

{
"status":"",
"confianca":0,
"motivo":""
}

`;

const respostaIA=
await ai.models.generateContent({

model:"gemini-2.5-flash",
contents:prompt

});

let textoIA=
respostaIA.text;

textoIA=
textoIA
.replace(/```json/g,"")
.replace(/```/g,"")
.trim();

resultado=
JSON.parse(textoIA);

}catch(error){

console.log(
"Erro Gemini:",
error.message
);

resultado={

status:
score>=100
?"ALTO RISCO"
:score>10
?"SUSPEITO"
:"SEGURO",

confianca:70,

motivo:
"Gemini indisponível temporariamente. Resultado baseado em análise local."

};

}


// ========================
// SALVAR HISTORICO
// ========================

await supabase
.from("verificacoes")
.insert([{

conteudo:texto,
tipo,
resultado:
resultado.status,
score,
risco:
resultado.motivo,
usuario_id

}]);


return res.json({

tipo,
status:
resultado.status,
confianca:
resultado.confianca,
score,
denuncias:
totalDenuncias,
motivo:
resultado.motivo

});

}catch(error){

console.log(
"ERRO GERAL:",
error
);

return res
.status(500)
.json({
erro:
"Erro ao verificar"
});

}

}
);


// ========================
// DENUNCIAR
// ========================

app.post(
"/api/denunciar",
async(req,res)=>{

try{

const{
texto,
usuario_id
}=req.body;

await supabase
.from("lista_negra")
.insert([{
conteudo:texto,
usuario_id
}]);

return res.json({
sucesso:true
});

}catch(error){

return res
.status(500)
.json({
erro:"Erro ao denunciar"
});

}

}
);


// ========================
// FAVORITAR
// ========================

app.post(
"/api/favoritar",
async(req,res)=>{

try{

const{
texto,
usuario_id
}=req.body;

await supabase
.from("favoritos")
.insert([{
conteudo:texto,
usuario_id
}]);

return res.json({
sucesso:true
});

}catch(error){

return res
.status(500)
.json({
erro:"Erro ao favoritar"
});

}

}
);


// ========================
// SERVIDOR
// ========================

const PORT=
process.env.PORT||3000;

app.listen(
PORT,
()=>{

console.log(
"Servidor AntiGolpe rodando"
);

}
);