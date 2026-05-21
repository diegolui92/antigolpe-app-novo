// ========================
// FAVORITAR
// ========================

app.post(
"/api/favoritar",
async(req,res)=>{

try{

const {
conteudo,
usuario_id
}=req.body;

await supabase
.from("favoritos")
.insert([
{
conteudo,
usuario_id
}
]);

return res.json({
sucesso:true
});

}catch(error){

console.log(error);

return res
.status(500)
.json({
erro:"Erro ao favoritar"
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

const {
conteudo,
usuario_id
}=req.body;

await supabase
.from("lista_negra")
.insert([
{
conteudo,
usuario_id
}
]);

return res.json({
sucesso:true
});

}catch(error){

console.log(error);

return res
.status(500)
.json({
erro:"Erro ao denunciar"
});

}

}
);