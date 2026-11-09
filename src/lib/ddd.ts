// Mapeamento Completo de DDDs do Brasil (Estado, Cidade/Região Principal e Região Geográfica)
export const BRAZIL_DDD_MAP: Record<string, { state: string; name: string; region: string }> = {
  "11": { state: "SP", name: "São Paulo / Região Metropolitana", region: "Sudeste" },
  "12": { state: "SP", name: "São José dos Campos / Vale do Paraíba", region: "Sudeste" },
  "13": { state: "SP", name: "Santos / Baixada Santista", region: "Sudeste" },
  "14": { state: "SP", name: "Bauru / Marília / Jaú", region: "Sudeste" },
  "15": { state: "SP", name: "Sorocaba / Itapetininga", region: "Sudeste" },
  "16": { state: "SP", name: "Ribeirão Preto / Franca / São Carlos", region: "Sudeste" },
  "17": { state: "SP", name: "São José do Rio Preto / Barretos", region: "Sudeste" },
  "18": { state: "SP", name: "Presidente Prudente / Araçatuba", region: "Sudeste" },
  "19": { state: "SP", name: "Campinas / Piracicaba / Americana", region: "Sudeste" },
  "21": { state: "RJ", name: "Rio de Janeiro / Região Metropolitana", region: "Sudeste" },
  "22": { state: "RJ", name: "Campos dos Goytacazes / Região dos Lagos", region: "Sudeste" },
  "24": { state: "RJ", name: "Petrópolis / Volta Redonda / Angra dos Reis", region: "Sudeste" },
  "27": { state: "ES", name: "Vitória / Região Metropolitana", region: "Sudeste" },
  "28": { state: "ES", name: "Cachoeiro de Itapemirim / Sul do ES", region: "Sudeste" },
  "31": { state: "MG", name: "Belo Horizonte / Região Metropolitana", region: "Sudeste" },
  "32": { state: "MG", name: "Juiz de Fora / Barbacena", region: "Sudeste" },
  "33": { state: "MG", name: "Governador Valadares / Teófilo Otoni", region: "Sudeste" },
  "34": { state: "MG", name: "Uberlândia / Uberaba / Triângulo Mineiro", region: "Sudeste" },
  "35": { state: "MG", name: "Poços de Caldas / Pouso Alegre / Sul de MG", region: "Sudeste" },
  "37": { state: "MG", name: "Divinópolis / Itaúna / Centro-Oeste de MG", region: "Sudeste" },
  "38": { state: "MG", name: "Montes Claros / Norte de MG", region: "Sudeste" },
  "41": { state: "PR", name: "Curitiba / Região Metropolitana", region: "Sul" },
  "42": { state: "PR", name: "Ponta Grossa / Guarapuava", region: "Sul" },
  "43": { state: "PR", name: "Londrina / Apucarana", region: "Sul" },
  "44": { state: "PR", name: "Maringá / Campo Mourão", region: "Sul" },
  "45": { state: "PR", name: "Foz do Iguaçu / Cascavel", region: "Sul" },
  "46": { state: "PR", name: "Francisco Beltrão / Pato Branco", region: "Sul" },
  "47": { state: "SC", name: "Joinville / Blumenau / Balneário Camboriú", region: "Sul" },
  "48": { state: "SC", name: "Florianópolis / Criciúma", region: "Sul" },
  "49": { state: "SC", name: "Chapecó / Lages / Oeste de SC", region: "Sul" },
  "51": { state: "RS", name: "Porto Alegre / Região Metropolitana", region: "Sul" },
  "53": { state: "RS", name: "Pelotas / Rio Grande", region: "Sul" },
  "54": { state: "RS", name: "Caxias do Sul / Passo Fundo / Serra Gaúcha", region: "Sul" },
  "55": { state: "RS", name: "Santa Maria / Uruguaiana", region: "Sul" },
  "61": { state: "DF", name: "Brasília / Distrito Federal", region: "Centro-Oeste" },
  "62": { state: "GO", name: "Goiânia / Região Metropolitana", region: "Centro-Oeste" },
  "63": { state: "TO", name: "Palmas / Tocantins", region: "Norte" },
  "64": { state: "GO", name: "Rio Verde / Caldas Novas / Sul de GO", region: "Centro-Oeste" },
  "65": { state: "MT", name: "Cuiabá / Região Metropolitana", region: "Centro-Oeste" },
  "66": { state: "MT", name: "Rondonópolis / Sinop", region: "Centro-Oeste" },
  "67": { state: "MS", name: "Campo Grande / Dourados", region: "Centro-Oeste" },
  "68": { state: "AC", name: "Rio Branco / Acre", region: "Norte" },
  "69": { state: "RO", name: "Porto Velho / Rondônia", region: "Norte" },
  "71": { state: "BA", name: "Salvador / Região Metropolitana", region: "Nordeste" },
  "73": { state: "BA", name: "Ilhéus / Itabuna / Porto Seguro", region: "Nordeste" },
  "74": { state: "BA", name: "Juazeiro / Irecê", region: "Nordeste" },
  "75": { state: "BA", name: "Feira de Santana", region: "Nordeste" },
  "77": { state: "BA", name: "Vitória da Conquista / Barreiras", region: "Nordeste" },
  "79": { state: "SE", name: "Aracaju / Sergipe", region: "Nordeste" },
  "81": { state: "PE", name: "Recife / Região Metropolitana", region: "Nordeste" },
  "82": { state: "AL", name: "Maceió / Alagoas", region: "Nordeste" },
  "83": { state: "PB", name: "João Pessoa / Paraíba", region: "Nordeste" },
  "84": { state: "RN", name: "Natal / Rio Grande do Norte", region: "Nordeste" },
  "85": { state: "CE", name: "Fortaleza / Região Metropolitana", region: "Nordeste" },
  "86": { state: "PI", name: "Teresina / Piauí", region: "Nordeste" },
  "87": { state: "PE", name: "Petrolina / Sertão de Pernambuco", region: "Nordeste" },
  "88": { state: "CE", name: "Juazeiro do Norte / Sobral / Interior CE", region: "Nordeste" },
  "89": { state: "PI", name: "Picos / Floriano / Sul do PI", region: "Nordeste" },
  "91": { state: "PA", name: "Belém / Região Metropolitana", region: "Norte" },
  "92": { state: "AM", name: "Manaus / Região Metropolitana", region: "Norte" },
  "93": { state: "PA", name: "Santarém / Oeste do Pará", region: "Norte" },
  "94": { state: "PA", name: "Marabá / Carajás / Sul do Pará", region: "Norte" },
  "95": { state: "RR", name: "Boa Vista / Roraima", region: "Norte" },
  "96": { state: "AP", name: "Macapá / Amapá", region: "Norte" },
  "97": { state: "AM", name: "Interior do Amazonas", region: "Norte" },
  "98": { state: "MA", name: "São Luís / Região Metropolitana", region: "Nordeste" },
  "99": { state: "MA", name: "Imperatriz / Sul do Maranhão", region: "Nordeste" },
};

