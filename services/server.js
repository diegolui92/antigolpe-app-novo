require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");
const { GoogleGenAI } = require("@google/genai");

const app = express();

app.use(cors());
app.use(express.json());

const GOOGLE_SAFE_KEY = process.env.GOOGLE_SAFE_BROWSING_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const URLSCAN_API_KEY = process.env.URLSCAN_API_KEY;
const WHOIS_API_KEY = process.env.WHOIS_API_KEY;

const supabase = createClient(
process.env.SUPABASE_URL,
process.env.SUPABASE_ANON_KEY
);

const ai = new GoogleGenAI({
apiKey: GEMINI_API_KEY
});

// ====================
// VALIDAR CPF
// ====================

function validarCPF(cpf){

cpf = cpf.replace(/\D/g,'');

if(cpf.length !== 11) return false;

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

// ====================
// DETECTAR TIPO
// ====================

function detectarTipo(texto){

texto=texto.trim();

if(texto.includes("@"))
return "EMAIL";

const numeros=texto.replace(/\D/g,'');

if(
numeros.length===11 &&
validarCPF(numeros)
){
return "CPF/PIX";
}

if(
numeros.length>=10 &&
numeros.length<=13
){
return "TELEFONE/PIX";
}

if(
texto.length>=25 &&
texto.length<=36
){
return "PIX ALEATORIA";
}

if(
texto.includes(".") ||
texto.includes("http")
){
return "SITE";
}

return "DESCONHECIDO";

}

// ====================
// EXTRAIR DOMÍNIO
// ====================

function extrairDominio(url){

return url
.toLowerCase()
.replace("https://","")
.replace("http://","")
.replace("www.","")
.split("/")[0];

}

// ====================
// MARCAS
// ====================

const marcas=[

"google",
"youtube",
"facebook",
"instagram",
"netflix",
"mercadolivre",
"nubank",
"whatsapp",
"amazon",
"gov"

];

// ====================
// VERIFICAR
// ====================

app.post("/api/verificar", async(req,res)=>{

try{

const { texto, usuario_id } = req.body;

if(!texto){

return res.status(400).json({
erro:"Texto vazio"
});

}

let tipo=detectarTipo(texto);

let score=0;
let motivos=[];
let dominio="";

// SITE

if(tipo==="SITE"){

dominio=extrairDominio(texto);

for(let marca of marcas){

if(

(
dominio.includes(`${marca}-`) ||
dominio.includes(`${marca}.`) ||
dominio.includes(`${marca}login`) ||
dominio.includes(`${marca}seguranca`)
)

&&

dominio!==`${marca}.com`

&&

dominio!==`${marca}.com.br`

){

score+=40;

motivos.push(
`Possível falsificação da marca ${marca}`
);

}

}

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
threatEntryTypes:["URL"],
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

// ====================
// WHOIS CORRIGIDO
// ====================

try{

if(
WHOIS_API_KEY &&
WHOIS_API_KEY.trim()!==""
){

const whois=
await axios.get(

`https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=${WHOIS_API_KEY}&domainName=${dominio}&outputFormat=JSON`

);

const criado=
whois.data
?.WhoisRecord
?.createdDate;

motivos.push(
`Domínio criado em ${criado || "Não disponível"}`
);

}else{

motivos.push(
"Informações de domínio indisponíveis"
);

}

}catch(e){

console.log(
"Erro WHOIS:",
e.response?.data || e.message
);

motivos.push(
"Informações de domínio indisponíveis"
);

}


// ====================
// URLSCAN CORRIGIDO
// ====================

try{

const urlCorrigida=
texto.startsWith("http")
? texto
: `https://${texto}`;

await axios.post(

"https://urlscan.io/api/v1/scan/",

{
url:urlCorrigida,
visibility:"public"
},

{
headers:{

"API-Key":
URLSCAN_API_KEY,

"Content-Type":
"application/json"

}

}

);

motivos.push(
"Analisado pelo URLScan"
);

}catch(e){

console.log(
"Erro URLSCAN:",
e.response?.data || e.message
);

}

}

if(tipo==="CPF/PIX"){
motivos.push("CPF válido identificado");
}

if(tipo==="TELEFONE/PIX"){
motivos.push("Telefone/PIX identificado");
}

if(tipo==="EMAIL"){
motivos.push("Email identificado");
}

const { data:denuncias } =
await supabase
.from("lista_negra")
.select("*")
.eq("conteudo",texto);

const totalDenuncias=
denuncias?.length || 0;

if(totalDenuncias>0){

score+=(totalDenuncias*5);

motivos.push(
`${totalDenuncias} denúncias encontradas`
);

}

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
${motivos.join(",")}

Retorne JSON:

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

let textoIA=
resposta.text
.replace(/```json/g,"")
.replace(/```/g,"")
.trim();

resultado=
JSON.parse(textoIA);

}catch{

resultado={

status:
score>=80
? "FRAUDE"
: score>0
? "SUSPEITO"
: "SEGURO",

confianca:
score>=80
?95
:score>0
?85
:99,

motivo:
motivos.join(". ")
||
"Nenhum risco encontrado"

};

}

// SITE SEGURO
if(
tipo==="SITE" &&
score===0
){

return `O domínio ${dominio} foi analisado pelo sistema AntiGolpe utilizando verificações locais, comunidade, URLScan e mecanismos de segurança disponíveis. Nenhum sinal conhecido de ameaça, falsificação ou comportamento malicioso foi identificado durante a análise.`;

}

// SITE SUSPEITO
if(
tipo==="SITE" &&
score>0 &&
score<80
){

return `O domínio ${dominio} apresentou características compatíveis com possíveis tentativas de falsificação ou comportamento suspeito. Foram encontrados padrões frequentemente associados a golpes digitais. Recomenda-se cautela antes de fornecer dados pessoais, senhas ou informações financeiras.`;

}

// FRAUDE
if(
tipo==="SITE" &&
score>=80
){

return `Foram encontrados fortes indícios de fraude envolvendo o domínio ${dominio}. A análise identificou possíveis tentativas de falsificação de marca, registros suspeitos e denúncias da comunidade. Recomenda-se evitar acesso ao conteúdo e não compartilhar informações pessoais ou bancárias.`;

}

// CPF
if(
tipo==="CPF/PIX"
){

return `CPF identificado e validado estruturalmente. A análise confirma consistência matemática do documento informado. Isso não garante autenticidade da identidade associada, apenas que o formato apresentado é válido.`;

}

// TELEFONE
if(
tipo==="TELEFONE/PIX"
){

return `Número identificado com formato compatível para telefone ou chave PIX. Nenhum indicador suspeito foi encontrado durante a análise local e comunitária realizada pelo sistema.`;

}

// EMAIL
if(
tipo==="EMAIL"
){

return `O endereço informado foi identificado como email válido em sua estrutura. Nenhum padrão conhecido de risco foi encontrado durante a análise local do sistema.`;

}

return motivos.join(". ");

};

await supabase
.from("verificacoes")
.insert([{

conteudo:texto,
tipo,
resultado:resultado.status,
score,
risco:resultado.motivo,
usuario_id

}]);

return res.json({

tipo,
status:resultado.status,
confianca:resultado.confianca,
score,
denuncias:totalDenuncias,
motivo:resultado.motivo

});

}

catch(error){

console.log(error);

return res.status(500).json({
erro:"Erro verificar"
});

}

});

// ====================
// DENUNCIAR
// ====================

app.post("/api/denunciar",async(req,res)=>{

try{

const {texto,usuario_id}=req.body;

await supabase
.from("lista_negra")
.insert([{
conteudo:texto,
usuario_id
}]);

return res.json({
sucesso:true
});

}catch{

return res.status(500).json({
erro:"Erro denunciar"
});

}

});

// ====================
// FAVORITAR
// ====================

app.post("/api/favoritar",async(req,res)=>{

try{

const {texto,usuario_id}=req.body;

await supabase
.from("favoritos")
.insert([{
conteudo:texto,
usuario_id
}]);

return res.json({
sucesso:true
});

}catch(erro){

return res.status(500).json({
erro:"Erro favoritar"
});

}

});

// ====================
// SERVIDOR
// ====================

const PORT=
process.env.PORT||3000;

app.listen(PORT,()=>{

console.log(
"Servidor AntiGolpe rodando"
);

});