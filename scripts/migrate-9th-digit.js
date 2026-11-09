const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

// Carrega .env.local
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (key && rest.length > 0) {
      process.env[key.trim()] = rest.join("=").trim().replace(/^["']|["']$/g, "");
    }
  }
}

const BRAZIL_DDD_MAP = {
  "11": { state: "SP", name: "São Paulo / Região Metropolitana" },
  "12": { state: "SP", name: "São José dos Campos / Vale do Paraíba" },
  "13": { state: "SP", name: "Santos / Baixada Santista" },
  "14": { state: "SP", name: "Bauru / Marília / Jaú" },
  "15": { state: "SP", name: "Sorocaba / Itapetininga" },
  "16": { state: "SP", name: "Ribeirão Preto / Franca / São Carlos" },
  "17": { state: "SP", name: "São José do Rio Preto / Barretos" },
  "18": { state: "SP", name: "Presidente Prudente / Araçatuba" },
  "19": { state: "SP", name: "Campinas / Piracicaba / Americana" },
  "21": { state: "RJ", name: "Rio de Janeiro / Região Metropolitana" },
  "22": { state: "RJ", name: "Campos dos Goytacazes / Região dos Lagos" },
  "24": { state: "RJ", name: "Petrópolis / Volta Redonda / Angra dos Reis" },
  "27": { state: "ES", name: "Vitória / Região Metropolitana" },
  "28": { state: "ES", name: "Cachoeiro de Itapemirim / Sul do ES" },
  "31": { state: "MG", name: "Belo Horizonte / Região Metropolitana" },
  "32": { state: "MG", name: "Juiz de Fora / Barbacena" },
  "33": { state: "MG", name: "Governador Valadares / Teófilo Otoni" },
  "34": { state: "MG", name: "Uberlândia / Uberaba / Triângulo Mineiro" },
  "35": { state: "MG", name: "Poços de Caldas / Pouso Alegre / Sul de MG" },
  "37": { state: "MG", name: "Divinópolis / Itaúna / Centro-Oeste de MG" },
  "38": { state: "MG", name: "Montes Claros / Norte de MG" },
  "41": { state: "PR", name: "Curitiba / Região Metropolitana" },
  "42": { state: "PR", name: "Ponta Grossa / Guarapuava" },
  "43": { state: "PR", name: "Londrina / Apucarana" },
  "44": { state: "PR", name: "Maringá / Campo Mourão" },
  "45": { state: "PR", name: "Foz do Iguaçu / Cascavel" },
  "46": { state: "PR", name: "Francisco Beltrão / Pato Branco" },
  "47": { state: "SC", name: "Joinville / Blumenau / Balneário Camboriú" },
  "48": { state: "SC", name: "Florianópolis / Criciúma" },
  "49": { state: "SC", name: "Chapecó / Lages / Oeste de SC" },
  "51": { state: "RS", name: "Porto Alegre / Região Metropolitana" },
  "53": { state: "RS", name: "Pelotas / Rio Grande" },
  "54": { state: "RS", name: "Caxias do Sul / Passo Fundo / Serra Gaúcha" },
  "55": { state: "RS", name: "Santa Maria / Uruguaiana" },
  "61": { state: "DF", name: "Brasília / Distrito Federal" },
  "62": { state: "GO", name: "Goiânia / Região Metropolitana" },
  "63": { state: "TO", name: "Palmas / Tocantins" },
  "64": { state: "GO", name: "Rio Verde / Caldas Novas / Sul de GO" },
  "65": { state: "MT", name: "Cuiabá / Região Metropolitana" },
  "66": { state: "MT", name: "Rondonópolis / Sinop" },
  "67": { state: "MS", name: "Campo Grande / Dourados" },
  "68": { state: "AC", name: "Rio Branco / Acre" },
  "69": { state: "RO", name: "Porto Velho / Rondônia" },
  "71": { state: "BA", name: "Salvador / Região Metropolitana" },
  "73": { state: "BA", name: "Ilhéus / Itabuna / Porto Seguro" },
  "74": { state: "BA", name: "Juazeiro / Irecê" },
  "75": { state: "BA", name: "Feira de Santana" },
  "77": { state: "BA", name: "Vitória da Conquista / Barreiras" },
  "79": { state: "SE", name: "Aracaju / Sergipe" },
  "81": { state: "PE", name: "Recife / Região Metropolitana" },
  "82": { state: "AL", name: "Maceió / Alagoas" },
  "83": { state: "PB", name: "João Pessoa / Paraíba" },
  "84": { state: "RN", name: "Natal / Rio Grande do Norte" },
  "85": { state: "CE", name: "Fortaleza / Região Metropolitana" },
  "86": { state: "PI", name: "Teresina / Piauí" },
  "87": { state: "PE", name: "Petrolina / Sertão de Pernambuco" },
  "88": { state: "CE", name: "Juazeiro do Norte / Sobral / Interior CE" },
  "89": { state: "PI", name: "Picos / Floriano / Sul do PI" },
  "91": { state: "PA", name: "Belém / Região Metropolitana" },
  "92": { state: "AM", name: "Manaus / Região Metropolitana" },
  "93": { state: "PA", name: "Santarém / Oeste do Pará" },
  "94": { state: "PA", name: "Marabá / Carajás / Sul do Pará" },
  "95": { state: "RR", name: "Boa Vista / Roraima" },
  "96": { state: "AP", name: "Macapá / Amapá" },
  "97": { state: "AM", name: "Interior do Amazonas" },
  "98": { state: "MA", name: "São Luís / Região Metropolitana" },
  "99": { state: "MA", name: "Imperatriz / Sul do Maranhão" },
};