// Dicionário de DDI Internacionais
export const COUNTRY_CODES: Record<string, string> = {
  "55": "Brasil",
  "1": "Estados Unidos / Canadá",
  "351": "Portugal",
  "34": "Espanha",
  "44": "Reino Unido",
  "33": "França",
  "49": "Alemanha",
  "39": "Itália",
  "54": "Argentina",
  "595": "Paraguai",
  "598": "Uruguai",
  "56": "Chile",
  "57": "Colômbia",
  "51": "Peru",
  "52": "México",
  "81": "Japão",
  "86": "China",
  "91": "Índia",
  "61": "Austrália",
  "244": "Angola",
  "258": "Moçambique",
};

export interface NormalizedPhoneResult {
  phone: string;
  formatted_phone: string;
  is_national: boolean;
  country_code: string;
  country_name: string;
  ddd?: string;
  state_uf?: string;
  city?: string;
  is_mobile?: boolean;
}

/**
 * Normaliza número de telefone com suporte completo às regras da Anatel:
 * - Telefones móveis (celulares) do Brasil recebem o 9º dígito obrigatório (ex: 553184829432 -> 5531984829432).
 * - Telefones fixos (iniciados em 2, 3, 4, 5) permanecem com 8 dígitos (ex: 553133334444).
 * - Formatação humana padronizada: +55 (DD) 9XXXX-XXXX para celulares e +55 (DD) XXXX-XXXX para fixos.
 * - Números internacionais identificados por DDI e formatados em E.164.
 */
