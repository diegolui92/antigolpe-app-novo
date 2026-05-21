import React,{useState} from "react";

import{
View,
Text,
TextInput,
TouchableOpacity,
Alert,
ScrollView
} from "react-native";

export default function App(){

const [texto,setTexto]=useState("");

const [resultado,setResultado]=
useState(null);


// ====================
// VERIFICAR
// ====================

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

texto

})

}

);

const data=
await response.json();

setResultado(data);

}catch{

Alert.alert(
"Erro",
"Erro ao verificar"
);

}

}


// ====================
// DENUNCIAR
// ====================

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

texto

})

}

);

const data=
await response.json();

if(data.sucesso){

Alert.alert(
"Sucesso",
"Denúncia registrada"
);

verificar();

}else{

Alert.alert(
"Erro",
data.erro
);

}

}catch{

Alert.alert(
"Erro",
"Erro ao denunciar"
);

}

}


// ====================
// COR STATUS
// ====================

function corStatus(status){

if(status==="SEGURO")
return "#22c55e";

if(status==="SUSPEITO")
return "#f59e0b";

if(status==="FRAUDE")
return "#ef4444";

if(status==="REJEITADO")
return "#dc2626";

return "#fff";

}


// ====================
// APP
// ====================

return(

<ScrollView
style={{
flex:1,
backgroundColor:"#020617",
padding:25
}}
>

<Text
style={{
color:"#fff",
fontSize:42,
fontWeight:"bold",
marginTop:60,
marginBottom:40,
textAlign:"center"
}}
>

AntiGolpe

</Text>


<TextInput

placeholder=
"Digite site, email, telefone, pix..."

placeholderTextColor="#aaa"

value={texto}

onChangeText={setTexto}

multiline

style={{

backgroundColor:"#0f172a",
color:"#fff",
borderRadius:20,
padding:20,
fontSize:22,
minHeight:180,
marginBottom:25

}}

/>


<TouchableOpacity

onPress={verificar}

style={{

backgroundColor:"#22c55e",
padding:22,
borderRadius:20,
marginBottom:18

}}

>

<Text
style={{

color:"#fff",
fontWeight:"bold",
fontSize:24,
textAlign:"center"

}}
>

Verificar

</Text>

</TouchableOpacity>


<TouchableOpacity

onPress={denunciar}

style={{

backgroundColor:"#ef4444",
padding:22,
borderRadius:20,
marginBottom:30

}}

>

<Text
style={{

color:"#fff",
fontWeight:"bold",
fontSize:24,
textAlign:"center"

}}
>

Denunciar

</Text>

</TouchableOpacity>


{resultado && (

<View
style={{

backgroundColor:"#0f172a",
padding:25,
borderRadius:25,
marginBottom:50

}}
>

<Text
style={{
color:"#fff",
fontSize:22,
marginBottom:10
}}
>

Tipo: {resultado.tipo}

</Text>


<Text
style={{

color:
corStatus(
resultado.status
),

fontSize:30,
fontWeight:"bold",
marginBottom:20

}}
>

Status:
{" "}
{resultado.status}

</Text>


<Text
style={{

color:"#fff",
fontSize:24,
marginBottom:10

}}
>

Score:
{" "}
{resultado.score}

</Text>


<Text
style={{

color:"#facc15",
fontSize:22,
marginBottom:20

}}
>

Denúncias:
{" "}
{resultado.denuncias || 0}

</Text>


<Text
style={{

color:"#cbd5e1",
fontSize:20,
lineHeight:30

}}
>

{resultado.motivo}

</Text>

</View>

)}

</ScrollView>

);

}