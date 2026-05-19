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
  const [texto, setTexto] = useState("");
  const [resultado, setResultado] = useState<any>(null);

  function identificarTipo(valor: string) {
    const texto = valor.trim();

    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto)) {
      return "EMAIL";
    }

    if (
      texto.includes("www.") ||
      texto.includes(".com") ||
      texto.includes(".net") ||
      texto.includes(".org") ||
      texto.includes("http")
    ) {
      return "SITE";
    }

    const numeros = texto.replace(/\D/g, "");

    if (numeros.length === 11) {
      return "CPF";
    }

    if (numeros.length >= 10 && numeros.length <= 13) {
      return "TELEFONE";
    }

    if (
      texto.toLowerCase().includes("pix") ||
      texto.toLowerCase().includes("chave")
    ) {
      return "PIX";
    }

    return "TEXTO";
  }

  async function verificar() {
    try {

      const response = await fetch(
        "https://antigolpe-api-production.up.railway.app/api/verificar",
        {
          method: "POST",
          headers: {
            "Content-Type":"application/json",
          },
          body: JSON.stringify({
            texto,
          }),
        }
      );

      const data = await response.json();

      const tipo = identificarTipo(texto);

      setResultado({
        ...data,
        tipo,
      });

    } catch(error){

      console.log(error);

      Alert.alert(
        "Erro",
        "Erro ao verificar"
      );

    }
  }

  async function denunciar() {

    try {

      const response = await fetch(
        "https://antigolpe-api-production.up.railway.app/api/denunciar",
        {
          method:"POST",
          headers:{
            "Content-Type":"application/json",
          },
          body: JSON.stringify({
            conteudo:texto,
            motivo:"Denunciado pelo usuário",
            descricao:"Denúncia enviada pelo app"
          }),
        }
      );

      const data = await response.json();

      Alert.alert(
        "Denúncia enviada",
        data.mensagem || "Denúncia registrada"
      );

      setTexto("");

    } catch(error){

      console.log(error);

      Alert.alert(
        "Erro",
        "Erro ao denunciar"
      );

    }
  }

  return (
    <ScrollView style={styles.container}>

      <Text style={styles.title}>
        AntiGolpe
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Digite telefone, email, site, pix ou mensagem"
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
        onPress={denunciar}
        style={styles.denunciarButton}
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
        ? "#ff4444"
        : resultado.status==="SUSPEITO"
        ? "#ffaa00"
        : "#00ff99"
      }
      ]}
      >

      Status: {resultado.status}

      </Text>

      <Text style={styles.score}>
        Score: {resultado.score}
      </Text>

      <Text style={styles.mensagem}>
        {resultado.motivo}
      </Text>

      </View>

      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({

container:{
flex:1,
backgroundColor:"#020d22",
padding:20,
},

title:{
color:"#fff",
fontSize:42,
fontWeight:"bold",
alignSelf:"center",
marginTop:50,
marginBottom:30,
},

input:{
backgroundColor:"#16233d",
color:"#fff",
borderRadius:20,
padding:20,
minHeight:150,
fontSize:18,
},

button:{
backgroundColor:"#00c26e",
padding:20,
borderRadius:20,
alignItems:"center",
marginTop:20,
},

buttonText:{
color:"#fff",
fontSize:22,
fontWeight:"bold",
},

denunciarButton:{
backgroundColor:"#ff4444",
padding:18,
borderRadius:20,
alignItems:"center",
marginTop:12,
},

denunciarText:{
color:"#fff",
fontSize:20,
fontWeight:"bold",
},

resultado:{
backgroundColor:"#09152d",
marginTop:30,
borderRadius:20,
padding:20,
},

tipo:{
color:"#ccc",
fontSize:18,
marginBottom:15,
},

status:{
fontSize:30,
fontWeight:"bold",
marginBottom:20,
},

score:{
color:"#fff",
fontSize:24,
marginBottom:15,
},

mensagem:{
color:"#ccc",
fontSize:18,
lineHeight:28,
}

});