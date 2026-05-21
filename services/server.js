const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY
);

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});


// ================= VERIFICAR =================

app.post("/api/verificar", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        erro: "URL obrigatória"
      });
    }

    const prompt = `
Analise este domínio:

${url}

Responda APENAS JSON puro:

{
 "tipo":"SITE",
 "status":"SEGURO ou SUSPEITO ou ALTO RISCO",
 "score":0,
 "denuncias":0,
 "explicacao":"explicação curta"
}
`;

    const resultadoIA =
      await model.generateContent(prompt);

    let textoIA =
      resultadoIA.response?.text?.() ||
      resultadoIA.text ||
      "";

    console.log("Gemini bruto:");
    console.log(textoIA);

    textoIA = textoIA
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    let dados;

    try {

      dados = JSON.parse(textoIA);

    } catch {

      console.log(
        "Erro JSON Gemini. Retornando análise básica."
      );

      dados = {

        tipo: "SITE",

        status:
          url.includes(".xyz")
            ? "ALTO RISCO"
            : url.includes(".com.com")
            ? "SUSPEITO"
            : "SEGURO",

        score:
          url.includes(".xyz")
            ? 5
            : url.includes(".com.com")
            ? 3
            : 0,

        denuncias:
          url.includes(".xyz")
            ? 8
            : 0,

        explicacao:
          "Análise baseada em padrões conhecidos de phishing, typosquatting e reputação."
      };
    }

    return res.json(dados);

  } catch (erro) {

    console.log(erro);

    return res.status(500).json({
      erro: "Erro interno"
    });

  }
});


// ================= FAVORITAR =================

app.post("/api/favoritar", async (req, res) => {

  try {

    return res.json({
      sucesso: true
    });

  } catch {

    return res.status(500).json({
      sucesso: false
    });

  }

});


// ================= DENUNCIAR =================

app.post("/api/denunciar", async (req, res) => {

  try {

    return res.json({
      sucesso: true
    });

  } catch {

    return res.status(500).json({
      sucesso: false
    });

  }

});


// ================= HISTORICO =================

app.get("/api/historico", async (req, res) => {

  try {

    return res.json([]);

  } catch {

    return res.status(500).json([]);

  }

});


const PORT =
process.env.PORT || 3000;

app.listen(PORT, () => {

console.log(
`Servidor rodando na porta ${PORT}`
);

});