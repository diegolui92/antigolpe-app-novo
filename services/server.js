require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(cors());
app.use(express.json());

const supabase = createClient(
process.env.SUPABASE_URL,
process.env.SUPABASE_ANON_KEY
);

// =========================
// DETECTAR TIPO
// =========================

function detectarTipo(texto){

if(texto.includes("@")) return "EMAIL";

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
// ANÁLISE INTELIGENTE
// =========================

function analisarRisco(texto){

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

if(
texto.toLowerCase()
.includes(item)
){

score+=20;

motivos.push(
`Possui ${item}`
);

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
texto.toLowerCase().includes(marca)
&&
texto.toLowerCase()!==`${marca}.com`
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

app.post("/api/verificar", async(req,res)=>{

try{

const {texto}=req.body;

if(!texto){

return res.status(400).json({
erro:"Texto não enviado"
});

}

const tipo=
detectarTipo(texto);

const analise=
analisarRisco(texto);

const {data:reputacao}=await supabase
.from("reputacoes")
.select("*")
.eq("conteudo",texto)
.limit(1);

const {data:denunciasBanco}=await supabase
.from("lista_negra")
.select("*")
.eq("conteudo",texto);

let score=
analise.score;

let status=
"SEGURO";

let motivo=
analise.motivos.join(", ");

if(
score>=70
){
status="ALTO RISCO";
}
else if(
score>=30
){
status="SUSPEITO";
}

if(
reputacao &&
reputacao.length>0
){

score+=
reputacao[0].score || 0;

}

await supabase
.from("verificacoes")
.insert([
{
conteudo:texto,
tipo,
resultado:status,
score,
risco:motivo
}
]);

return res.json({

tipo,
status,
score,
denuncias:
denunciasBanco?.length || 0,
motivo

});

}catch(error){

console.log(error);

return res.status(500).json({
erro:"Erro ao verificar"
});

}

});

// =========================
// DENUNCIAR
// =========================

app.post("/api/denunciar", async(req,res)=>{

try{

const {
conteudo,
motivo,
descricao
}=req.body;

const tipo=
detectarTipo(conteudo);

await supabase
.from("lista_negra")
.insert([
{
conteudo,
tipo,
motivo,
categoria:descricao,
risco:"ALTO"
}
]);

const {data:reputacao}=await supabase
.from("reputacoes")
.select("*")
.eq("conteudo",conteudo)
.limit(1);

if(
reputacao &&
reputacao.length>0
){

await supabase
.from("reputacoes")
.update({

total_denuncias:
reputacao[0]
.total_denuncias+1,

score:
reputacao[0]
.score+50,

nivel:
"ALTO RISCO"

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
tipo,
total_denuncias:1,
score:50,
nivel:"ALTO RISCO"

}
]);

}

return res.json({

sucesso:true,
mensagem:
"Denúncia registrada"

});

}catch(error){

console.log(error);

return res.status(500).json({

erro:"Erro ao denunciar"

});

}

});

// =========================
// FAVORITOS
// =========================

app.post("/api/favoritar",async(req,res)=>{

const {
conteudo,
status,
tipo
}=req.body;

await supabase
.from("favoritos")
.insert([
{
conteudo,
status,
tipo
}
]);

return res.json({
mensagem:
"Favoritado"
});

});

app.get("/api/favoritos",async(req,res)=>{

const {data}=await supabase
.from("favoritos")
.select("*")
.order(
"id",
{ascending:false}
);

return res.json(data);

});

// =========================
// HISTÓRICO
// =========================

app.get("/api/historico",async(req,res)=>{

const {data}=await supabase
.from("verificacoes")
.select("*")
.order(
"id",
{ascending:false}
)
.limit(10);

return res.json(data);

});

const PORT=
process.env.PORT || 3000;

app.listen(PORT,()=>{

console.log(
"Servidor AntiGolpe rodando"
);

});