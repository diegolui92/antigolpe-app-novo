require("dotenv").config();

const express=require("express");
const cors=require("cors");
const {createClient}=require("@supabase/supabase-js");

const app=express();

app.use(cors());
app.use(express.json());

const supabase=createClient(
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
// CALCULAR SCORE
// =========================

function calcularRisco(totalDenuncias){

if(totalDenuncias>=10){

return{
score:100,
nivel:"GOLPE CONFIRMADO"
};

}

if(totalDenuncias>=6){

return{
score:80,
nivel:"ALTO RISCO"
};

}

if(totalDenuncias>=3){

return{
score:60,
nivel:"RISCO MÉDIO"
};

}

if(totalDenuncias>=1){

return{
score:30,
nivel:"SUSPEITO"
};

}

return{
score:0,
nivel:"SEGURO"
};

}

// =========================
// VERIFICAR
// =========================

app.post("/api/verificar",async(req,res)=>{

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

let totalDenuncias=
denunciasBanco?.length || 0;

const risco=
calcularRisco(
totalDenuncias
);

await supabase
.from("verificacoes")
.insert([
{
conteudo:texto,
tipo,
resultado:risco.nivel,
score:risco.score,
risco:risco.nivel
}
]);

return res.json({

tipo,
status:risco.nivel,
score:risco.score,
denuncias:totalDenuncias,
motivo:
`${totalDenuncias} denúncia(s) encontradas`,
motivos:
denunciasBanco?.map(
item=>item.motivo
) || []

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

app.post("/api/denunciar",async(req,res)=>{

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

let total=1;

if(
reputacao &&
reputacao.length>0
){

total=
(reputacao[0]
.total_denuncias || 0)+1;

const risco=
calcularRisco(total);

await supabase
.from("reputacoes")
.update({

total_denuncias:total,
score:risco.score,
nivel:risco.nivel

})
.eq(
"conteudo",
conteudo
);

}else{

const risco=
calcularRisco(1);

await supabase
.from("reputacoes")
.insert([
{
conteudo,
tipo,
total_denuncias:1,
score:risco.score,
nivel:risco.nivel
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
mensagem:
"Favorito salvo"

});

}catch(error){

return res.status(500).json({
erro:"Erro ao favoritar"
});

}

});

app.get("/api/favoritos",async(req,res)=>{

const {data}=await supabase
.from("favoritos")
.select("*")
.order("id",{ascending:false});

return res.json(data);

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

const PORT=
process.env.PORT || 3000;

app.listen(PORT,()=>{

console.log(
"Servidor AntiGolpe rodando"
);

});