const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const cors = require('cors');
const OpenAI = require('openai');
const xlsx = require('xlsx');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Servir jsPDF desde node_modules
app.get('/jspdf.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'node_modules/jspdf/dist/jspdf.umd.min.js'));
});

// Configuración de Multer para subir archivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, os.tmpdir());
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    },
    fileFilter: function (req, file, cb) {
        const allowedExtensions = ['.sql', '.json', '.txt', '.dbml', '.prisma', '.graphql', '.csv', '.js', '.ts', '.yaml', '.yml', '.xlsx'];
        const fileExtension = path.extname(file.originalname).toLowerCase();
        
        if (allowedExtensions.includes(fileExtension)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de archivo no permitido. Solo se permiten: .sql, .json, .txt, .dbml, .prisma, .graphql, .csv, .js, .ts, .yaml, .xlsx'));
        }
    }
});

// Parser de archivos SQL mejorado
function parseSQL(content) {
    const tables = [];
    const relations = [];

    // 1. Detectar CREATE TABLE
    const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:`|")?(\w+)(?:`|")?\s*\(([\s\S]*?)\)(?:\s*;|(?=\s*CREATE)|(?=\s*ALTER)|$)/gi;
    let match;

    while ((match = createTableRegex.exec(content)) !== null) {
        const tableName = match[1];
        const tableContent = match[2];

        const columns = [];
        const foreignKeys = [];

        // Dividir el contenido de la tabla por comas, pero ignorando comas dentro de paréntesis (ej: DECIMAL(10,2))
        const parts = [];
        let currentPart = '';
        let parenDepth = 0;

        for (let i = 0; i < tableContent.length; i++) {
            const char = tableContent[i];
            if (char === '(') parenDepth++;
            if (char === ')') parenDepth--;
            if (char === ',' && parenDepth === 0) {
                parts.push(currentPart.trim());
                currentPart = '';
            } else {
                currentPart += char;
            }
        }
        if (currentPart.trim()) parts.push(currentPart.trim());

        for (const line of parts) {
            const upperLine = line.toUpperCase();

            // Ignorar PRIMARY KEY al final de la lista si es redundante
            if (upperLine.startsWith('PRIMARY KEY') && line.includes('(')) continue;
            if (upperLine.startsWith('KEY') || upperLine.startsWith('INDEX') || upperLine.startsWith('UNIQUE')) continue;
            if (upperLine.startsWith('CONSTRAINT')) {
                // Manejar CONSTRAINT ... FOREIGN KEY
                if (upperLine.includes('FOREIGN KEY')) {
                    const fkMatch = line.match(/FOREIGN\s+KEY\s*\((?:`|")?(\w+)(?:`|")?\)\s*REFERENCES\s+(?:`|")?(\w+)(?:`|")?\s*\((?:`|")?(\w+)(?:`|")?\)/i);
                    if (fkMatch) {
                        const fk = { column: fkMatch[1], referencesTable: fkMatch[2], referencesColumn: fkMatch[3] };
                        foreignKeys.push(fk);
                        relations.push({ from: tableName, to: fk.referencesTable, type: 'foreign_key', column: fk.column, referencesColumn: fk.referencesColumn });
                    }
                }
                continue;
            }

            if (upperLine.startsWith('FOREIGN KEY')) {
                const fkMatch = line.match(/FOREIGN\s+KEY\s*\((?:`|")?(\w+)(?:`|")?\)\s*REFERENCES\s+(?:`|")?(\w+)(?:`|")?\s*\((?:`|")?(\w+)(?:`|")?\)/i);
                if (fkMatch) {
                    const fk = { column: fkMatch[1], referencesTable: fkMatch[2], referencesColumn: fkMatch[3] };
                    foreignKeys.push(fk);
                    relations.push({ from: tableName, to: fk.referencesTable, type: 'foreign_key', column: fk.column, referencesColumn: fk.referencesColumn });
                }
                continue;
            }

            // Detectar relación en la misma línea de la columna (inline)
            // Ejemplo: user_id INT REFERENCES users(id)
            const inlineFkMatch = line.match(/^(?:`|")?(\w+)(?:`|")?\s+[\w()]+\s+.*?REFERENCES\s+(?:`|")?(\w+)(?:`|")?\s*\((?:`|")?(\w+)(?:`|")?\)/i);
            if (inlineFkMatch) {
                const fk = { column: inlineFkMatch[1], referencesTable: inlineFkMatch[2], referencesColumn: inlineFkMatch[3] };
                foreignKeys.push(fk);
                relations.push({ from: tableName, to: fk.referencesTable, type: 'foreign_key', column: fk.column, referencesColumn: fk.referencesColumn });
            }

            // Parsear definición de columna
            const columnMatch = line.match(/^(?:`|")?(\w+)(?:`|")?\s+([A-Za-z]+(?:\([\d,]+\))?)(.*)$/);
            if (columnMatch) {
                const columnName = columnMatch[1];
                const columnType = columnMatch[2];
                const constraints = columnMatch[3] || '';

                columns.push({
                    name: columnName,
                    type: columnType,
                    nullable: !constraints.toUpperCase().includes('NOT NULL'),
                    primaryKey: constraints.toUpperCase().includes('PRIMARY KEY'),
                    autoIncrement: constraints.toUpperCase().includes('AUTO_INCREMENT')
                });
            }
        }

        tables.push({
            name: tableName,
            columns: columns,
            foreignKeys: foreignKeys
        });
    }

    // 2. Detectar ALTER TABLE para llaves foráneas
    const alterTableRegex = /ALTER\s+TABLE\s+(?:`|")?(\w+)(?:`|")?\s+ADD\s+(?:CONSTRAINT\s+\w+\s+)?FOREIGN\s+KEY\s*\((?:`|")?(\w+)(?:`|")?\)\s*REFERENCES\s+(?:`|")?(\w+)(?:`|")?\s*\((?:`|")?(\w+)(?:`|")?\)/gi;
    let alterMatch;
    while ((alterMatch = alterTableRegex.exec(content)) !== null) {
        const tableName = alterMatch[1];
        const colName = alterMatch[2];
        const refTable = alterMatch[3];
        const refCol = alterMatch[4];

        relations.push({
            from: tableName,
            to: refTable,
            type: 'foreign_key',
            column: colName,
            referencesColumn: refCol
        });

        // Agregar a la tabla correspondiente si existe
        const table = tables.find(t => t.name === tableName);
        if (table) {
            table.foreignKeys.push({
                column: colName,
                referencesTable: refTable,
                referencesColumn: refCol
            });
        }
    }

    return { tables, relations };
}

// Parser de archivos JSON (esquemas)
function parseJSON(content) {
    try {
        const data = JSON.parse(content);
        const tables = [];
        const relations = [];

        if (Array.isArray(data)) {
            // Si es un array de tablas
            data.forEach((table, index) => {
                const columns = table.columns || table.fields;
                if (typeof table === 'object' && table.name && columns) {
                    tables.push({
                        name: table.name,
                        columns: columns.map(col => ({
                            name: col.name || col.column,
                            type: col.type || 'string',
                            nullable: col.nullable !== false,
                            primaryKey: col.primaryKey || false,
                            autoIncrement: col.autoIncrement || false
                        }))
                    });
                }
            });
        } else if (typeof data === 'object') {
            const tablesArray = data.tables || data.collections;
            if (Array.isArray(tablesArray)) {
                tablesArray.forEach(table => {
                    const columns = table.columns || table.fields;
                    if (table.name && columns) {
                        tables.push({
                            name: table.name,
                            columns: columns.map(col => ({
                                name: col.name || col.column,
                                type: col.type || 'string',
                                nullable: col.nullable !== false,
                                primaryKey: col.primaryKey || false,
                                autoIncrement: col.autoIncrement || false
                            }))
                        });
                    }
                });
            } else {
                // Si es un objeto con tablas
                Object.keys(data).forEach(tableName => {
                    const tableData = data[tableName];
                    const columns = tableData && (tableData.columns || tableData.fields);
                    if (typeof tableData === 'object' && columns) {
                        tables.push({
                            name: tableName,
                            columns: columns.map(col => ({
                                name: col.name || col.column,
                                type: col.type || 'string',
                                nullable: col.nullable !== false,
                                primaryKey: col.primaryKey || false,
                                autoIncrement: col.autoIncrement || false
                            }))
                        });
                    }
                });
            }
            if (Array.isArray(data.relations)) {
                relations.push(...data.relations);
            }
        }

        return { tables, relations };
    } catch (error) {
        throw new Error('JSON inválido o no contiene estructura de base de datos válida');
    }
}

// Parser de archivos XLSX
function parseXLSX(filePath) {
    try {
        const workbook = xlsx.readFile(filePath);
        const tables = [];
        const relations = [];

        workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
            
            if (data.length > 0) {
                const headers = data[0];
                tables.push({
                    name: sheetName,
                    columns: headers.map(header => ({
                        name: header || 'ColumnaSinNombre',
                        type: 'string', // Inferencia simple
                        nullable: true,
                        primaryKey: false,
                        autoIncrement: false
                    })),
                    foreignKeys: []
                });
            }
        });

        return { tables, relations };
    } catch (error) {
        throw new Error('Error al leer el archivo Excel: ' + error.message);
    }
}

// Validar si el contenido es relacionado a bases de datos
function validateDatabaseContent(content, fileExtension) {
    const contentLower = content.toLowerCase();

    if (fileExtension === '.sql') {
        return contentLower.includes('create table') ||
            contentLower.includes('insert into') ||
            contentLower.includes('select') ||
            contentLower.includes('alter table') ||
            contentLower.includes('drop table');
    }

    if (fileExtension === '.json') {
        try {
            const parsed = JSON.parse(content);
            return parsed.hasOwnProperty('tables') ||
                parsed.hasOwnProperty('collections') ||
                Array.isArray(parsed) ||
                (typeof parsed === 'object' && Object.keys(parsed).some(key =>
                    typeof parsed[key] === 'object' && (parsed[key].hasOwnProperty('columns') || parsed[key].hasOwnProperty('fields'))
                ));
        } catch {
            return false;
        }
    }

    if (fileExtension === '.txt') {
        return contentLower.includes('create table') ||
            contentLower.includes('insert into') ||
            contentLower.includes('select');
    }

    if (['.prisma', '.graphql', '.js', '.ts', '.yaml', '.yml', '.csv', '.xlsx'].includes(fileExtension)) {
        // Para estos formatos nuevos, permitimos el paso si tienen algo de contenido
        return true; 
    }
    
    return false;
}

// Generar documentación con OpenAI
async function generateDocumentation(schema, dbType) {
    try {
        // Verificar que la API Key esté configurada
        if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'tu_clave_de_openai_aqui') {
            throw new Error('API Key de OpenAI no configurada correctamente en el archivo .env');
        }

        // Validar que haya estructuras antes de enviar a OpenAI
        if (!schema.tables || schema.tables.length === 0) {
            throw new Error('No se encontraron estructuras válidas en el archivo para analizar.');
        }
        
        const prompt = `
Actúa como un Arquitecto Senior de Base de Datos y Auditor Financiero. Tu tono debe ser CRÍTICO, ANALÍTICO y AUDITOR. No adornes la realidad; si algo está mal diseñado o es contablemente incorrecto, dilo claramente.

Tu tarea es realizar una DOCUMENTACIÓN TÉCNICA del siguiente esquema detectado como tipo: ${dbType === 'sql' ? 'RELACIONAL (SQL)' : 'NO RELACIONAL (NoSQL/JSON)'}.

ESQUEMA PARA AUDITAR: ${JSON.stringify(schema, null, 2)} (Titulo en h1 y de color morado)

Reglas críticas:
    - Debes seguir EXACTAMENTE la estructura indicada abajo.
    - NO puedes cambiar títulos, orden, formato ni nombres de secciones.
    - NO puedes omitir secciones.
    - NO puedes agregar secciones nuevas.
    - ESTRUCTURA OBLIGATORIA DE TU RESPUESTA (Usa Markdown)

1. **ANÁLISIS GENERAL** (Subtitulo en h2 y de color morado)
   - Muestra una barra de progreso visual al inicio según el nivel de cumplimiento (normalización, integridad, tipos de datos): Ej: [████████░░] 80%
   - Métricas: Indica de forma limpia el % de integridad, normalización y consistencia de tipos en guiones.
        - Integridad: XX%
        - Normalización: XX%
        - Tipos de datos: XX%
    - Reglas:
        - Si es 100%, di: "TODO ESTÁ CORRECTO, pero puedo sugerir mejoras opcionales".
        - Si es <100%, explica QUÉ fallas encontraste y CÓMO corregirlas de forma técnica.

2. **DICCIONARIO DE DATOS** (Subtitulo en h2 y de color morado)
   - REGLAS OBLIGATORIAS:Cada tabla DEBE usar formato de tabla Markdown, NO usar listas, NO usar texto libre para campos, SIEMPRE usar esta estructura exacta para mejorar la comprension
   
   NombreTabla (SubSubtitulo en h3 y de color blanco en negrita)
   Descripción: texto claro de la tabla
   Campo | Tipo de dato	| Descripción | Observaciones

    - Antes de cada tabla, incluir:
        - Nombre de la tabla como título (## o ###)
        - Descripción clara de la finalidad de la tabla
   - En "Observaciones" debes incluir:
        - PK / FK / AUTO si aplica
        - Evaluación técnica
        - Lógica contable si corresponde
   - NO cambiar nombres de columnas
   - NO omitir campos
   - No usar listas con guiones para describir campos.
   - Dejar UNA línea en blanco entre cada tabla para mantener limpieza visual.
   - Detalla y evalua campos, tipos, llaves, la lógica contable/técnica de cada uno, comentarios.
   - Detalla los campos críticos para auditoría financiera (ej: campos de monto, fecha, usuario) y evalúa su diseño.
   - Muestra cada tablas con sus campos de forma organizada, limpia y sin ruido visual

3. **ANÁLISIS DE VÍNCULOS Y RELACIONES** (Subtitulo en h2 y de color morado)
   - Crítica detallada sobre cómo se conectan los datos. ¿Hay integridad referencial? ¿Faltan llaves foráneas críticas para un sistema contable?
   - Evalúa el mapa de relaciones. ¿Existen relaciones huérfanas? ¿Faltan índices compuestos o llaves foráneas?
   - Valida si el diseño soporta ACID compliance y trazabilidad de auditoría.
   - Formato: Enumera cada comentario de forma clara, sin rodeos, y con ejemplos técnicos si es necesario.

4. **SUGERENCIAS DE OPTIMIZACIÓN** (Subtitulo en h2 y de color morado)
   - Brinda observaciones críticas (mínimo 5, máximo 15 según la complejidad basados en estándares globales).
   - Incluye estándares internacionales (ej: sugerir nombres en inglés como 'companies' en lugar de 'empresas').
   - Señala redundancias y problemas de normalización.
   - Sugiere tipos de datos más eficientes (ej: INT vs BIGINT, JSONB para logs).
   - Formato obligatorio:
        - [CRÍTICO]
        - [MEJORA]
        - [ESTÁNDAR]
    - Enumera cada comentario de forma clara, sin rodeos, y con ejemplos técnicos si es necesario.

5. **CRÍTICA OBLIGATORIA** (Subtitulo en h2 y de color morado)
   - Señala errores graves. Sé directo y rudo con fallos que rompan el sistema en producción (ej: "Uso de FLOAT para dinero", "Falta de Timestamps de creación/actualización").
   - Evalúa si el diseño soporta auditorías financieras externas.

REGLAS ADICIONALES:
- No inventes campos.
- Si el diseño es mediocre, critícalo con dureza técnica, pero ofrece el código/solución para corregirlo.
- Idioma de salida: Español (pero términos técnicos y sugerencias de nombres en Inglés).
- Formatos que manejamos: .sql, .json, .txt, .dbml, .csv, .xlsx.
`;
        
        console.log(`Enviando solicitud a OpenAI para esquema de tipo: ${dbType}...`);
        
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { 
                    role: "user", 
                    content: prompt
                }
            ],
            temperature: 0.7,
        });

        const text = response.choices[0].message.content;
        
        if (!text || text.trim().length === 0) {
            throw new Error('La IA no generó contenido');
        }
        
        console.log(`Respuesta de OpenAI (${dbType}) recibida`);
        return text;
        
    } catch (error) {
        console.error('Error detallado al generar documentación con OpenAI:', error);
        
        if (error.status === 401) {
            throw new Error('API Key de OpenAI inválida. Por favor, verifica tu API Key en el archivo .env');
        } else if (error.status === 429) {
            throw new Error('Cuota de OpenAI excedida o demasiadas solicitudes. Intenta más tarde');
        } else {
            throw new Error(`Error al generar documentación: ${error.message}`);
        }
    }
}

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint de prueba para API Key de OpenAI
app.get('/test-openai', async (req, res) => {
    try {
        if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'tu_clave_de_openai_aqui') {
            return res.status(500).json({
                success: false,
                error: 'API Key de OpenAI no configurada'
            });
        }

        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: "Hola, responde con 'API de OpenAI funcionando correctamente'" }],
        });

        res.json({
            success: true,
            message: 'API Key válida',
            response: response.choices[0].message.content
        });

    } catch (error) {
        console.error('Error en prueba de API:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Endpoint para subir y analizar archivos
app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se ha subido ningún archivo' });
        }

        const filePath = req.file.path;
        const fileExtension = path.extname(req.file.originalname).toLowerCase();
        const content = fs.readFileSync(filePath, 'utf8');

        // Validar contenido
        if (!validateDatabaseContent(content, fileExtension)) {
            fs.unlinkSync(filePath); // Eliminar archivo inválido
            return res.status(400).json({
                error: 'El archivo no contiene contenido relacionado a bases de datos'
            });
        }

        // Parsear contenido según tipo de archivo
        let schema;
        if (fileExtension === '.sql' || fileExtension === '.txt' || fileExtension === '.dbml') {
            schema = parseSQL(content);
        } else if (fileExtension === '.json') {
            schema = parseJSON(content);
        } else if (fileExtension === '.xlsx') {
            schema = parseXLSX(filePath);
        } else {
            fs.unlinkSync(filePath); // Eliminar archivo no soportado
            return res.status(400).json({
                error: 'Tipo de archivo no soportado para análisis'
            });
        }

        // Determinar tipo de DB para la IA de forma más precisa
        let dbType = 'sql';
        const nosqlKeywords = ['collections', 'fields', 'documents', 'mongodb', 'nosql', 'type object', 'type array'];
        const isJson = fileExtension === '.json';
        const hasNosqlKeywords = nosqlKeywords.some(k => content.toLowerCase().includes(k));
        
        if (isJson || hasNosqlKeywords) {
            dbType = 'nosql';
        }
        
        if (fileExtension === '.sql' || content.toLowerCase().includes('create table') || content.toLowerCase().includes('alter table')) {
            dbType = 'sql';
        }
        
        // Generar documentación con IA
        const documentation = await generateDocumentation(schema, dbType);

        // Eliminar archivo temporal
        fs.unlinkSync(filePath);

        res.json({
            success: true,
            schema: schema,
            documentation: documentation,
            fileName: req.file.originalname
        });

    } catch (error) {
        console.error('Error en el procesamiento:', error);

        // Eliminar archivo si existe
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({
            error: error.message || 'Error al procesar el archivo'
        });
    }
});

