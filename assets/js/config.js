/* Configurações editáveis da operação.
   Altere este arquivo para mudar contatos, senha do painel e tarifas padrão. */
window.RDG_CONFIG = {
  ADMIN_PASSWORD: "rdg2026",
  WHATSAPP_NUMBER: "5511921398732",
  MAPBOX_TOKEN: "pk.eyJ1Ijoicm9vZHJpZ29tYXJxdWVzIiwiYSI6ImNtdDN2aWFmNzBhcW8yd29kNjVuaWI2OXAifQ.ZpyJwxiXMqE0PaNPzJtBNA",
  DEFAULT_RATES: {
  "moto": {
    "faixa1AteKm": 6,
    "faixa1Valor": 30,
    "faixa2AteKm": 13,
    "faixa2Valor": 40,
    "limiteKmLonga": 50,
    "kmAte50": 2.9,
    "kmAcima50": 2.35,
    "pesoLimite": 10,
    "pesoAdicional": 2
  },
  "carro": {
    "faixa1AteKm": 6,
    "faixa1Valor": 40,
    "faixa2AteKm": 20,
    "faixa2Valor": 65,
    "limiteKmLonga": 50,
    "kmAte50": 3.0,
    "kmAcima50": 2.5
  },
  "urgente": 12,
  "agendada": 10,
  "parada": 7,
  "repasse": {
    "moto": [
      1.5,
      1.6,
      1.7,
      1.8,
      2,
      2.2
    ],
    "carro": [
      1.8,
      2,
      2.2,
      2.4,
      2.7,
      3
    ]
  },
  "margemMinima": 20,
  "whatsappAlertas": true,
  "whatsappAdmin": "5511921398732",
  "pagamento": {
    "cartaoAvista": 4,
    "faturado10": 20,
    "faturado14": 3,
    "faturadoMulta": 40,
    "parceladoPct": 2.4,
    "parceladoObs": ""
  }
}
};

