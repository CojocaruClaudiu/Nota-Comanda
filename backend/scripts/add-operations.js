// Script to add operations to categories
// Use 127.0.0.1 explicitly to avoid potential IPv6/localhost resolution issues on Windows
const API_URL = 'http://127.0.0.1:4000';

// Define the operations organized by categories (improved structure)
const operationsByCategory = {
  "Demolări & Pregătiri": [
    "DECOPERTARI",
    "DEMONTARI ELECTRICE",
    "RECTIFICARI PARDOSELI DIN GRESIE"
  ],
  "Structuri din beton": [
    "TURNAT FUNDATII DIN BETON",
    "COFRAJE DIN BETON",
    "TURNAT TREPTE",
    "PARAPETI DIN BETON",
    "FATADE DIN BETON"
  ],
  "Zidărie & Pereți": [
    "ZIDARIE DIN CARAMIDA",
    "PERETI DIN BCA",
    "PERETI DIN LEMN SI OSB",
    "PERETI CU TENCUIELI USCATE",
  "PLACARI DIN AQAPANEL",
  "MONTAT PIATRA",
  // Added from items list
  "PLACARI DIN TEGO/PAL/OSB",
  "LAMBRIU"
  ],
  "Tavane & Compartimentări ușoare": [
    "TAVANE DIN TENCUIALA USCATA DIN GIPS CARTON",
    "TAVANE DIN LEMN"
  ],
  "Anvelopă & Izolații": [
    "TERMOSISTEM",
    "IZOLATII TERMICE",
    "IZOLATII TERMICE (MEMBRANA/VATA BAZALTICA)",
    "HIDROIZOLATIE",
    "PANOU SANDWICH"
  ],
  "Finisaje pereți": [
    "TENCUIELI DIN MORTAR",
    "GLET",
    "LAVABIL",
    "VOPSIT PERETI CU VOPSEA/EPOXY",
  // Added from items list
  "VOPSEA DECORTIVA",
    "MONTAT FAIANTA SAU GRESIE",
    "MONTAT MARMURA SAU GRANIT",
    "MONTAT PLACARI DIN HPL",
    "MONTAT ACCESORII"
  ],
  "Pardoseli": [
    "TURNAT SAPE DE NIVEL",
    "MONTAT PARCHET",
    "PARDOSELI EPOXY",
    "REFACERE PARDOSELI EPOXY",
    "MONTAT PAVELE SAU PIATRA CUBICA"
  ],
  "Tâmplărie & Mobilier": [
    "TAMPLARIE PVC",
    "CONFECTIONAT MOBILA",
    "MONTAT/DEMONTAT RAFT"
  ],
  "Metale & Confecții": [
    "CONFECTIE METALICA",
    "ASAMBLARI STRUCTURI METALICE",
    "SUDURA"
  ],
  "Instalații (MEP)": [
    "MANOPERE ELECTRICE",
    "LUCRARI SANITARE",
    "CAMINE IRIGATIE"
  ],
  "Exterior & Amenajări": [
    "VOPSIT GARD",
    "MONTAT BANNER",
    "TEREN ANTRENAMENT",
    "BOXE",
    "RECONDITIONARE LEMN"
  ],
  "Mentenanță & Lucrări speciale": [
    "MENTENANTA",
    "LUCRARI SPECIALE",
    "ACOPERIS DIN LEMN"
  ]
};

async function makeRequest(path, options = {}) {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }

    if (response.status === 204) {
      return null;
    }

    return await response.json();
  } catch (err) {
    const e = err || {};
    const details = {
      name: e.name,
      message: e.message,
      code: e.code,
      cause: e.cause,
    };
  console.error(`Request to ${API_URL}${path} failed:`, details);
    throw err;
  }
}

async function createCategory(name) {
  try {
    return await makeRequest('/operation-categories', {
      method: 'POST',
      body: JSON.stringify({ name })
    });
  } catch (error) {
    // If already exists, try to fetch it and proceed
    const msg = (error && error.message) || '';
    if (msg.includes('HTTP 409')) {
      try {
        const list = await makeRequest('/operation-categories', { method: 'GET' });
        const found = Array.isArray(list) ? list.find(c => c.name === name) : null;
        if (found) {
          console.log(`Category already exists: ${name} (ID: ${found.id})`);
          return found;
        }
      } catch (_) {
        // ignore and rethrow original error
      }
    }
    console.error(`Failed to create category "${name}":`, error.message);
    throw error;
  }
}

async function createOperation(categoryId, name) {
  try {
    return await makeRequest(`/operation-categories/${categoryId}/operations`, {
      method: 'POST',
      body: JSON.stringify({ name })
    });
  } catch (error) {
    // If already exists, skip gracefully
    const msg = (error && error.message) || '';
    if (msg.includes('HTTP 409')) {
  console.log(`   Operation already exists, skipping: ${name}`);
      return null;
    }
    console.error(`Failed to create operation "${name}":`, error.message);
    throw error;
  }
}

async function addOperations() {
  console.log('Starting to add operation categories and operations...');
  // Quick connectivity check
  try {
    const ping = await makeRequest('/operation-categories', { method: 'GET' });
  console.log(`API reachable at ${API_URL}. Categories currently: ${Array.isArray(ping) ? ping.length : 'unknown'}`);
  } catch (error) {
  console.error('API connectivity check failed. Aborting.');
    throw error;
  }
  
  let totalCategories = 0;
  let totalOperations = 0;

  for (const [categoryName, operations] of Object.entries(operationsByCategory)) {
    try {
      console.log(`\n📂 Creating category: ${categoryName}`);
      const category = await createCategory(categoryName);
      if (!category) {
  console.error(`Could not get or create category: ${categoryName}`);
        continue;
      }
      if (category.createdAt) {
        totalCategories++;
  console.log(`Category created with ID: ${category.id}`);
      } else {
  console.log(`Using existing category ID: ${category.id}`);
      }

      let createdForThisCategory = 0;
      for (const operationName of operations) {
        try {
          console.log(`  ➕ Adding operation: ${operationName}`);
          const op = await createOperation(category.id, operationName);
          if (op && op.id) {
            totalOperations++;
            createdForThisCategory++;
            console.log(`  Operation added: ${operationName}`);
          }
        } catch (error) {
          console.error(`  Failed to add operation "${operationName}":`, error.message);
        }
      }

  console.log(`Finished category "${categoryName}" (new ops created: ${createdForThisCategory}/${operations.length})`);
    } catch (error) {
  console.error(`Failed to create or retrieve category "${categoryName}":`, error.message);
    }
  }
  
  console.log(`\nFinished. Created ${totalCategories} categories and ${totalOperations} operations.`);
}

// Run the script
addOperations().catch(console.error);

export { addOperations };