// Endpoint para conversión de esquemas
app.post('/convert', async (req, res) => {
    try {
        const { schema, targetFormat } = req.body;
        
        if (!schema || !targetFormat) {
            return res.status(400).json({ error: 'Esquema y formato de destino son requeridos' });
        }

        console.log(`Convirtiendo esquema a: ${targetFormat}...`);

        const prompt = `
Actúa como un experto Arquitecto de Datos y Desarrollador Fullstack. 
Toma el siguiente esquema de base de datos:

${JSON.stringify(schema, null, 2)}

Tu tarea es CONVERTIR este esquema íntegramente al formato: ${targetFormat.toUpperCase()}.

INSTRUCCIONES:
1. Genera el código completo y válido para el formato solicitado.
2. Si es SQL o MariaDB, asegúrate de incluir llaves primarias y foráneas, usando sintaxis MySQL/MariaDB (CREATE TABLE, etc.).
3. Si es MongoDB, usa formato de esquema de Mongoose o JSON Schema.
4. Si es Prisma, usa el formato de archivo schema.prisma.
5. Si es GraphQL, usa el lenguaje de definición de tipos (SDL).
6. Mantén los nombres de las entidades y campos lo más parecidos posible.
7. Agrega comentarios breves explicando decisiones de diseño (ej: por qué usaste una relación específica).

Responde ÚNICAMENTE con el bloque de código del nuevo esquema. No incluyas explicaciones largas fuera del código.
`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3, // Menor temperatura para mayor precisión técnica
        });

        res.json({
            success: true,
            convertedCode: response.choices[0].message.content
        });

    } catch (error) {
        console.error('Error en la conversión:', error);
        res.status(500).json({ error: error.message });
    }
});

// Manejo de errores de Multer
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'El archivo es demasiado grande. Máximo 10MB' });
        }
    }

    if (error.message.includes('Tipo de archivo no permitido')) {
        return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Error interno del servidor' });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`API Key de OpenAI configurada: ${process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'tu_clave_de_openai_aqui' ? 'Sí' : 'No'}`);
});

module.exports = app;
