import { useState,useEffect } from "react";
import {
View,
Text,
TextInput,
TouchableOpacity,
StyleSheet,
ScrollView,
Alert
} from "react-native";

import { supabase } from "../services/supabase";

export default function Verificar(){

const [texto,setTexto]=useState("");
const [resultado,setResultado]=useState<any>(null);

const [historico,setHistorico]=useState<any[]>([]);
const [favoritos,setFavoritos]=useState<any[]>([]);
const [alertas,setAlertas]=useState<any[]>([]);
const [usuarioId,setUsuarioId]=useState<string|null>(null);


// =========================
// PEGAR USUÁRIO LOGADO
// =========================

async function carregarUsuario(){

const {
data:{session}
}
=
await supabase.auth.getSession();

if(session?.user){

setUsuarioId(
session.user.id
);

}

}

// =========================
// CARREGAR DADOS
// =========================

async function carregarHistorico(){

try{

const response=await fetch(
"https://antigolpe-api-production.up.railway.app/api/historico"
);

if(!response.ok) return;

const data=
await response.json();

setHistorico(
data || []
);

}catch(error){

console.log(error);

}

}

async function carregarFavoritos(){

try{

const response=await fetch(
"https://antigolpe-api-production.up.railway.app/api/favoritos"
);

if(!response.ok) return;

const data=
await response.json();

setFavoritos(
data || []
);

}catch(error){

console.log(error);

}

}

async function carregarAlertas(){

try{

const response=await fetch(
"https://antigolpe-api-production.up.railway.app/api/alertas"
);

if(!response.ok) return;

const data=
await response.json();

setAlertas(
data || []
);

}catch(error){

console.log(error);

}

}

useEffect(()=>{

carregarUsuario();

carregarHistorico();
carregarFavoritos();
carregarAlertas();

},[]);

// =========================
// VERIFICAR
// =========================

async function verificar(){

try{

const response=
await fetch(
"https://antigolpe-api-production.up.railway.app/api/verificar",
{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

texto,
usuario_id:usuarioId

})

}

);

if(!response.ok){

throw new Error();

}

const data=
await response.json();

setResultado(data);

carregarHistorico();

}catch(error){

Alert.alert(
"Erro",
"Erro ao verificar"
);

}

}

// =========================
// DENUNCIAR
// =========================

async function denunciar(){

try{

const response=
await fetch(
"https://antigolpe-api-production.up.railway.app/api/denunciar",
{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

conteudo:texto,

motivo:
"Denunciado pelo usuário",

descricao:
"Enviado pelo app",

usuario_id:
usuarioId

})

}

);

if(!response.ok){

throw new Error();

}

const data=
await response.json();

Alert.alert(
"Sucesso",
data.mensagem
);

verificar();

}catch{

Alert.alert(
"Erro",
"Erro ao denunciar"
);

}

}

// =========================
// FAVORITAR
// =========================

async function favoritar(){

try{

const response=
await fetch(
"https://antigolpe-api-production.up.railway.app/api/favoritar",
{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

conteudo:texto,

tipo:
resultado?.tipo,

status:
resultado?.status,

usuario_id:
usuarioId

})

}

);

if(!response.ok){

throw new Error();

}

const data=
await response.json();

Alert.alert(
"Favoritos",
data.mensagem
);

carregarFavoritos();

}catch{

Alert.alert(
"Erro",
"Erro ao favoritar"
);

}

}

// =========================
// RESTANTE DA TELA
// =========================

// MANTÉM O RESTO DO ARQUIVO
// EXATAMENTE IGUAL