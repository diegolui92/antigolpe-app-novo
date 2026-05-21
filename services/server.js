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

const ai =
new GoogleGenAI({
apiKey: GEMINI_API_KEY
});


// ========================
// DETECTAR TIPO
// ========================

function detectarTipo(texto){

texto = texto.toLowerCase();

if(texto.includes("@"))
return "EMAIL";

if(
texto.includes("http") ||
texto.includes(".")
){
return "SITE";
}

if(texto.length >= 11)
return "TELEFONE/PIX";

return "DESCONHECIDO";

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


// ========================
// GOOGLE SAFE BROWSING
// ========================

try{

const google = await axios.post(
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

score += 100;

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
// COMUNIDADE
// ========================

const {
data:denuncias
} = await supabase
.from("lista_negra")
.select("*")
.eq(
"conteudo",
texto
);

const totalDenuncias =
denuncias?.length || 0;

if(totalDenuncias > 0){

score += 5;

motivos.push(
`${totalDenuncias} denúncias encontradas`
);

}


// ========================
// IA GEMINI
// ========================

const prompt = `

Você é uma IA antifraude.

Analise:

Conteúdo:
${texto}

Tipo:
${tipo}

Score:
${score}

Motivos:
${motivos.join(",")}

Classifique:

SEGURO
SUSPEITO
ALTO RISCO

Retorne SOMENTE JSON:

{
"status":"",
"confianca":0,
"motivo":""
}

`;

const respostaIA =
await ai.models.generateContent({
model:"gemini-2.5-flash",
contents:prompt
});

const textoIA =
respostaIA.text;


// ========================
// LIMPAR RESPOSTA GEMINI
// ========================

let jsonLimpo = textoIA
.replace(/```json/g,"")
.replace(/```/g,"")
.trim();

let resultado;

try{

resultado =
JSON.parse(jsonLimpo);

}catch(error){

console.log(
"Erro JSON Gemini:",
error
);

resultado={

status:"SUSPEITO",
confianca:50,
motivo:"IA retornou formato inválido"

};

}


// ========================
// SALVAR HISTÓRICO
// ========================

await supabase
.from("verificacoes")
.insert([
{
conteudo:texto,
tipo,
resultado:
resultado.status,
score,
risco:
resultado.motivo,
usuario_id
}
]);


// ========================
// RETORNO APP
// ========================

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
// SERVIDOR
// ========================

const PORT =
process.env.PORT || 3000;

app.listen(
PORT,
()=>{

console.log(
"Servidor AntiGolpe rodando"
);

}
);