import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";

export default function VerificarScreen() {

  const [texto,setTexto]=useState("");
  const [resultado,setResultado]=useState<any>(null);
  const [historico,setHistorico]=useState<any[]>([]);

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

    }catch(error){

      Alert.alert(
      "Erro",
      "Erro ao verificar"
      );

    }

  }

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

    }catch{

      Alert.alert(
      "Erro",
      "Erro ao denunciar"
      );

    }

  }

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
placeholder="Digite site, CPF, telefone, PIX..."
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

<Text style={styles.status}>
Status: {resultado.status}
</Text>

<Text style={styles.score}>
Score: {resultado.score}
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

{historico.length>0 && (

<View style={styles.historicoContainer}>

<Text style={styles.subtitulo}>
Últimas consultas
</Text>

{historico.map((item,index)=>(

<View
key={index}
style={styles.historicoItem}
>

<Text style={styles.historicoTexto}>
{item.conteudo}
</Text>

<Text style={styles.historicoStatus}>
{item.resultado}
</Text>

</View>

))}

</View>

)}

</ScrollView>

)

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
marginTop:20,
padding:20,
borderRadius:20
},

tipo:{
color:"#fff"
},

status:{
color:"#ffaa00",
marginTop:10
},

score:{
color:"#fff",
marginTop:10
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

historicoContainer:{
marginTop:30
},

subtitulo:{
color:"#fff",
fontSize:22,
fontWeight:"bold"
},

historicoItem:{
backgroundColor:"#09152d",
padding:15,
borderRadius:15,
marginTop:10
},

historicoTexto:{
color:"#fff"
},

historicoStatus:{
color:"#00ff99",
marginTop:5
}

});