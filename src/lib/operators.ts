// Base de dados de todos os operadores indexados ao OMIE
// Fonte: https://www.tiagofelicia.pt/formulas-tarifarios-indexados

export type OperatorType = 'quarto-horario' | 'media'

export interface FormulaVariable {
  symbol: string
  name: string
  value?: number   // undefined = variável (ex: OMIE, perdas)
  unit: string
  description: string
}

export interface OperatorPreset {
  id: string
  name: string
  company: string
  type: OperatorType
  url: string
  // Componentes da fórmula: (OMIE × adequacyFactor + innerCosts) × (1+lossCoeff) + margin + TAR + tse + go + mfrr
  adequacyFactor: number  // F_adeq / FA / K1 — multiplicador sobre OMIE
  innerCosts: number      // CGS/CS+CR que entram dentro do multiplicador de perdas
  margin: number          // margem comercial + extras adicionados APÓS perdas
  tse: number             // Tarifa Social de Electricidade
  go: number              // Garantias de Origem
  mfrr: number            // Banda mFRR (Iberdrola)
  // Exibição
  formulaStr: string
  variables: FormulaVariable[]
}

const CGS = 0.01626   // Valor ERC médio mensal (atualizado pela ERSE)
const TSE = 0.0020666 // Financiamento Tarifa Social

