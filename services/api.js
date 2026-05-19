export async function verificarReputacao(texto) {
  try {
    const response = await fetch(
      `https://antigolpe-api-production.up.railway.app/reputacao/${texto}`
    );

    const data = await response.json();

    console.log("RESPOSTA API:", data);

    return {
      tipo: "SITE",

      status: data.reputacao
        ? data.reputacao.toUpperCase()
        : "DESCONHECIDO",

      score:
        data.reputacao === "Confiável"
          ? 100
          : data.reputacao === "Suspeito"
          ? 40
          : 10,

      mensagem:
        data.denuncias > 0
          ? `${data.denuncias} denúncia(s) encontrada(s)`
          : "Nenhuma denúncia encontrada",
    };
  } catch (error) {
    console.log("ERRO API:", error);

    return {
      tipo: "SITE",
      status: "ERRO",
      score: 0,
      mensagem: "Erro ao conectar com servidor",
    };
  }
}