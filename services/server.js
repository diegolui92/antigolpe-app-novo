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

const supabase = createClient(
process.env.SUPABASE_URL,
process.env.SUPABASE_ANON_KEY
);

let ai = null;

if(GEMINI_API_KEY){

ai = new GoogleGenAI({
apiKey:GEMINI_API_KEY
});

}

// =========================
// DETECTAR TIPO
// =========================

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


// =========================
// IA LOCAL (FALLBACK)
// =========================

function analisarLocal(texto){

texto=texto.toLowerCase();

let score=0;
let motivos=[];

const suspeitos=[
".xyz",
"bit.ly",
"tinyurl",
"pix",
"premio",
"urgente",
"bonus",
"ganhe"
];

suspeitos.forEach(item=>{

if(texto.includes(item)){

score+=20;

motivos.push(
`Possui ${item}`
);

}

});

const marcas=[
"google",
"youtube",
"netflix",
"facebook",
"instagram",
"mercadolivre"
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

return res.status(400)
.json({
erro:"Texto vazio"
});

}

const tipo=
detectarTipo(texto);

const local=
analisarLocal(texto);

let score=
local.score;

let motivos=[
...local.motivos
];


// SAFE BROWSING

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
"Detectado Google Safe Browsing"
);

}

}catch(e){}


// DENÚNCIAS GLOBAIS

const {data:denuncias}=await
supabase
.from("lista_negra")
.select("*")
.eq(
"conteudo",
texto
);

const totalDenuncias=
denuncias?.length||0;

if(totalDenuncias>=3){

score+=20;

motivos.push(
"Comunidade encontrou riscos"
);

}


// STATUS PADRÃO

let status="SEGURO";

if(score>=120){

status="ALTO RISCO";

}else if(score>=50){

status="SUSPEITO";

}

let confianca=90;


// GEMINI OPCIONAL

if(ai){

try{

const prompt=`

Analise:

${texto}

Tipo:${tipo}

Score:${score}

Motivos:${motivos.join(",")}

Retorne apenas JSON:

{
"status":"",
"confianca":0,
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
resultado.status ||
status;

confianca=
resultado.confianca ||
confianca;

motivos.push(
resultado.motivo
);

}catch(e){

console.log(
"Gemini indisponível"
);

}

}


await supabase
.from("verificacoes")
.insert([
{
conteudo:texto,
tipo,
resultado:status,
score,
risco:
motivos.join(", "),
usuario_id
}
]);


return res.json({

tipo,
status,
score,
confianca,
denuncias:
totalDenuncias,
motivo:
motivos.join(", ")

});

}catch(error){

console.log(error);

return res
.status(500)
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
usuario_id
}=req.body;

await supabase
.from("lista_negra")
.insert([
{
conteudo,
motivo,
usuario_id
}
]);

return res.json({
sucesso:true
});

}catch(e){

return res
.status(500)
.json({
erro:"Erro denúncia"
});

}

});


// =========================
// FAVORITAR
// =========================

app.post(
"/api/favoritar",
async(req,res)=>{

return res.json({
sucesso:true
});

});


// =========================
// HISTÓRICO
// =========================

app.get(
"/api/historico",
async(req,res)=>{

const {data}=await
supabase
.from("verificacoes")
.select("*")
.order(
"criado_em",
{
ascending:false
}
)
.limit(50);

return res.json(data);

});



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