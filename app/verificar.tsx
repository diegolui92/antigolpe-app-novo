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

async function carregarUsuario(){

const {
data:{session}
}=await supabase.auth.getSession();

if(session?.user){

setUsuarioId(
session.user.id
);

}

}

async function carregarHistorico(){

try{

const response=await fetch(
`https://antigolpe-api-production.up.railway.app/api/historico?usuario_id=${usuarioId || ""}`
);

const data=await response.json();

setHistorico(data || []);

}catch(error){

console.log(error);

}

}

async function carregarFavoritos(){

try{

const response=await fetch(
`https://antigolpe-api-production.up.railway.app/api/favoritos?usuario_id=${usuarioId || ""}`
);

const data=await response.json();

setFavoritos(data || []);

}catch(error){

console.log(error);

}

}

async function carregarAlertas(){

try{

const response=await fetch(
"https://antigolpe-api-production.up.railway.app/api/alertas"
);

if(response.ok){

const data=await response.json();

setAlertas(data || []);

}

}catch{}

}

useEffect(()=>{

carregarUsuario();

},[]);

useEffect(()=>{

if(usuarioId){

carregarHistorico();
carregarFavoritos();
carregarAlertas();

}

},[usuarioId]);

async function verificar(){

if(!usuarioId){

Alert.alert(
"Aguarde",
"Carregando usuário..."
);

return;

}

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

const data=
await response.json();

setResultado(data);

carregarHistorico();

}catch{

Alert.alert(
"Erro",
"Erro ao verificar"
);

}

}

async function denunciar(){

if(!usuarioId){

Alert.alert(
"Aguarde",
"Carregando usuário..."
);

return;

}

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
motivo:"Denunciado pelo usuário",
descricao:"Enviado pelo app",
usuario_id:usuarioId
})
}
);

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

async function favoritar(){

if(!usuarioId){

Alert.alert(
"Aguarde",
"Carregando usuário..."
);

return;

}

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
tipo:resultado?.tipo,
status:resultado?.status,
usuario_id:usuarioId
})
}
);

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

return(

<ScrollView style={styles.container}>

<Text style={styles.title}>
AntiGolpe
</Text>

<TextInput
style={styles.input}
placeholder="Digite site, telefone..."
placeholderTextColor="#999"
value={texto}
onChangeText={setTexto}
multiline
/>

<TouchableOpacity
style={styles.button}
onPress={verificar}
>
<Text style={styles.buttonText}>
Verificar
</Text>
</TouchableOpacity>

<TouchableOpacity
style={styles.denunciarButton}
onPress={denunciar}
>
<Text style={styles.buttonText}>
Denunciar
</Text>
</TouchableOpacity>

{resultado && (

<View style={styles.resultado}>

<Text style={styles.tipo}>
Tipo: {resultado.tipo}
</Text>

<Text style={styles.status}>
Status: {resultado.status}
</Text>

<Text style={styles.score}>
Score: {resultado.score}
</Text>

<Text style={styles.denuncias}>
Denúncias:{resultado.denuncias}
</Text>

<Text style={styles.mensagem}>
{resultado.motivo}
</Text>

<TouchableOpacity
style={styles.favoritoButton}
onPress={favoritar}
>

<Text style={styles.favoritoText}>
⭐ Favoritar
</Text>

</TouchableOpacity>

</View>

)}

</ScrollView>

);

}

const styles=StyleSheet.create({

container:{
flex:1,
backgroundColor:"#020d22",
padding:20
},

title:{
color:"#fff",
fontSize:42,
fontWeight:"bold",
alignSelf:"center",
marginTop:50,
marginBottom:30
},

input:{
backgroundColor:"#16233d",
color:"#fff",
borderRadius:20,
padding:20,
minHeight:150
},

button:{
backgroundColor:"#00c26e",
padding:20,
borderRadius:20,
marginTop:20,
alignItems:"center"
},

denunciarButton:{
backgroundColor:"#ff4444",
padding:20,
borderRadius:20,
marginTop:10,
alignItems:"center"
},

buttonText:{
color:"#fff",
fontSize:20,
fontWeight:"bold"
},

resultado:{
backgroundColor:"#09152d",
padding:20,
borderRadius:20,
marginTop:20
},

tipo:{color:"#fff"},
status:{color:"#ffaa00",marginTop:10},
score:{color:"#fff",marginTop:10},
denuncias:{color:"#ffcc00",marginTop:10},
mensagem:{color:"#ccc",marginTop:10},

favoritoButton:{
backgroundColor:"#ffcc00",
padding:15,
borderRadius:15,
marginTop:20
},

favoritoText:{
textAlign:"center",
fontWeight:"bold"
}

});