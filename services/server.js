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

function detectarTipo(texto) {
  if (texto.includes("@")) return "EMAIL";

  if (
    texto.includes("http") ||
    texto.includes(".com") ||
    texto.includes(".xyz")
  ) {
    return "SITE";
  }

  if (texto.length >= 11) {
    return "TELEFONE/PIX";
  }

  return "DESCONHECIDO";
}

// =========================
// VERIFICAR
// =========================

app.post("/api/verificar", async (req, res) => {
  try {
    const { texto } = req.body;

    if (!texto) {
      return res.status(400).json({
        erro: "Texto não enviado",
      });
    }

    const tipo = detectarTipo(texto);

    // CONSULTAR REPUTAÇÃO
    const { data: reputacao } = await supabase
      .from("reputacoes")
      .select("*")
      .eq("conteudo", texto)
      .limit(1);

    // CONSULTAR LISTA NEGRA
    const { data: denunciasBanco } = await supabase
      .from("lista_negra")
      .select("*")
      .eq("conteudo", texto);

    let status = "SEGURO";
    let score = 0;
    let motivo = "Nenhum risco encontrado";

    // CASO EXISTA REPUTAÇÃO
    if (reputacao && reputacao.length > 0) {
      status = reputacao[0].nivel || "SUSPEITO";
      score = reputacao[0].score || 0;
      motivo = "Resultado baseado na comunidade";
    }

    // ANÁLISE PADRÃO
    if (
      texto.includes(".xyz") ||
      texto.includes("bit.ly") ||
      texto.includes("ganhe") ||
      texto.includes("pix")
    ) {
      status = "SUSPEITO";
      score = 40;
      motivo = "Domínio suspeito";
    }

    // SALVAR VERIFICAÇÃO AUTOMÁTICA
    await supabase
      .from("verificacoes")
      .insert([
        {
          conteudo: texto,
          tipo: tipo,
          resultado: status,
          score: score,
          risco: motivo,
        }
      ]);

    return res.json({
      tipo,
      status,
      score,
      denuncias: denunciasBanco?.length || 0,
      motivo,
      motivos:
        denunciasBanco?.map(item => item.motivo) || []
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      erro: "Erro ao verificar"
    });

  }
});

// =========================
// DENUNCIAR
// =========================

app.post("/api/denunciar", async (req, res) => {

  try {

    const { conteudo, motivo, descricao } = req.body;

    if (!conteudo) {
      return res.status(400).json({
        erro: "Conteúdo não enviado"
      });
    }

    const tipo = detectarTipo(conteudo);

    await supabase
      .from("lista_negra")
      .insert([
        {
          conteudo,
          tipo,
          motivo,
          categoria: descricao,
          risco: "ALTO"
        }
      ]);

    const { data: reputacao } = await supabase
      .from("reputacoes")
      .select("*")
      .eq("conteudo", conteudo)
      .limit(1);

    if (reputacao && reputacao.length > 0) {

      await supabase
        .from("reputacoes")
        .update({
          total_denuncias:
            reputacao[0].total_denuncias + 1,

          score:
            reputacao[0].score + 50,

          nivel: "ALTO RISCO"
        })
        .eq("conteudo", conteudo);

    } else {

      await supabase
        .from("reputacoes")
        .insert([
          {
            conteudo,
            tipo,
            total_denuncias: 1,
            score: 50,
            nivel: "ALTO RISCO"
          }
        ]);

    }

    return res.json({
      sucesso: true,
      mensagem: "Denúncia registrada"
    });

  } catch(error){

    console.log(error);

    return res.status(500).json({
      erro:"Erro ao denunciar"
    });

  }

});

// =========================
// SERVIDOR
// =========================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor AntiGolpe rodando");
});