export const OPERATORS: OperatorPreset[] = [
  // ── QUARTO-HORÁRIOS (Dinâmicos) ──────────────────────────────────────
  {
    id: 'g9-smart-dynamic',
    name: 'G9 Smart Dynamic',
    company: 'G9 Energia',
    type: 'quarto-horario',
    url: 'https://g9.pt/energia/',
    adequacyFactor: 1.02,
    innerCosts: 0,
    margin: 0.0155,    // GGS (0.0100) + AC (0.0055)
    tse: 0,
    go: 0,
    mfrr: 0,
    formulaStr: 'PE = OMIE × F_adeq × (1 + Perdas) + GGS + AC + TAR',
    variables: [
      { symbol: 'OMIE', name: 'Preço OMIE Portugal', unit: '€/kWh', description: 'Preço de mercado grossista a cada 15 minutos' },
      { symbol: 'F_adeq', name: 'Fator de Adequação', value: 1.02, unit: 'adimensional', description: 'Fator de ajuste comercial G9' },
      { symbol: 'Perdas', name: 'Perdas da Rede', unit: '%', description: 'Coeficientes de perdas publicados pela ERSE por quarto de hora' },
      { symbol: 'GGS', name: 'Garantia de Gestão e Serviço', value: 0.0100, unit: '€/kWh', description: 'Custo de gestão G9' },
      { symbol: 'AC', name: 'Ajuste Comercial', value: 0.0055, unit: '€/kWh', description: 'Componente comercial G9' },
      { symbol: 'TAR', name: 'Tarifa de Acesso às Redes', unit: '€/kWh', description: 'Regulada pela ERSE — varia por período horário' },
    ],
  },
  {
    id: 'alfa-power-index',
    name: 'Alfa Power Index BTN',
    company: 'Alfa Energia',
    type: 'quarto-horario',
    url: 'https://www.alfaenergia.pt',
    adequacyFactor: 1.0,
    innerCosts: CGS,   // CGS dentro das perdas
    margin: 0.010,     // k (gastos operacionais)
    tse: TSE,
    go: 0,
    mfrr: 0,
    formulaStr: 'Preço = (OMIE + CGS) × (1 + Perdas) + k + TAR + TSE',
    variables: [
      { symbol: 'OMIE', name: 'Preço OMIE Portugal', unit: '€/kWh', description: 'Preço de mercado grossista a cada 15 minutos' },
      { symbol: 'CGS', name: 'Custos de Gestão do Sistema', value: CGS, unit: '€/kWh', description: 'Valor médio ERC do mês atual (atualizado semanalmente)' },
      { symbol: 'Perdas', name: 'Perdas da Rede', unit: '%', description: 'Fixadas pela ERSE, variáveis a cada quarto de hora' },
      { symbol: 'k', name: 'Gastos Operacionais Alfa', value: 0.010, unit: '€/kWh', description: 'Margem comercial Alfa Energia' },
      { symbol: 'TAR', name: 'Tarifa de Acesso às Redes', unit: '€/kWh', description: 'Regulada pela ERSE — varia por período horário' },
      { symbol: 'TSE', name: 'Tarifa Social de Electricidade', value: TSE, unit: '€/kWh', description: 'Financiamento da tarifa social' },
    ],
  },
  {
    id: 'coopernico-base',
    name: 'Coopérnico Base',
    company: 'Coopérnico',
    type: 'quarto-horario',
    url: 'https://www.coopernico.org',
    adequacyFactor: 1.0,
    innerCosts: 0.009 + CGS,  // k + CS+CR dentro das perdas
    margin: 0,
    tse: TSE,
    go: 0,
    mfrr: 0,
    formulaStr: 'P = (OMIE + k + CS+CR) × (1 + FP) + TAR + TSE',
    variables: [
      { symbol: 'OMIE', name: 'Preço OMIE Portugal', unit: '€/kWh', description: 'Preço de mercado grossista a cada 15 minutos' },
      { symbol: 'k', name: 'Margem Coopérnico', value: 0.009, unit: '€/kWh', description: 'Componente comercial Coopérnico' },
      { symbol: 'CS+CR', name: 'Custos de Sistema e Regulação', value: CGS, unit: '€/kWh', description: 'Valor médio ERC do mês atual (atualizado semanalmente)' },
      { symbol: 'FP', name: 'Perfil de Perda', unit: '%', description: 'Perdas da rede de distribuição (variável ERSE)' },
      { symbol: 'TAR', name: 'Tarifa de Acesso às Redes', unit: '€/kWh', description: 'Regulada pela ERSE — varia por período horário' },
      { symbol: 'TSE', name: 'Tarifa Social de Electricidade', value: TSE, unit: '€/kWh', description: 'Financiamento da tarifa social' },
    ],
  },
  {
    id: 'coopernico-go',
    name: 'Coopérnico GO',
    company: 'Coopérnico',
    type: 'quarto-horario',
    url: 'https://www.coopernico.org',
    adequacyFactor: 1.0,
    innerCosts: 0.009 + CGS,
    margin: 0,
    tse: TSE,
    go: 0.001,
    mfrr: 0,
    formulaStr: 'P = (OMIE + k + CS+CR) × (1 + FP) + GO + TAR + TSE',
    variables: [
      { symbol: 'OMIE', name: 'Preço OMIE Portugal', unit: '€/kWh', description: 'Preço de mercado grossista a cada 15 minutos' },
      { symbol: 'k', name: 'Margem Coopérnico', value: 0.009, unit: '€/kWh', description: 'Componente comercial Coopérnico' },
      { symbol: 'CS+CR', name: 'Custos de Sistema e Regulação', value: CGS, unit: '€/kWh', description: 'Valor médio ERC do mês atual' },
      { symbol: 'FP', name: 'Perfil de Perda', unit: '%', description: 'Perdas da rede de distribuição (variável ERSE)' },
      { symbol: 'GO', name: 'Garantias de Origem', value: 0.001, unit: '€/kWh', description: 'Certificados de energia renovável' },
      { symbol: 'TAR', name: 'Tarifa de Acesso às Redes', unit: '€/kWh', description: 'Regulada pela ERSE — varia por período horário' },
      { symbol: 'TSE', name: 'Tarifa Social de Electricidade', value: TSE, unit: '€/kWh', description: 'Financiamento da tarifa social' },
    ],
  },
  {
    id: 'edp-indexada-horaria',
    name: 'EDP Indexada Horária',
    company: 'EDP Comercial',
    type: 'quarto-horario',
    url: 'https://www.edp.pt/particulares/energia/gas-eletricidade-oferta-indexada/',
    adequacyFactor: 1.08,  // K1
    innerCosts: 0,
    margin: 0.0185,        // K2
    tse: 0,
    go: 0,
    mfrr: 0,
    formulaStr: 'P = OMIE × (1 + Perdas) × K₁ + K₂ + TAR',
    variables: [
      { symbol: 'OMIE', name: 'Preço OMIE Portugal', unit: '€/kWh', description: 'Preço de mercado grossista a cada 15 minutos' },
      { symbol: 'Perdas', name: 'Coeficiente de Perdas', unit: '%', description: 'Ajustamento para perdas na rede (variável ERSE)' },
      { symbol: 'K₁', name: 'Fator Comercial EDP', value: 1.08, unit: 'adimensional', description: 'Multiplicador sobre OMIE após perdas' },
      { symbol: 'K₂', name: 'Componente Fixa EDP', value: 0.0185, unit: '€/kWh', description: 'Custo adicional fixo por kWh' },
      { symbol: 'TAR', name: 'Tarifa de Acesso às Redes', unit: '€/kWh', description: 'Regulada pela ERSE — varia por período horário' },
    ],
  },
  {
    id: 'ezu-indexada',
    name: 'EZU Tarifa Indexada',
    company: 'EZU Energia',
    type: 'quarto-horario',
    url: 'https://ezu.pt/tarifas',
    adequacyFactor: 1.0,
    innerCosts: CGS + 0.020,
    margin: 0,
    tse: TSE,
    go: 0,
    mfrr: 0,
    formulaStr: 'P = (OMIE + CGS + k) × (1 + Perdas) + TAR + TSE',
    variables: [
      { symbol: 'OMIE', name: 'Preço OMIE Portugal', unit: '€/kWh', description: 'Preço de mercado grossista a cada 15 minutos' },
      { symbol: 'CGS', name: 'Custos de Gestão do Sistema', value: CGS, unit: '€/kWh', description: 'Valor médio ERC do mês atual' },
      { symbol: 'k', name: 'Gastos Operacionais EZU', value: 0.020, unit: '€/kWh', description: 'Margem comercial EZU Energia' },
      { symbol: 'Perdas', name: 'Perdas da Rede', unit: '%', description: 'Fixadas pela ERSE, variáveis a cada quarto de hora' },
      { symbol: 'TAR', name: 'Tarifa de Acesso às Redes', unit: '€/kWh', description: 'Regulada pela ERSE — varia por período horário' },
      { symbol: 'TSE', name: 'Tarifa Social de Electricidade', value: TSE, unit: '€/kWh', description: 'Financiamento da tarifa social' },
    ],
  },
  {
    id: 'galp-dinamico',
    name: 'Galp Plano Dinâmico',
    company: 'Galp',
    type: 'quarto-horario',
    url: 'https://www.galp.com/pt/casa/planos-eletricidade-e-gas/eletricidade-indexada',
    adequacyFactor: 1.0,
    innerCosts: 0.0191,  // Ci
    margin: 0,
    tse: 0,
    go: 0,
    mfrr: 0,
    formulaStr: 'Preço = (OMIE + Ci) × (1 + Li) + TAR',
    variables: [
      { symbol: 'OMIE', name: 'Preço OMIE Portugal', unit: '€/kWh', description: 'Preço horário OMIE Portugal a cada 15 minutos' },
      { symbol: 'Ci', name: 'Componente Comercializador', value: 0.0191, unit: '€/kWh', description: 'Inclui margem, desvios e garantias de origem Galp' },
      { symbol: 'Li', name: 'Perdas', unit: '%', description: 'Perdas em percentagem, publicadas pela ERSE a cada 15 minutos' },
      { symbol: 'TAR', name: 'Tarifa de Acesso às Redes', unit: '€/kWh', description: 'Regulada pela ERSE — varia por período horário' },
    ],
  },
  {
    id: 'iberdrola-dinamico',
    name: 'Iberdrola Simples Dinâmico',
    company: 'Iberdrola',
    type: 'quarto-horario',
    url: 'https://www.iberdrola.pt/casa/energia/plano-indexado-simples-dinamico',
    adequacyFactor: 1.0,
    innerCosts: 0,
    margin: 0.030,      // Q
    tse: TSE,
    go: 0,
    mfrr: 0.00194,
    formulaStr: 'P = OMIE × (1 + Perdas) + Q + Banda_mFRR + TAR + TSE',
    variables: [
      { symbol: 'OMIE', name: 'Preço OMIE Portugal', unit: '€/kWh', description: 'Preço ibérico em Portugal a cada 15 minutos' },
      { symbol: 'Perdas', name: 'Perdas da Rede', unit: '%', description: 'Fixadas pela ERSE, variáveis a cada quarto de hora' },
      { symbol: 'Q', name: 'Custo Operação + Comercialização', value: 0.030, unit: '€/kWh', description: 'Componente comercial e de operação Iberdrola' },
      { symbol: 'Banda_mFRR', name: 'Banda Reserva Frequência', value: 0.00194, unit: '€/kWh', description: 'Sobrecusto leilão mFRR' },
      { symbol: 'TAR', name: 'Tarifa de Acesso às Redes', unit: '€/kWh', description: 'Tarifa única (opção Simples)' },
      { symbol: 'TSE', name: 'Tarifa Social de Electricidade', value: TSE, unit: '€/kWh', description: 'Financiamento da tarifa social' },
    ],
  },
  {
    id: 'meooenergia-dinamico',
    name: 'MeoEnergia Dinâmica',
    company: 'MeoEnergia',
    type: 'quarto-horario',
    url: 'https://www.meoenergia.pt/eletricidade/tarifa-dinamica',
    adequacyFactor: 1.0,
    innerCosts: 0.050,  // K (inclui gestão, desvios e margem)
    margin: 0,
    tse: 0,
    go: 0,
    mfrr: 0,
    formulaStr: 'P = (OMIE + K) × (1 + FP) + TAR',
    variables: [
      { symbol: 'OMIE', name: 'Preço OMIE Portugal', unit: '€/kWh', description: 'Preço ibérico em Portugal a cada 15 minutos' },
      { symbol: 'K', name: 'Margem + Gestão + Desvios', value: 0.050, unit: '€/kWh', description: 'Inclui gestão do sistema, desvios e margem comercial MeoEnergia' },
      { symbol: 'FP', name: 'Fator de Perdas', unit: '%', description: 'Perdas rede Baixa Tensão (variável ERSE)' },
      { symbol: 'TAR', name: 'Tarifa de Acesso às Redes', unit: '€/kWh', description: 'Regulada pela ERSE — varia por período horário' },
    ],
  },
  {
    id: 'plenitude-tendencia',
    name: 'Plenitude Tendência',
    company: 'Plenitude (Eni)',
    type: 'quarto-horario',
    url: 'https://eniplenitude.pt/eletricidade/tendencia/',
    adequacyFactor: 1.0,
    innerCosts: CGS + 0.001,  // CGS + GDOs
    margin: 0.008,             // Fee
    tse: 0,
    go: 0,
    mfrr: 0,
    formulaStr: 'P = (OMIE + CGS + GDOs) × (1 + Perdas) + Fee + TAR',
    variables: [
      { symbol: 'OMIE', name: 'Preço OMIE Portugal', unit: '€/kWh', description: 'Preço de mercado diário OMIE' },
      { symbol: 'CGS', name: 'Custos Gestão Sistema REN', value: CGS, unit: '€/kWh', description: 'Custos de gestão + desvios (ERC médio mensal)' },
      { symbol: 'GDOs', name: 'Garantias de Origem', value: 0.001, unit: '€/kWh', description: 'Custo das garantias de origem renováveis' },
      { symbol: 'Perdas', name: 'Perfil de Perdas', unit: '%', description: 'Perfil de perdas da rede de distribuição ERSE' },
      { symbol: 'Fee', name: 'Margem Comercial Plenitude', value: 0.008, unit: '€/kWh', description: 'Componente comercial da Plenitude' },
      { symbol: 'TAR', name: 'Tarifa de Acesso às Redes', unit: '€/kWh', description: 'Tarifa única (opção Simples)' },
    ],
  },
  {
    id: 'repsol-leve',
    name: 'Repsol Leve Sem Mais',
    company: 'Repsol',
    type: 'quarto-horario',
    url: 'https://www.repsol.pt/particulares/casa/eletricidade-gas/planos-eletricidade-e-gas/plano-leve-sem-mais/',
    adequacyFactor: 1.03,  // FA
    innerCosts: 0,
    margin: 0.02109,       // QTarifa
    tse: TSE,              // FinTS
    go: 0,
    mfrr: 0,
    formulaStr: 'Preço = OMIE × (1 + Perdas) × FA + QTarifa + FinTS + TAR',
    variables: [
      { symbol: 'OMIE', name: 'Preço OMIE Portugal', unit: '€/kWh', description: 'Preço marginal sistema Português por quarto de hora' },
      { symbol: 'Perdas', name: 'Coeficientes de Perdas', unit: '%', description: 'Coeficientes por quarto de hora conforme legislação' },
      { symbol: 'FA', name: 'Fator de Adequação', value: 1.03, unit: 'adimensional', description: 'Fator de ajuste Repsol' },
      { symbol: 'QTarifa', name: 'Serviços + Desvios + Margem', value: 0.02109, unit: '€/kWh', description: 'Serviços complementares, encargos, desvios e margem Repsol' },
      { symbol: 'FinTS', name: 'Financiamento Tarifa Social', value: TSE, unit: '€/kWh', description: 'Financiamento da tarifa social de electricidade' },
      { symbol: 'TAR', name: 'Tarifa de Acesso às Redes', unit: '€/kWh', description: 'Regulada pela ERSE — varia por período horário' },
    ],
  },

  // ── MÉDIA ──────────────────────────────────────────────────────────────
  {
    id: 'g9-smart-index',
    name: 'G9 Smart Index (Média)',
    company: 'G9 Energia',
    type: 'media',
    url: 'https://g9.pt/energia/',
    adequacyFactor: 1.02,
    innerCosts: 0,
    margin: 0.0155,
    tse: 0,
    go: 0,
    mfrr: 0,
    formulaStr: 'PE = OMIE_médio × F_adeq × (1 + Perdas) + GGS + AC + TAR',
    variables: [
      { symbol: 'OMIE_médio', name: 'OMIE Médio do Período', unit: '€/kWh', description: 'Preço médio do mercado grossista para o período de faturação' },
      { symbol: 'F_adeq', name: 'Fator de Adequação', value: 1.02, unit: 'adimensional', description: 'Fator de ajuste comercial G9' },
      { symbol: 'Perdas', name: 'Perdas da Rede', unit: '%', description: 'Médias dos coeficientes de perdas publicados pela ERSE' },
      { symbol: 'GGS', name: 'Garantia de Gestão e Serviço', value: 0.0100, unit: '€/kWh', description: 'Custo de gestão G9' },
      { symbol: 'AC', name: 'Ajuste Comercial', value: 0.0055, unit: '€/kWh', description: 'Componente comercial G9' },
      { symbol: 'TAR', name: 'Tarifa de Acesso às Redes', unit: '€/kWh', description: 'Regulada pela ERSE — varia por período horário' },
    ],
  },
  {
    id: 'goldenergy',
    name: 'Goldenergy Indexado 100%',
    company: 'Goldenergy',
    type: 'media',
    url: 'https://www.goldenergy.pt',
    adequacyFactor: 1.0,
    innerCosts: 0,
    margin: 0.02925,  // QTarifa (0.02425) + CG (0.005)
    tse: 0,
    go: 0,
    mfrr: 0,
    formulaStr: 'CE = (OMIE × (1 + Perdas) + QTarifa + CG) + TAR',
    variables: [
      { symbol: 'OMIE', name: 'OMIE Médio do Período', unit: '€/kWh', description: 'Preço médio do período de faturação' },
      { symbol: 'Perdas', name: 'Coeficientes de Perdas', unit: '%', description: 'Coeficientes correspondentes ao consumo' },
      { symbol: 'QTarifa', name: 'Serviços + Desvios + GO', value: 0.02425, unit: '€/kWh', description: 'Serviços complementares, encargos, desvios e garantias de origem' },
      { symbol: 'CG', name: 'Custo de Gestão', value: 0.005, unit: '€/kWh', description: 'Custo de gestão por kWh consumido' },
      { symbol: 'TAR', name: 'Tarifa de Acesso às Redes (TEPA)', unit: '€/kWh', description: 'Custo de acesso às redes regulado pela ERSE' },
    ],
  },
  {
    id: 'ibelectra-amigo',
    name: 'Ibelectra Solução Amigo',
    company: 'Ibelectra',
    type: 'media',
    url: 'https://www.ibelectra.pt',
    adequacyFactor: 1.0,
    innerCosts: 0.009,  // CS
    margin: 0.0055,     // K
    tse: TSE,
    go: 0,
    mfrr: 0,
    formulaStr: 'Preço = (OMIE + CS) × (1 + Perdas) + K + TAR + TSE',
    variables: [
      { symbol: 'OMIE', name: 'OMIE Médio do Período', unit: '€/kWh', description: 'Preço médio do mercado OMIE para o período de faturação' },
      { symbol: 'CS', name: 'Custos de Sistema', value: 0.009, unit: '€/kWh', description: 'Gestão, desvios e custos de sistema' },
      { symbol: 'Perdas', name: 'Perdas da Rede', unit: '%', description: 'Médias dos coeficientes publicados pela ERSE' },
      { symbol: 'K', name: 'Margem Comercial Ibelectra', value: 0.0055, unit: '€/kWh', description: 'Componente comercial Ibelectra Amigo' },
      { symbol: 'TAR', name: 'Tarifa de Acesso às Redes', unit: '€/kWh', description: 'Regulada pela ERSE — varia por período horário' },
      { symbol: 'TSE', name: 'Tarifa Social de Electricidade', value: TSE, unit: '€/kWh', description: 'Financiamento da tarifa social' },
    ],
  },
  {
    id: 'ibelectra-familia',
    name: 'Ibelectra Solução Família',
    company: 'Ibelectra',
    type: 'media',
    url: 'https://www.ibelectra.pt',
    adequacyFactor: 1.0,
    innerCosts: 0.009,
    margin: 0.0035,
    tse: TSE,
    go: 0,
    mfrr: 0,
    formulaStr: 'Preço = (OMIE + CS) × (1 + Perdas) + K + TAR + TSE',
    variables: [
      { symbol: 'OMIE', name: 'OMIE Médio do Período', unit: '€/kWh', description: 'Preço médio do mercado OMIE para o período de faturação' },
      { symbol: 'CS', name: 'Custos de Sistema', value: 0.009, unit: '€/kWh', description: 'Gestão, desvios e custos de sistema' },
      { symbol: 'Perdas', name: 'Perdas da Rede', unit: '%', description: 'Médias dos coeficientes publicados pela ERSE' },
      { symbol: 'K', name: 'Margem Comercial Ibelectra', value: 0.0035, unit: '€/kWh', description: 'Componente comercial Ibelectra Família' },
      { symbol: 'TAR', name: 'Tarifa de Acesso às Redes', unit: '€/kWh', description: 'Regulada pela ERSE — varia por período horário' },
      { symbol: 'TSE', name: 'Tarifa Social de Electricidade', value: TSE, unit: '€/kWh', description: 'Financiamento da tarifa social' },
    ],
  },
  {
    id: 'luzigas',
    name: 'LUZiGÁS Super Lig Index',
    company: 'LUZiGÁS',
    type: 'media',
    url: 'https://www.luzigas.pt',
    adequacyFactor: 1.0,
    innerCosts: 0.005 + CGS,  // K + CGS
    margin: 0,
    tse: 0,
    go: 0,
    mfrr: 0,
    formulaStr: 'PE = (OMIE + K + CGS) × (1 + Perdas)',
    variables: [
      { symbol: 'OMIE', name: 'Preço OMIE Portugal', unit: '€/kWh', description: 'Custo da energia horária no Mercado Diário OMIE' },
      { symbol: 'K', name: 'Margem Fixa LUZiGÁS', value: 0.005, unit: '€/kWh', description: 'Componente comercial LUZiGÁS' },
      { symbol: 'CGS', name: 'Custos do Gestor do Sistema', value: CGS, unit: '€/kWh', description: 'Valor médio ERC do mês atual' },
      { symbol: 'Perdas', name: 'Perdas da Rede', unit: '%', description: 'Médias dos coeficientes publicados pela ERSE' },
    ],
  },
  {
    id: 'luzboa-spotdef',
    name: 'Luzboa BTN SPOTDEF',
    company: 'Luzboa',
    type: 'media',
    url: 'https://www.luzboa.pt/tarifas/domestico/1',
    adequacyFactor: 1.02,  // FA aplicado a (OMIE + CGS)
    innerCosts: CGS,
    margin: 0.005,
    tse: 0,
    go: 0,
    mfrr: 0,
    formulaStr: 'P = (OMIE + CGS) × (1 + Perdas) × FA + K',
    variables: [
      { symbol: 'OMIE', name: 'OMIE Médio Mensal', unit: '€/kWh', description: 'Preço horário médio mensal no período faturado' },
      { symbol: 'CGS', name: 'Custos de Operação e Gestão', value: CGS, unit: '€/kWh', description: 'Valor médio ERC do mês atual' },
      { symbol: 'Perdas', name: 'Perdas da Rede', unit: '%', description: 'Perdas fixadas pela ERSE' },
      { symbol: 'FA', name: 'Fator de Adequação', value: 1.02, unit: 'adimensional', description: 'Fator de adequação Luzboa' },
      { symbol: 'K', name: 'Gastos Operacionais Luzboa', value: 0.005, unit: '€/kWh', description: 'Margem comercial Luzboa' },
    ],
  },
  {
    id: 'custom',
    name: 'Personalizado',
    company: '',
    type: 'quarto-horario',
    url: '',
    adequacyFactor: 1.0,
    innerCosts: 0,
    margin: 0.005,
    tse: 0,
    go: 0,
    mfrr: 0,
    formulaStr: 'Preço = OMIE × F_adeq × (1 + Perdas) + Margem + TAR',
    variables: [
      { symbol: 'OMIE', name: 'Preço OMIE Portugal', unit: '€/kWh', description: 'Preço de mercado grossista' },
      { symbol: 'F_adeq', name: 'Fator de Adequação', unit: 'adimensional', description: 'Multiplicador sobre OMIE (1.0 se não aplicável)' },
      { symbol: 'Perdas', name: 'Perdas da Rede', unit: '%', description: 'Coeficiente de perdas da rede' },
      { symbol: 'Margem', name: 'Margem Comercial', unit: '€/kWh', description: 'Componente fixa do teu contrato' },
      { symbol: 'TAR', name: 'Tarifa de Acesso às Redes', unit: '€/kWh', description: 'Regulada pela ERSE — varia por período horário' },
    ],
  },
]

export function getOperatorById(id: string): OperatorPreset | undefined {
  return OPERATORS.find(o => o.id === id)
}

export function getOperatorByName(name: string): OperatorPreset | undefined {
  return OPERATORS.find(o => o.name === name)
}