export function normalizePhoneNumber(rawJidOrNumber: string): NormalizedPhoneResult {
  if (!rawJidOrNumber) {
    return {
      phone: "",
      formatted_phone: "",
      is_national: false,
      country_code: "",
      country_name: "",
    };
  }

  // Remove domínio JID (ex: @s.whatsapp.net, @lid, @c.us), prefixos de dispositivo (:0, :1) e caracteres não-dígitos
  const clean = rawJidOrNumber.replace(/@.*$/, "").replace(/:.*$/, "").replace(/\D/g, "");

  // Caso 1: Começa com 55 (Brasil)
  if (clean.startsWith("55")) {
    const afterDdi = clean.slice(2);
    const ddd = afterDdi.slice(0, 2);
    const subscriber = afterDdi.slice(2);
    const dddInfo = BRAZIL_DDD_MAP[ddd];

    if (dddInfo) {
      // 1A: 12 dígitos total (55 + DDD + 8 dígitos)
      if (subscriber.length === 8) {
        const firstDigit = subscriber[0];
        // Celulares no Brasil iniciam com 6, 7, 8 ou 9 -> Adiciona o 9º dígito obrigatório
        if (["6", "7", "8", "9"].includes(firstDigit)) {
          const canonicalPhone = `55${ddd}9${subscriber}`;
          const formatted = `+55 (${ddd}) 9${subscriber.slice(0, 4)}-${subscriber.slice(4)}`;
          return {
            phone: canonicalPhone,
            formatted_phone: formatted,
            is_national: true,
            country_code: "55",
            country_name: "Brasil",
            ddd,
            state_uf: dddInfo.state,
            city: dddInfo.name,
            is_mobile: true,
          };
        } else {
          // Telefonia fixa (iniciados em 2, 3, 4, 5)
          const formatted = `+55 (${ddd}) ${subscriber.slice(0, 4)}-${subscriber.slice(4)}`;
          return {
            phone: clean,
            formatted_phone: formatted,
            is_national: true,
            country_code: "55",
            country_name: "Brasil",
            ddd,
            state_uf: dddInfo.state,
            city: dddInfo.name,
            is_mobile: false,
          };
        }
      }

      // 1B: 13 dígitos total (55 + DDD + 9 dígitos)
      if (subscriber.length === 9) {
        const formatted = `+55 (${ddd}) ${subscriber.slice(0, 5)}-${subscriber.slice(5)}`;
        return {
          phone: clean,
          formatted_phone: formatted,
          is_national: true,
          country_code: "55",
          country_name: "Brasil",
          ddd,
          state_uf: dddInfo.state,
          city: dddInfo.name,
          is_mobile: subscriber.startsWith("9"),
        };
      }
    }
  }

  // Caso 2: Número brasileiro enviado sem DDI 55
  // 2A: 10 dígitos (DDD + 8 dígitos)
  if (clean.length === 10) {
    const ddd = clean.slice(0, 2);
    const subscriber = clean.slice(2);
    const dddInfo = BRAZIL_DDD_MAP[ddd];

    if (dddInfo) {
      if (["6", "7", "8", "9"].includes(subscriber[0])) {
        // Celular sem 9 e sem 55
        const canonicalPhone = `55${ddd}9${subscriber}`;
        const formatted = `+55 (${ddd}) 9${subscriber.slice(0, 4)}-${subscriber.slice(4)}`;
        return {
          phone: canonicalPhone,
          formatted_phone: formatted,
          is_national: true,
          country_code: "55",
          country_name: "Brasil",
          ddd,
          state_uf: dddInfo.state,
          city: dddInfo.name,
          is_mobile: true,
        };
      } else {
        // Fixo sem 55
        const canonicalPhone = `55${clean}`;
        const formatted = `+55 (${ddd}) ${subscriber.slice(0, 4)}-${subscriber.slice(4)}`;
        return {
          phone: canonicalPhone,
          formatted_phone: formatted,
          is_national: true,
          country_code: "55",
          country_name: "Brasil",
          ddd,
          state_uf: dddInfo.state,
          city: dddInfo.name,
          is_mobile: false,
        };
      }
    }
  }

  // 2B: 11 dígitos (DDD + 9 dígitos)
  if (clean.length === 11) {
    const ddd = clean.slice(0, 2);
    const subscriber = clean.slice(2);
    const dddInfo = BRAZIL_DDD_MAP[ddd];

    if (dddInfo && subscriber.startsWith("9")) {
      const canonicalPhone = `55${clean}`;
      const formatted = `+55 (${ddd}) ${subscriber.slice(0, 5)}-${subscriber.slice(5)}`;
      return {
        phone: canonicalPhone,
        formatted_phone: formatted,
        is_national: true,
        country_code: "55",
        country_name: "Brasil",
        ddd,
        state_uf: dddInfo.state,
        city: dddInfo.name,
        is_mobile: true,
      };
    }
  }

  // Caso 3: Internacional ou outros formatos
  let countryCode = "0";
  let countryName = "Internacional";

  for (let len = 3; len >= 1; len--) {
    const prefix = clean.slice(0, len);
    if (COUNTRY_CODES[prefix]) {
      countryCode = prefix;
      countryName = COUNTRY_CODES[prefix];
      break;
    }
  }

  return {
    phone: clean,
    formatted_phone: clean.length > 0 ? `+${clean}` : "",
    is_national: clean.startsWith("55"),
    country_code: countryCode !== "0" ? countryCode : clean.slice(0, 2),
    country_name: countryName,
    is_mobile: false,
  };
}

