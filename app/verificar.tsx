import { useState, useEffect } from "react";
import {
View,
Text,
TextInput,
TouchableOpacity,
StyleSheet,
ScrollView,
Alert
} from "react-native";

export default function Verificar() {

const [texto,setTexto]=useState("");
const [resultado,setResultado]=useState<any>(null);

const [historico,setHistorico]=useState<any[]>([]);
const [favoritos,setFavoritos]=useState<any[]>([]);

// =========================
// CARREGAR HISTÓRICO
// =========================

async function carregarHistorico(){

try{

const response=await fetch(
"https://antigolpe-api-production.up.railway.app/api/historico"
);

const data=await response.json();

setHistorico(data);

}catch(error){

console.log(error);

}

}

// =========================
// CARREGAR FAVORITOS
// =========================

async function carregarFavoritos(){

try{

const response=await fetch(
"https://antigolpe-api-production.up.railway.app/api/favoritos"
);

const data=await response.json();

setFavoritos(data);

}catch(error){

console.log(error);

}

}

useEffect(()=>{

carregarHistorico();
carregarFavoritos();

},[]);


// =========================
// VERIFICAR
// =========================

async function verificar(){

try{

const response=await fetch(
"https://antigolpe-api-production.up.railway.app/api/verificar",
{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
texto
})
}
);

const data=await response.json();

setResultado(data);

carregarHistorico();

}catch{

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

const response=await fetch(
"https://antigolpe-api-production.up.railway.app/api/denunciar",
{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({

conteudo:texto,
motivo:"Denunciado pelo usuário",
descricao:"Enviado pelo app"

})
}
);

const data=await response.json();

Alert.alert(
"Sucesso",
data.mensagem
);

const novaConsulta=
await fetch(
"https://antigolpe-api-production.up.railway.app/api/verificar",
{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
texto
})
}
);

const novoResultado=
await novaConsulta.json();

setResultado(
novoResultado
);

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

const response=await fetch(
"https://antigolpe-api-production.up.railway.app/api/favoritar",
{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

conteudo:texto,
tipo:resultado?.tipo,
status:resultado?.status

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


// =========================
// TELA
// =========================

return(

<ScrollView
style={styles.container}
>

<Text style={styles.title}>
AntiGolpe
</Text>

<TextInput
style={styles.input}
placeholder="Digite site, CPF, telefone..."
placeholderTextColor="#999"
multiline
value={texto}
onChangeText={setTexto}
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

<Text style={styles.denunciarText}>
Denunciar
</Text>

</TouchableOpacity>


{resultado && (

<View style={styles.resultado}>

<Text style={styles.tipo}>
Tipo: {resultado.tipo}
</Text>

<Text
style={[
styles.status,
{
color:
resultado.status==="ALTO RISCO"
?
"#ff4444"
:
resultado.status==="SUSPEITO"
?
"#ffaa00"
:
"#00ff99"
}
]
}
>

Status: {resultado.status}

</Text>

<Text style={styles.score}>
Score: {resultado.score}
</Text>

<Text style={styles.denuncias}>
Denúncias: {resultado.denuncias}
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

{
historico.length>0
&&
(

<View>

<Text
style={styles.subtitulo}
>

Últimas consultas

</Text>

{

historico.map(
(item,index)=>(

<View
key={index}
style={
styles.historicoItem
}
>

<Text
style={
styles.historicoTexto
}
>

{item.conteudo}

</Text>

<Text
style={
styles.historicoStatus
}
>

{item.resultado}

</Text>

</View>

)
)

}

</View>

)
}

{
favoritos.length>0
&&
(

<View>

<Text
style={styles.subtitulo}
>

⭐ Favoritos

</Text>

{

favoritos.map(
(item,index)=>(

<View
key={index}
style={
styles.historicoItem
}
>

<Text
style={
styles.historicoTexto
}
>

{item.conteudo}

</Text>

<Text
style={
styles.historicoStatus
}
>

{item.status}

</Text>

</View>

)
)

}

</View>

)
}

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

buttonText:{
color:"#fff",
fontSize:22,
fontWeight:"bold"
},

denunciarButton:{
backgroundColor:"#ff4444",
padding:18,
borderRadius:20,
marginTop:10,
alignItems:"center"
},

denunciarText:{
color:"#fff",
fontSize:20
},

resultado:{
backgroundColor:"#09152d",
marginTop:25,
padding:20,
borderRadius:20
},

tipo:{
color:"#ccc",
fontSize:18
},

status:{
fontSize:30,
fontWeight:"bold",
marginTop:15
},

score:{
color:"#fff",
fontSize:22,
marginTop:10
},

denuncias:{
color:"#ffcc00",
fontSize:22,
marginTop:10
},

mensagem:{
color:"#ccc",
marginTop:15
},

favoritoButton:{
backgroundColor:"#ffcc00",
padding:15,
borderRadius:15,
marginTop:20
},

favoritoText:{
textAlign:"center",
fontWeight:"bold"
},

subtitulo:{
color:"#fff",
fontSize:22,
fontWeight:"bold",
marginTop:30,
marginBottom:15
},

historicoItem:{
backgroundColor:"#09152d",
padding:15,
borderRadius:15,
marginBottom:10
},

historicoTexto:{
color:"#fff",
fontSize:18
},

historicoStatus:{
color:"#00ff99",
marginTop:5
}

});