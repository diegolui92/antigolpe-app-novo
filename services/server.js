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
// IA LOCAL
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

let status=
score>=30
?
"SUSPEITO"
:
"SEGURO";

let motivo=
analise.motivos.join(", ");

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
denuncias:0,
motivo

});

}catch(error){

console.log(error);

return res.status(500).json({
erro:"Erro verificar"
});

}

});

// =========================
// DENUNCIAR
// =========================

app.post("/api/denunciar",async(req,res)=>{

try{

const {
conteudo,
motivo,
descricao,
usuario_id
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
risco:"ALTO",
usuario_id
}
]);

return res.json({

sucesso:true,
mensagem:
"Denúncia registrada"

});

}catch(error){

console.log(error);

return res.status(500).json({
erro:"Erro denúncia"
});

}

});

// =========================
// FAVORITAR
// =========================

app.post("/api/favoritar",async(req,res)=>{

try{

const {
conteudo,
status,
tipo,
usuario_id
}=req.body;

await supabase
.from("favoritos")
.insert([
{
conteudo,
status,
tipo,
usuario_id
}
]);

return res.json({

mensagem:
"Favoritado"

});

}catch(error){

console.log(error);

return res.status(500).json({
erro:"Erro favorito"
});

}

});

// =========================
// FAVORITOS
// =========================

app.get("/api/favoritos",async(req,res)=>{

const usuario_id=
req.query.usuario_id;

const {data}=await supabase
.from("favoritos")
.select("*")
.eq(
"usuario_id",
usuario_id
)
.order(
"id",
{
ascending:false
}
);

return res.json(data);

});

// =========================
// HISTÓRICO
// =========================

app.get("/api/historico",async(req,res)=>{

const usuario_id=
req.query.usuario_id;

const {data}=await supabase
.from("verificacoes")
.select("*")
.eq(
"usuario_id",
usuario_id
)
.order(
"id",
{
ascending:false
}
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