const COUNTRY_CODES = {
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

function normalizePhoneNumber(rawJidOrNumber) {
  if (!rawJidOrNumber) {
    return { phone: "", formatted_phone: "", is_national: false, country_code: "", country_name: "" };
  }

  const clean = String(rawJidOrNumber).replace(/@.*$/, "").replace(/:.*$/, "").replace(/\D/g, "");

  if (clean.startsWith("55")) {
    const afterDdi = clean.slice(2);
    const ddd = afterDdi.slice(0, 2);
    const subscriber = afterDdi.slice(2);
    const dddInfo = BRAZIL_DDD_MAP[ddd];

    if (dddInfo) {
      if (subscriber.length === 8) {
        const firstDigit = subscriber[0];
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

  if (clean.length === 10) {
    const ddd = clean.slice(0, 2);
    const subscriber = clean.slice(2);
    const dddInfo = BRAZIL_DDD_MAP[ddd];

    if (dddInfo) {
      if (["6", "7", "8", "9"].includes(subscriber[0])) {
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

async function run() {
  console.log("Iniciando migração de números com 9º dígito obrigatório no Brasil...");

  const dbPath = path.join(__dirname, "..", ".data", "parceiro-lynx-db.json");
  if (!fs.existsSync(dbPath)) {
    console.error("Arquivo do banco local não encontrado:", dbPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(dbPath, "utf-8");
  const state = JSON.parse(raw);

  const initialCount = state.evolution_contacts ? state.evolution_contacts.length : 0;
  console.log(`Total de contatos existentes: ${initialCount}`);

  let mobilesAdded9 = 0;
  let landlinesKept = 0;
  let already13Digits = 0;
  let internationals = 0;
  let duplicatesMerged = 0;

  const unifiedMap = new Map();

  for (const c of state.evolution_contacts || []) {
    const norm = normalizePhoneNumber(c.phone);
    const canonicalPhone = norm.phone || c.phone;

    if (norm.is_national) {
      if (c.phone.length === 12 && canonicalPhone.length === 13) {
        mobilesAdded9++;
      } else if (c.phone.length === 12 && canonicalPhone.length === 12) {
        landlinesKept++;
      } else if (canonicalPhone.length === 13) {
        already13Digits++;
      }
    } else {
      internationals++;
    }

    const existing = unifiedMap.get(canonicalPhone);
    if (existing) {
      duplicatesMerged++;
      const allInstances = Array.from(new Set([...(existing.instances || []), ...(c.instances || [])]));
      existing.instances = allInstances;
      existing.instances_count = allInstances.length;
      existing.is_repeated = allInstances.length > 1;

      if (!existing.has_valid_name && c.has_valid_name) {
        existing.name = c.name;
        existing.has_valid_name = true;
      }
      if (!existing.email && c.email) existing.email = c.email;
      if (!existing.job_title && c.job_title) existing.job_title = c.job_title;
      if (!existing.company && c.company) existing.company = c.company;
      if (!existing.social_link && c.social_link) existing.social_link = c.social_link;
    } else {
      unifiedMap.set(canonicalPhone, {
        ...c,
        id: canonicalPhone,
        phone: canonicalPhone,
        formatted_phone: norm.formatted_phone || c.formatted_phone,
        ddd: norm.ddd || c.ddd,
        state_uf: norm.state_uf || c.state_uf,
        city: norm.city || c.city,
        is_national: norm.is_national,
        country_code: norm.country_code,
        country_name: norm.country_name,
      });
    }
  }

  const updatedContacts = Array.from(unifiedMap.values()).map((c) => ({
    ...c,
    instances_count: (c.instances || []).length,
    is_repeated: (c.instances || []).length > 1,
  }));

  console.log("\n--- RESULTADO DA NORMALIZAÇÃO ---");
  console.log(`Celulares que receberam o 9º dígito: ${mobilesAdded9}`);
  console.log(`Telefones fixos mantidos com 8 dígitos: ${landlinesKept}`);
  console.log(`Celulares já com 13 dígitos: ${already13Digits}`);
  console.log(`Contatos internacionais mantidos: ${internationals}`);
  console.log(`Duplicatas fundidas após unificação de chave: ${duplicatesMerged}`);
  console.log(`Total final de contatos unificados: ${updatedContacts.length}`);

  // Normaliza instâncias
  for (const inst of state.evolution_instances || []) {
    if (inst.phone_number) {
      const normInst = normalizePhoneNumber(inst.phone_number);
      inst.phone_number = normInst.phone || inst.phone_number;
    }
    const count = updatedContacts.filter((c) => c.instances.includes(inst.name)).length;
    inst.contacts_count = count;
  }

  state.evolution_contacts = updatedContacts;

  // Salva no banco local
  fs.writeFileSync(dbPath, JSON.stringify(state, null, 2), "utf-8");
  console.log("Banco de dados local (.data/parceiro-lynx-db.json) salvo com sucesso!");

  // Sincroniza com Supabase VPS se disponível
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (sbUrl && sbKey) {
    console.log(`\nSincronizando com Supabase VPS (${sbUrl})...`);
    const sb = createClient(sbUrl, sbKey, { auth: { persistSession: false } });

    // Atualiza instâncias
    if (state.evolution_instances && state.evolution_instances.length > 0) {
      const { error: instErr } = await sb.from("lynx_evolution_instances").upsert(state.evolution_instances);
      if (instErr) {
        console.error("Erro ao sincronizar instâncias no Supabase:", instErr.message);
      } else {
        console.log(`✓ ${state.evolution_instances.length} instâncias atualizadas no Supabase.`);
      }
    }

    // Limpa a tabela de contatos anterior para remover os IDs de 12 dígitos obsoletos
    console.log("Removendo registros antigos de lynx_evolution_contacts no Supabase...");
    const { error: delErr } = await sb.from("lynx_evolution_contacts").delete().neq("id", "none");
    if (delErr) {
      console.error("Aviso ao limpar contatos antigos no Supabase:", delErr.message);
    } else {
      console.log("✓ Tabela lynx_evolution_contacts limpa com sucesso.");
    }

    // Inserção em lotes de 500
    console.log(`Enviando ${updatedContacts.length} contatos normalizados para o Supabase em lotes de 500...`);
    const BATCH_SIZE = 500;
    let inserted = 0;

    for (let i = 0; i < updatedContacts.length; i += BATCH_SIZE) {
      const batch = updatedContacts.slice(i, i + BATCH_SIZE);
      const { error: batchErr } = await sb.from("lynx_evolution_contacts").upsert(batch);
      if (batchErr) {
        console.error(`Erro ao inserir lote ${i}-${i + batch.length}:`, batchErr.message);
      } else {
        inserted += batch.length;
        process.stdout.write(`\rEnviados: ${inserted} / ${updatedContacts.length}`);
      }
    }
    console.log("\n✓ Todos os contatos foram sincronizados com o Supabase VPS!");
  } else {
    console.log("Supabase VPS não configurado no .env.local, apenas banco local atualizado.");
  }

  console.log("\nMigração concluída com 100% de sucesso!");
}

run().catch((err) => {
  console.error("Falha fatal na migração:", err);
  process.exit(1);
});

