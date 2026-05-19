require("dotenv").config();

const express = require("express");
const cors = require("cors");
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

const tipo=detectarTipo(texto);

const {data:reputacao}=await supabase
.from("reputacoes")
.select("*")
.eq("conteudo",texto)
.limit(1);

const {data:denunciasBanco}=await supabase
.from("lista_negra")
.select("*")
.eq("conteudo",texto);

let status="SEGURO";
let score=0;
let motivo="Nenhum risco encontrado";

if(reputacao && reputacao.length>0){

status=reputacao[0].nivel || "SUSPEITO";
score=reputacao[0].score || 0;
motivo="Resultado baseado na comunidade";

}

if(
texto.includes(".xyz") ||
texto.includes("bit.ly") ||
texto.includes("ganhe") ||
texto.includes("pix")
){

status="SUSPEITO";
score=40;
motivo="Domínio suspeito";

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
denuncias:denunciasBanco?.length || 0,
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
// FAVORITOS
// =========================

app.post("/api/favoritar", async(req,res)=>{

try{

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

sucesso:true,
mensagem:"Adicionado aos favoritos"

});

}catch(error){

console.log(error);

return res.status(500).json({
erro:"Erro ao favoritar"
});

}

});

app.get("/api/favoritos",async(req,res)=>{

try{

const {data}=await supabase
.from("favoritos")
.select("*")
.order("id",{ascending:false});

return res.json(data);

}catch(error){

console.log(error);

return res.status(500).json({
erro:"Erro favoritos"
});

}

});

// =========================
// HISTÓRICO
// =========================

app.get("/api/historico",async(req,res)=>{

const {data}=await supabase
.from("verificacoes")
.select("*")
.order("id",{ascending:false})
.limit(10);

return res.json(data);

});

// =========================
// SERVIDOR
// =========================

const PORT=process.env.PORT || 3000;

app.listen(PORT,()=>{

console.log(
"Servidor AntiGolpe rodando"
);

});