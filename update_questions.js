const fs = require('fs');

const newQuestions = [
  {
    "text": "No rito processual da Lei de Drogas, após o oferecimento da denúncia pelo Ministério Público, o que o juiz deve fazer antes de recebê-la?",
    "options": [
      "Determinar a prisão preventiva imediata.",
      "Notificar o acusado para oferecer defesa prévia por escrito no prazo de 10 dias.",
      "Marcar a audiência de instrução e julgamento para o dia seguinte.",
      "Interrogar o réu em gabinete."
    ],
    "correctOption": 1,
    "justification": "A resposta correta é a B. O Art. 55 estabelece um rito especial onde o acusado tem o direito de apresentar defesa antes mesmo de o juiz decidir se aceita a denúncia.",
    "law": "Leis Extravagantes",
    "category": "Lei Antidrogas"
  },
  {
    "text": "As plantações ilícitas (como de maconha) encontradas em propriedades rurais ou urbanas devem ser:",
    "options": [
      "Colhidas e vendidas para fins medicinais pelo Estado.",
      "Imediatamente destruídas pelo Delegado de Polícia, que recolherá amostra para perícia.",
      "Cercadas e mantidas como prova até o fim do processo.",
      "Dadas para consumo de gado local."
    ],
    "correctOption": 1,
    "justification": "A resposta correta é a B. Conforme o Art. 50, § 3º, a destruição deve ser rápida, lavrando-se o auto de levantamento e preservando amostras para o laudo definitivo.",
    "law": "Leis Extravagantes",
    "category": "Lei Antidrogas"
  },
  {
    "text": "O uso de drogas por parte de quem tem o dever de prevenir ou reprimir o tráfico (Art. 40, II) gera:",
    "options": [
      "Apenas punição administrativa na corregedoria.",
      "Aumento de pena de um sexto a dois terços.",
      "Isenção de pena por estresse ocupacional.",
      "Diminuíção da pena pela metade."
    ],
    "correctOption": 1,
    "justification": "A resposta correta é a B. O fato de o agente ser um servidor público da área de segurança é uma causa de aumento de pena específica da lei.",
    "law": "Leis Extravagantes",
    "category": "Lei Antidrogas"
  },
  {
    "text": "O crime de tráfico de drogas é considerado pela Constituição Federal como:",
    "options": [
      "Crime afiançável se o réu for primário.",
      "Crime inafiançável e insuscetível de graça ou anistia.",
      "Contravenção penal de médio potencial.",
      "Crime político."
    ],
    "correctOption": 1,
    "justification": "A resposta correta é a B. O Art. 5º, XLIII da CF e o Art. 44 da Lei de Drogas reforçam o rigor contra o tráfico.",
    "law": "Leis Extravagantes",
    "category": "Lei Antidrogas"
  },
  {
    "text": "Se o agente pratica o tráfico visando atingir criança ou adolescente (Art. 40, VI), a pena será:",
    "options": [
      "Aumentada de um sexto a dois terços.",
      "Diminuída, pois o menor não tem discernimento.",
      "Mantida no mínimo legal.",
      "Convertida em perda do poder familiar apenas."
    ],
    "correctOption": 0,
    "justification": "A resposta correta é a A. A lei busca proteger de forma mais gravosa os grupos vulneráveis, como menores de idade.",
    "law": "Leis Extravagantes",
    "category": "Lei Antidrogas"
  },
  {
    "text": "O crime de \"Associação para o Tráfico\" (Art. 35) admite o benefício do \"Tráfico Privilegiado\" (Art. 33, § 4º)?",
    "options": [
      "Sim, se a associação for pequena.",
      "Não, pois a associação indica dedicação a atividades criminosas, o que veda o benefício.",
      "Somente se o réu for menor de 21 anos.",
      "Apenas se não houver uso de armas."
    ],
    "correctOption": 1,
    "justification": "A resposta correta é a B. O STJ consolidou o entendimento de que a condenação por associação impede o reconhecimento do privilégio no tráfico.",
    "law": "Leis Extravagantes",
    "category": "Lei Antidrogas"
  },
  {
    "text": "Qual é a característica do crime de tráfico de drogas quanto à sua natureza de perigo?",
    "options": [
      "Perigo concreto (precisa provar que alguém passou mal).",
      "Perigo abstrato (o risco à saúde pública é presumido pela lei).",
      "Crime culposo (ocorre por descuido).",
      "Dano efetivo obrigatório."
    ],
    "correctOption": 1,
    "justification": "A resposta correta é a B. Não é necessário que a droga cause dano a uma pessoa específica para o crime existir; a circulação da substância já é o crime.",
    "law": "Leis Extravagantes",
    "category": "Lei Antidrogas"
  },
  {
    "text": "Sobre a internação involuntária de dependentes (Art. 23-A), ela pode durar no máximo:",
    "options": [
      "1 ano.",
      "90 dias, para a desintoxicação.",
      "30 dias.",
      "2 anos."
    ],
    "correctOption": 1,
    "justification": "A resposta correta é a B. A internação involuntária deve ter prazo determinado e ser interrompida a pedido da família ou do médico responsável.",
    "law": "Leis Extravagantes",
    "category": "Lei Antidrogas"
  },
  {
    "text": "O crime de \"Maquinário para o Tráfico\" (Art. 34) é considerado subsidiário ao tráfico (Art. 33). Isso significa que:",
    "options": [
      "O agente responde pelos dois crimes em soma sempre.",
      "Se o agente fabrica e vende a droga, responde apenas pelo Art. 33 (absorção).",
      "O crime de maquinário tem pena maior que o tráfico.",
      "Não se pode apreender o maquinário sem a droga."
    ],
    "correctOption": 1,
    "justification": "A resposta correta é a B. Pelo princípio da consunção, o crime-fim (tráfico) absorve o crime-meio (posse do maquinário).",
    "law": "Leis Extravagantes",
    "category": "Lei Antidrogas"
  },
  {
    "text": "A posse de sementes de maconha, segundo jurisprudência recente dos tribunais superiores (STF/STJ):",
    "options": [
      "Configura tráfico de drogas sempre.",
      "É considerada conduta atípica (não é crime) por não possuir o princípio ativo (THC).",
      "É punida com 15 anos de reclusão.",
      "Configura contrabando internacional."
    ],
    "correctOption": 1,
    "justification": "A resposta correta é a B. Como a semente não tem THC, ela não é considerada droga ou matéria-prima capaz de gerar dependência imediata.",
    "law": "Leis Extravagantes",
    "category": "Lei Antidrogas"
  },
  {
    "text": "No caso de apreensão de bens (carros, aviões) usados no tráfico, o juiz pode autorizar o uso desses bens por qual órgão?",
    "options": [
      "Pela própria polícia ou órgãos de repressão ao tráfico.",
      "Pelo próprio traficante enquanto aguarda o julgamento.",
      "Por empresas de táxi locais.",
      "Por partidos políticos."
    ],
    "correctOption": 0,
    "justification": "A resposta correta é a A. O Art. 62 permite o uso cautelar dos bens em favor da segurança pública para auxiliar no combate ao crime.",
    "law": "Leis Extravagantes",
    "category": "Lei Antidrogas"
  },
  {
    "text": "Oferecer droga para consumo conjunto (Art. 33, § 3º) admite o benefício da Transação Penal da Lei 9.099/95?",
    "options": [
      "Não, nenhum crime da Lei de Drogas admite.",
      "Sim, pois é considerado um crime de menor potencial ofensivo.",
      "Apenas se a droga for sintética.",
      "Somente se o oferecimento for para familiares."
    ],
    "correctOption": 1,
    "justification": "A resposta correta é a B. Diferente do tráfico comum, esta modalidade específica possui pena máxima que permite os benefícios dos Juizados Especiais.",
    "law": "Leis Extravagantes",
    "category": "Lei Antidrogas"
  },
  {
    "text": "O agente que \"traz consigo\" droga para vender, mas é preso antes de realizar qualquer venda, comete:",
    "options": [
      "Tentativa de tráfico.",
      "Tráfico consumado.",
      "Ato preparatório impunível.",
      "Apenas uso de drogas."
    ],
    "correctOption": 1,
    "justification": "A resposta correta é a B. \"Trazer consigo\" é um dos 18 verbos do Art. 33; o crime se consuma com a simples posse com intuito de entrega.",
    "law": "Leis Extravagantes",
    "category": "Lei Antidrogas"
  },
  {
    "text": "A reincidência em crimes de tráfico (Art. 33) impede qual benefício?",
    "options": [
      "Direito a advogado.",
      "Aplicação do tráfico privilegiado (Art. 33, § 4º).",
      "Direito de permanecer em silêncio.",
      "Saída para o banho de sol."
    ],
    "correctOption": 1,
    "justification": "A resposta correta é a B. Um dos requisitos cumulativos para a redução de pena é ser primário.",
    "law": "Leis Extravagantes",
    "category": "Lei Antidrogas"
  },
  {
    "text": "Se o tráfico é cometido próximo a uma unidade prisional, a pena é aumentada porque:",
    "options": [
      "O preso tem dinheiro para pagar mais caro.",
      "A lei visa proteger a disciplina e a segurança do sistema carcerário.",
      "Os policiais penais ganham comissão.",
      "O tráfico na prisão é considerado crime militar."
    ],
    "correctOption": 1,
    "justification": "A resposta correta é a B. É a aplicação do Art. 40, inciso III (proximidade de estabelecimentos prisionais).",
    "law": "Leis Extravagantes",
    "category": "Lei Antidrogas"
  },
  {
    "text": "O crime de \"Prescrever droga fora da norma\" (Art. 38) exige dolo (vontade livre e consciente)?",
    "options": [
      "Sim, sempre.",
      "Não, admite a modalidade culposa (negligência, imperícia ou imprudência).",
      "Apenas se o paciente morrer.",
      "Não, é um crime de responsabilidade objetiva."
    ],
    "correctOption": 1,
    "justification": "A resposta correta é a B. É um dos raros crimes na Lei de Drogas que pune a conduta culposa do profissional de saúde.",
    "law": "Leis Extravagantes",
    "category": "Lei Antidrogas"
  },
  {
    "text": "No procedimento de incineração (destruição) da droga, a autoridade deve guardar:",
    "options": [
      "Toda a droga até o final do processo.",
      "Amostra necessária para a realização do laudo definitivo (contraperícia).",
      "O dinheiro encontrado junto com a droga.",
      "Fotos da droga apenas."
    ],
    "correctOption": 1,
    "justification": "A resposta correta é a B. Conforme o Art. 50, a amostra de reserva é fundamental para garantir o direito de defesa do réu.",
    "law": "Leis Extravagantes",
    "category": "Lei Antidrogas"
  },
  {
    "text": "A natureza e a quantidade da droga apreendida influenciam em qual momento da pena?",
    "options": [
      "Não influenciam em nada.",
      "Na fixação da pena-base, com prevalência sobre as circunstâncias judiciais comuns.",
      "Apenas na hora de decidir o presídio.",
      "Apenas se a droga for pesada em balança oficial."
    ],
    "correctOption": 1,
    "justification": "A resposta correta é a B. O Art. 42 determina que o juiz deve considerar a natureza e a quantidade da droga como critérios principais na primeira fase da dosimetria.",
    "law": "Leis Extravagantes",
    "category": "Lei Antidrogas"
  },
  {
    "text": "O crime de \"Financiar o Tráfico\" (Art. 36) é crime hediondo?",
    "options": [
      "Não, a lei não cita o Art. 36 como hediondo.",
      "Sim, o Art. 44 da Lei de Drogas equipara o financiamento ao tráfico para fins de rigor penal.",
      "Apenas se o financiador for estrangeiro.",
      "Somente se o valor financiado for superior a 1 milhão."
    ],
    "correctOption": 1,
    "justification": "A resposta correta é a B. O tratamento rigoroso dado ao tráfico (inafiançabilidade) estende-se ao seu financiamento.",
    "law": "Leis Extravagantes",
    "category": "Lei Antidrogas"
  },
  {
    "text": "É causa de aumento de pena o tráfico exercido entre municípios do mesmo Estado?",
    "options": [
      "Sim, aumenta de um sexto a dois terços.",
      "Não, a lei prevê aumento apenas para tráfico interestadual (entre Estados) e transnacional.",
      "Sim, se a distância for maior que 100km.",
      "Somente se cruzar a capital do Estado."
    ],
    "correctOption": 1,
    "justification": "A resposta correta é a B. O Art. 40, V fala em tráfico entre Estados da Federação ou entre estes e o Distrito Federal. O tráfico entre cidades vizinhas do mesmo Estado não gera este aumento.",
    "law": "Leis Extravagantes",
    "category": "Lei Antidrogas"
  },
  {
    "text": "Se um usuário de drogas se recusa a cumprir a medida educativa imposta pelo juiz, qual a sanção possível?",
    "options": [
      "Prisão por 30 dias.",
      "Admoestação verbal e multa.",
      "Expulsão da cidade.",
      "Trabalhos forçados."
    ],
    "correctOption": 1,
    "justification": "A resposta correta é a B. O Art. 28, § 6º prevê essas medidas para garantir a execução das penas educativas.",
    "law": "Leis Extravagantes",
    "category": "Lei Antidrogas"
  },
  {
    "text": "A \"mula\" do tráfico, quando comprovado que não integra organização criminosa, tem direito a:",
    "options": [
      "Absolvição.",
      "Redução de pena pelo tráfico privilegiado (Art. 33, § 4º).",
      "Responder em liberdade sem julgamento.",
      "Ser considerada apenas usuária."
    ],
    "correctOption": 1,
    "justification": "A resposta correta é a B. O STF entende que o simples transporte não prova, por si só, que o agente vive do crime ou integra a facção.",
    "law": "Leis Extravagantes",
    "category": "Lei Antidrogas"
  },
  {
    "text": "O crime de \"Induzimento ao Uso\" (Art. 33, § 2º) admite a forma culposa?",
    "options": [
      "Sim, se o agente induzir sem querer.",
      "Não, exige o dolo (vontade de levar o outro ao consumo).",
      "Apenas se a vítima for parente.",
      "Sim, se o agente estiver sob efeito de álcool."
    ],
    "correctOption": 1,
    "justification": "A resposta correta é a B. Induzir ou instigar pressupõe uma vontade direcionada a convencer outra pessoa.",
    "law": "Leis Extravagantes",
    "category": "Lei Antidrogas"
  },
  {
    "text": "No crime de associação para o tráfico (Art. 35), o aumento de pena por envolver adolescente (Art. 40, VI) é aplicado?",
    "options": [
      "Não, apenas no crime de tráfico (Art. 33).",
      "Sim, as causas de aumento do Art. 40 aplicam-se a todos os crimes previstos de 33 a 37 da lei.",
      "Apenas se o adolescente for o chefe da associação.",
      "Somente se o adolescente usar arma de fogo."
    ],
    "correctOption": 1,
    "justification": "A resposta correta é a B. O caput do Art. 40 deixa claro que as causas de aumento incidem sobre os crimes de tráfico, maquinário, financiamento e associação.",
    "law": "Leis Extravagantes",
    "category": "Lei Antidrogas"
  },
  {
    "text": "A reincidência em crimes da Lei de Drogas aumenta o prazo de cumprimento da pena para fins de livramento condicional?",
    "options": [
      "Não, o prazo é igual para todos.",
      "Sim, para crimes hediondos ou equiparados (como o tráfico), exige-se o cumprimento de mais de dois terços da pena.",
      "Apenas se o réu for idoso.",
      "O reincidente em tráfico não tem direito a livramento condicional."
    ],
    "correctOption": 1,
    "justification": "A resposta correta é a B. O Art. 44, parágrafo único, estabelece requisitos mais rígidos para o livramento condicional no tráfico, vedando-o ao reincidente específico.",
    "law": "Leis Extravagantes",
    "category": "Lei Antidrogas"
  }
];

const data = JSON.parse(fs.readFileSync('src/questions_antidrogas.json', 'utf8'));
const first25 = data.slice(0, 25);
const combined = [...first25, ...newQuestions];
fs.writeFileSync('src/questions_antidrogas.json', JSON.stringify(combined, null, 2));
console.log('Successfully updated questions_antidrogas.json');
