// Variables globales
let selectedFile = null;
let currentResults = null;

// Elementos del DOM
const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const removeFileBtn = document.getElementById('removeFileBtn');
const analyzeBtn = document.getElementById('analyzeBtn');
const resultsSection = document.getElementById('resultsSection');
const errorSection = document.getElementById('errorSection');
const errorMessage = document.getElementById('errorMessage');

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
});

function setupEventListeners() {
    fileInput.addEventListener('change', handleFileSelect);
    
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    
    removeFileBtn.addEventListener('click', removeFile);
    analyzeBtn.addEventListener('click', analyzeFile);
    
    // Nuevo listener para convertidor
    const targetFormat = document.getElementById('targetFormat');
    const convertBtn = document.getElementById('convertBtn');
    if (convertBtn) {
        convertBtn.addEventListener('click', convertSchema);
    }
    if (targetFormat) {
        targetFormat.addEventListener('change', () => {
            resetConversionResult();
            updateConverterButtons();
        });
    }

    // Listeners para el diagrama
    const diagramZoom = document.getElementById('diagramZoom');
    if (diagramZoom) {
        diagramZoom.addEventListener('input', handleZoom);
    }

    const downloadDiagramBtn = document.getElementById('downloadDiagramBtn');
    if (downloadDiagramBtn) {
        downloadDiagramBtn.addEventListener('click', downloadDiagram);
    }

    // Botones de Documentación IA
    const downloadWordBtn = document.getElementById('downloadWordBtn');
    if (downloadWordBtn) {
        downloadWordBtn.addEventListener('click', downloadWord);
    }

    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener('click', downloadPdf);
    }

    const printDocBtn = document.getElementById('printDocBtn');
    if (printDocBtn) {
        printDocBtn.addEventListener('click', printDocumentation);
    }

    // Botones de Diagrama ER
    const downloadDiagramPdfBtn = document.getElementById('downloadDiagramPdfBtn');
    if (downloadDiagramPdfBtn) {
        downloadDiagramPdfBtn.addEventListener('click', downloadDiagramPdf);
    }

    const printDiagramBtn = document.getElementById('printDiagramBtn');
    if (printDiagramBtn) {
        printDiagramBtn.addEventListener('click', printDiagram);
    }

    // Botón de Convertidor
    const downloadConvertedBtn = document.getElementById('downloadConvertedBtn');
    if (downloadConvertedBtn) {
        downloadConvertedBtn.addEventListener('click', downloadConverted);
    }

    // Botones de Esquema Bruto
    const downloadSchemaWordBtn = document.getElementById('downloadSchemaWordBtn');
    if (downloadSchemaWordBtn) {
        downloadSchemaWordBtn.addEventListener('click', downloadSchemaWord);
    }

    const downloadSchemaPdfBtn = document.getElementById('downloadSchemaPdfBtn');
    if (downloadSchemaPdfBtn) {
        downloadSchemaPdfBtn.addEventListener('click', downloadSchemaPdf);
    }

    const printSchemaBtn = document.getElementById('printSchemaBtn');
    if (printSchemaBtn) {
        printSchemaBtn.addEventListener('click', printSchema);
    }

    // Anomalias
    const printAnomaliesBtn = document.getElementById('printAnomaliesBtn');
    if (printAnomaliesBtn) {
        printAnomaliesBtn.addEventListener('click', printAnomalies);
    }

    // Descargar Anomalías ---------------------------------------------------------------------------------------------------
    const downloadAnomaliesPdfBtn = document.getElementById('downloadAnomaliesPdfBtn');
    if (downloadAnomaliesPdfBtn) {
        downloadAnomaliesPdfBtn.addEventListener('click', downloadAnomaliesPdf);
    }
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', switchTab);
    });
}



// Manejo de archivos
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        processFile(file);
    }
}

function handleDragOver(event) {
    event.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDragLeave(event) {
    event.preventDefault();
    uploadArea.classList.remove('dragover');
}

function handleDrop(event) {
    event.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

function processFile(file) {
    // Validar tipo de archivo
    const allowedExtensions = ['.sql', '.json', '.txt', '.dbml'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
        showError('Tipo de archivo no permitido. Solo se permiten: .sql, .json, .txt, .dbml');
        return;
    }
    
    // Validar tamaño (10MB)
    if (file.size > 10 * 1024 * 1024) {
        showError('El archivo es demasiado grande. Máximo 10MB');
        return;
    }
    
    selectedFile = file;
    currentResults = null;
    displayFileInfo();
    hideError();
    hideResults();
    resetConversionResult();
}

function displayFileInfo() {
    fileName.textContent = selectedFile.name;
    fileSize.textContent = formatFileSize(selectedFile.size);
    fileInfo.style.display = 'block';
    analyzeBtn.disabled = false;
}

function removeFile() {
    selectedFile = null;
    fileInput.value = '';
    fileInfo.style.display = 'none';
    analyzeBtn.disabled = true;
    hideResults();
    resetConversionResult();
    hideError();
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Análisis de archivo
async function analyzeFile() {
    if (!selectedFile) return;
    
    showLoading(true);
    hideResults();
    hideError();
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            currentResults = result;
            try {
                displayResults(result);
            } catch (renderError) {
                console.error('Render error:', renderError);
                showError('Error al mostrar los resultados: ' + renderError.message);
            }
        } else {
            showError(result.error || 'Error al procesar el archivo');
        }
    } catch (error) {
        showError('Error de conexión o de red: ' + error.message);
        console.error('Fetch Error:', error);
    } finally {
        showLoading(false);
    }
}

function showLoading(show) {
    const btnText = analyzeBtn.querySelector('.btn-text');
    const spinner = analyzeBtn.querySelector('.loading-spinner');
    
    if (show) {
        btnText.textContent = 'Interpretando tus datos... ya casi está listo.';
        spinner.style.display = 'inline-block';
        analyzeBtn.disabled = true;
    } else {
        btnText.textContent = 'Analizar con IA';
        spinner.style.display = 'none';
        analyzeBtn.disabled = !selectedFile;
    }
}

// Mostrar resultados
function displayResults(results) {
    displaySchema(results.schema);
    displayDocumentation(results.documentation);
    displayDiagram(results.schema);
    displayAnomalies(results.schema);
    resultsSection.style.display = 'block';
    resetConversionResult();
    updateConverterButtons();
    
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetConversionResult() {
    const convertedCodeEl = document.getElementById('convertedCode');
    const placeholderText = document.querySelector('.placeholder-text');
    const downloadConvertedBtn = document.getElementById('downloadConvertedBtn');

    if (convertedCodeEl) {
        convertedCodeEl.textContent = '';
        convertedCodeEl.style.display = 'none';
    }
    if (placeholderText) {
        placeholderText.style.display = 'block';
        placeholderText.textContent = 'Selecciona un formato y presiona Transformar...';
    }
    if (downloadConvertedBtn) {
        downloadConvertedBtn.disabled = true;
    }
}

function updateConverterButtons() {
    const targetFormat = document.getElementById('targetFormat');
    const convertBtn = document.getElementById('convertBtn');
    const downloadConvertedBtn = document.getElementById('downloadConvertedBtn');
    const convertedCodeEl = document.getElementById('convertedCode');
    const hasSchema = currentResults && currentResults.schema;
    const hasTarget = targetFormat && targetFormat.value;

    if (convertBtn) {
        convertBtn.disabled = !hasSchema || !hasTarget;
    }
    if (downloadConvertedBtn) {
        downloadConvertedBtn.disabled = !convertedCodeEl || !convertedCodeEl.textContent.trim();
    }
}

function displaySchema(schema) {
    // Mostrar estadísticas
    const statsHtml = `
        <div class="stat-card">
            <h4>Tablas Encontradas</h4>
            <p>${schema.tables.length}</p>
        </div>
        <div class="stat-card">
            <h4>Relaciones Inferidas</h4>
            <p>${schema.relations ? schema.relations.length : 0}</p>
        </div>
        <div class="stat-card">
            <h4>Columnas Totales</h4>
            <p>${schema.tables.reduce((total, table) => total + table.columns.length, 0)}</p>
        </div>
    `;
    document.getElementById('schemaStats').innerHTML = statsHtml;
    
    // Mostrar tablas
    const tablesHtml = schema.tables.map(table => `
        <div class="table-card">
            <div class="table-name">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="3" y1="9" x2="21" y2="9"></line>
                    <line x1="9" y1="21" x2="9" y2="9"></line>
                </svg>
                ${escapeHtml(table.name)}
            </div>
            <div class="table-columns">
                ${table.columns.map(column => `
                    <div class="column-item">
                        <span class="column-name">${escapeHtml(column.name)}</span>
                        <span class="column-type">${escapeHtml(column.type)}</span>
                        <div class="badges-wrapper">
                            ${column.primaryKey ? '<span class="column-badge badge-primary">PK</span>' : ''}
                            ${!column.nullable ? '<span class="column-badge badge-nullable">NOT NULL</span>' : ''}
                            ${column.autoIncrement ? '<span class="column-badge badge-auto">AUTO</span>' : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
    
    document.getElementById('tablesContainer').innerHTML = tablesHtml;
}

async function displayDiagram(schema) {
    const diagramContainer = document.getElementById('mermaidDiagram');
    diagramContainer.innerHTML = ''; // Limpiar anterior
    
    if (!schema.tables || schema.tables.length === 0) {
        diagramContainer.innerHTML = '<p class="no-data">No hay datos suficientes para generar un diagrama.</p>';
        return;
    }

    // Generar sintaxis de Mermaid para ER Diagram
    let mermaidCode = 'erDiagram\n';
    
    // Definir tablas y campos
    schema.tables.forEach(table => {
        const cleanTableName = table.name.replace(/\s+/g, '_');
        mermaidCode += `    ${cleanTableName} {\n`;
        table.columns.forEach(col => {
            const type = col.type.split('(')[0].replace(/\s+/g, '_');
            const name = col.name.replace(/\s+/g, '_');
            const pk = col.primaryKey ? 'PK' : '';
            mermaidCode += `        ${type} ${name} ${pk}\n`;
        });
        mermaidCode += `    }\n`;
    });

    // Definir relaciones
    if (schema.relations && schema.relations.length > 0) {
        schema.relations.forEach(rel => {
            const from = rel.from.replace(/\s+/g, '_');
            const to = rel.to.replace(/\s+/g, '_');
            // Usamos una relación genérica 1:N si no se especifica
            mermaidCode += `    ${from} ||--o{ ${to} : "relaciona"\n`;
        });
    }

    try {
        // Renderizar usando la API de Mermaid
        const { render } = mermaid;
        const id = 'mermaid-' + Date.now();
        const { svg } = await mermaid.render(id, mermaidCode);
        diagramContainer.innerHTML = svg;
    } catch (error) {
        console.error('Error rendering mermaid:', error);
        diagramContainer.innerHTML = '<p class="error-text">Error al generar el diagrama visual. Revisa el esquema bruto.</p>';
    }
}


// ===================== ANOMALÍAS (SIN EMOJIS, CON TABLAS) =====================
function analyzeAnomalies(schema) {
    const tables = schema.tables || [];
    const anomaliesByType = {
        singleColumnTables: [],
        sequentialColumnNames: [],
        implicitForeignKeys: [],
        floatColumns: [],
        tablesWithoutPK: [],
        longVarcharColumns: []
    };

    for (const table of tables) {
        // 1. Tabla con una sola columna
        if (table.columns.length === 1) {
            anomaliesByType.singleColumnTables.push({
                table: table.name,
                columnCount: table.columns.length
            });
        }

        // 2. Columnas con nombres secuenciales (desnormalización)
        const sequentialPattern = /^(col|field|attr|column|columna|campo)\d+$/i;
        const sequentialCols = table.columns.filter(col => sequentialPattern.test(col.name));
        if (sequentialCols.length > 0) {
            anomaliesByType.sequentialColumnNames.push({
                table: table.name,
                columns: sequentialCols.map(c => c.name).join(', ')
            });
        }

        // 3. Posibles claves foráneas implícitas (terminan en _id)
        const implicitFkCols = table.columns.filter(col => col.name.toLowerCase().endsWith('_id'));
        if (implicitFkCols.length > 0) {
            anomaliesByType.implicitForeignKeys.push({
                table: table.name,
                columns: implicitFkCols.map(c => c.name).join(', ')
            });
        }

        // 4. Columnas tipo FLOAT/DOUBLE
        const floatCols = table.columns.filter(col => 
            col.type.toLowerCase().includes('float') || col.type.toLowerCase().includes('double')
        );
        if (floatCols.length > 0) {
            anomaliesByType.floatColumns.push({
                table: table.name,
                columns: floatCols.map(c => `${c.name} (${c.type})`).join(', ')
            });
        }

        // 5. Tabla sin Primary Key
        const hasPK = table.columns.some(col => col.primaryKey === true);
        if (!hasPK) {
            anomaliesByType.tablesWithoutPK.push({
                table: table.name
            });
        }

        // 6. Columnas VARCHAR mayores a 255
        const longVarchars = table.columns.filter(col => {
            const match = col.type.match(/varchar\((\d+)\)/i);
            return match && parseInt(match[1]) > 255;
        });
        if (longVarchars.length > 0) {
            anomaliesByType.longVarcharColumns.push({
                table: table.name,
                columns: longVarchars.map(c => `${c.name} (${c.type})`).join(', ')
            });
        }
    }

    return anomaliesByType;
}

function displayAnomalies(schema) {
    const container = document.getElementById('anomaliesContainer');
    if (!container) return;

    const anomalies = analyzeAnomalies(schema);
    const totalTables = schema.tables.length;
    
    // Contar cuántos tipos de anomalía tienen al menos una incidencia
    let anomalyTypesWithIssues = 0;
    let totalIncidencias = 0;
    for (const key in anomalies) {
        if (anomalies[key].length > 0) {
            anomalyTypesWithIssues++;
            totalIncidencias += anomalies[key].length;
        }
    }

    // Generar el HTML con tres tarjetas
    let html = `
        <div class="schema-stats" style="margin-bottom: 24px;">
            <div class="stat-card">
                <h4>Tablas analizadas</h4>
                <p>${totalTables}</p>
            </div>
            <div class="stat-card">
                <h4>Tipos de anomalía</h4>
                <p>${anomalyTypesWithIssues}</p>
            </div>
            <div class="stat-card">
                <h4>Incidencias totales</h4>
                <p>${totalIncidencias}</p>
            </div>
        </div>
        <div class="anomalies-list">
    `;

    // Definir los títulos y descripciones de cada tipo de anomalía
    const anomalyDefinitions = [
        { key: 'singleColumnTables', title: 'Tablas con una sola columna', description: 'Una tabla con una única columna suele indicar un diseño pobre o una entidad mal modelada. Normalizar o fusionar con otra tabla podría ser necesario.' },
        { key: 'sequentialColumnNames', title: 'Columnas con nombres secuenciales', description: 'Nombres como col1, col2, campo3 sugieren desnormalización (atributos repetidos horizontalmente). Se recomienda migrar a una estructura vertical (una fila por valor).' },
        { key: 'implicitForeignKeys', title: 'Posibles claves foráneas implícitas', description: 'Columnas terminadas en "_id" que podrían referenciar otra tabla, pero sin restricción formal de integridad referencial. Considere agregar FOREIGN KEY o documentar la relación.' },
        { key: 'floatColumns', title: 'Uso de FLOAT o DOUBLE', description: 'Los tipos flotantes pueden causar errores de redondeo en valores monetarios o críticos. Emplee DECIMAL/NUMERIC en su lugar.' },
        { key: 'tablesWithoutPK', title: 'Tablas sin clave primaria', description: 'La ausencia de una clave primaria impide la identificación única de filas y afecta la integridad referencial.' },
        { key: 'longVarcharColumns', title: 'Columnas VARCHAR excesivamente largas', description: 'VARCHAR con longitud > 255 puede degradar el rendimiento. Evalúe si realmente se necesita tanta capacidad.' }
    ];

    for (const def of anomalyDefinitions) {
        const items = anomalies[def.key];
        if (items && items.length > 0) {
            html += `
                <div class="anomaly-card">
                    <div class="anomaly-header">
                        <h3>${def.title}</h3>
                        <span class="badge-issue">${items.length} incidencia(s)</span>
                    </div>
                    <p class="anomaly-description">${def.description}</p>
                    <div class="anomaly-table-wrapper">
                        <table class="anomaly-table">
                            <thead>
                                <tr><th>Tabla</th><th>Detalle</th></tr>
                            </thead>
                            <tbody>
            `;
            for (const item of items) {
                if (def.key === 'singleColumnTables') {
                    html += `<tr><td>${escapeHtml(item.table)}</td><td>La tabla tiene exactamente 1 columna.</td></tr>`;
                } else if (def.key === 'sequentialColumnNames') {
                    html += `<tr><td>${escapeHtml(item.table)}</td><td>Columnas con nombres secuenciales: ${escapeHtml(item.columns)}</td></tr>`;
                } else if (def.key === 'implicitForeignKeys') {
                    html += `<tr><td>${escapeHtml(item.table)}</td><td>Columnas: ${escapeHtml(item.columns)}</td></tr>`;
                } else if (def.key === 'floatColumns') {
                    html += `<tr><td>${escapeHtml(item.table)}</td><td>Columnas: ${escapeHtml(item.columns)}</td></tr>`;
                } else if (def.key === 'tablesWithoutPK') {
                    html += `<tr><td>${escapeHtml(item.table)}</td><td>No se definió ninguna clave primaria.</td></tr>`;
                } else if (def.key === 'longVarcharColumns') {
                    html += `<tr><td>${escapeHtml(item.table)}</td><td>Columnas: ${escapeHtml(item.columns)}</td></tr>`;
                }
            }
            html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
    }

    // Si no hay ningún tipo de anomalía, mostrar mensaje global
    const hasAnyAnomaly = anomalyDefinitions.some(def => anomalies[def.key] && anomalies[def.key].length > 0);
    if (!hasAnyAnomaly) {
        html += `
            <div class="anomaly-card clean">
                <div class="anomaly-header">
                    <h3>Sin anomalías detectadas</h3>
                    <span class="badge-clean">OK</span>
                </div>
                <p class="clean-message">El esquema analizado no presenta ninguna de las anomalías revisadas: tablas de una columna, nombres secuenciales, claves foráneas implícitas, tipos float, falta de PK o VARCHAR excesivos.</p>
            </div>
        `;
    }

    html += `</div>`;
    container.innerHTML = html;
}
//-------------------------------

function displayDocumentation(documentation) {
    // Limpiar bloques de código markdown si la IA los incluyó
    let cleanDoc = documentation;
    
    // Eliminar bloques ```markdown ... ``` o simplemente ``` ... ```
    const markdownMatch = cleanDoc.match(/```(?:markdown)?\s?([\s\S]*?)```/i);
    if (markdownMatch && markdownMatch[1]) {
        cleanDoc = markdownMatch[1];
    }
    
    // Detectar y transformar la barra de progreso de auditoría
    // Patrón: [████████░░] 80%
    const progressBarRegex = /\[[█░]+\]\s*(\d+)%/g;
    cleanDoc = cleanDoc.replace(progressBarRegex, (match, percentage) => {
        return `
<div class="audit-bar-wrapper">
    <div class="audit-bar-label">
        <span>Nivel de Cumplimiento Técnico</span>
        <span>${percentage}%</span>
    </div>
    <div class="audit-bar-bg">
        <div class="audit-bar-fill" data-width="${percentage}"></div>
    </div>
</div>`;
    });
    
    // Usar marked para parsear el markdown
    const html = marked.parse(cleanDoc);
    document.getElementById('documentationContent').innerHTML = html;

    // Disparar la animación de la barra después de un breve delay
    setTimeout(() => {
        const fills = document.querySelectorAll('.audit-bar-fill');
        fills.forEach(fill => {
            const width = fill.getAttribute('data-width');
            fill.style.width = width + '%';
        });
    }, 100);
}

// Tab switching
function switchTab(event) {
    const tabName = event.target.dataset.tab;
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

// Manejo de errores
function showError(message) {
    errorMessage.textContent = message;
    errorSection.style.display = 'block';
    hideResults();
}

function hideError() {
    errorSection.style.display = 'none';
}

function hideResults() {
    resultsSection.style.display = 'none';
    currentResults = null;

    const documentationContent = document.getElementById('documentationContent');
    const schemaStats = document.getElementById('schemaStats');
    const tablesContainer = document.getElementById('tablesContainer');
    const mermaidDiagram = document.getElementById('mermaidDiagram');

    if (documentationContent) documentationContent.innerHTML = '';
    if (schemaStats) schemaStats.innerHTML = '';
    if (tablesContainer) tablesContainer.innerHTML = '';
    if (mermaidDiagram) mermaidDiagram.innerHTML = '';

    resetConversionResult();
    updateConverterButtons();
}

// Reset upload
function resetUpload() {
    removeFile();
    hideError();
}

// Utilidades
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Manejo de Zoom del Diagrama
function handleZoom(event) {
    const scale = event.target.value;
    const diagram = document.querySelector('#mermaidDiagram svg');
    const zoomValue = document.getElementById('zoomValue');
    
    if (diagram) {
        diagram.style.transform = `scale(${scale})`;
        diagram.style.transformOrigin = 'top center';
    }
    if (zoomValue) {
        zoomValue.textContent = `${Math.round(scale * 100)}%`;
    }
}

// Descargar Diagrama como SVG
function downloadDiagram() {
    const svgElement = document.querySelector('#mermaidDiagram svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `diagrama_er_${Date.now()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function getDocumentationCleanText() {
    if (!currentResults || !currentResults.documentation) return '';
    let text = currentResults.documentation;
    const markdownMatch = text.match(/```(?:markdown)?\s?([\s\S]*?)```/i);
    if (markdownMatch && markdownMatch[1]) {
        text = markdownMatch[1];
    }
    return text.trim();
}

function downloadWord() {
    if (!currentResults || !currentResults.documentation) {
        showError('No hay documentación IA disponible para descargar.');
        return;
    }

    const documentationHtml = marked.parse(getDocumentationCleanText());
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Documentación IA</title>
</head>
<body>${documentationHtml}</body>
</html>`;

    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `documentacion_ia_${Date.now()}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function downloadPdf() {
    if (!currentResults || !currentResults.documentation) {
        showError('No hay documentación IA disponible para descargar.');
        return;
    }

    const docText = getDocumentationCleanText();
    let jsPDF;

    // Intentar diferentes formas de acceder a jsPDF
    if (window.jsPDF) {
        jsPDF = window.jsPDF;
    } else if (window.jspdf && window.jspdf.jsPDF) {
        jsPDF = window.jspdf.jsPDF;
    } else {
        showError('La librería PDF no está disponible. Recarga la página e inténtalo de nuevo.');
        return;
    }

    try {
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const margin = 15;
        const pageWidth = doc.internal.pageSize.getWidth() - margin * 2;
        const textLines = doc.splitTextToSize(docText, pageWidth);
        doc.setFontSize(11);
        doc.text(textLines, margin, 20);
        doc.save(`documentacion_ia_${Date.now()}.pdf`);
    } catch (error) {
        console.error('Error generando PDF:', error);
        showError('Error al generar el PDF. Inténtalo de nuevo.');
    }
}

function printDocumentation() {
    if (!currentResults || !currentResults.documentation) {
        showError('No hay documentación IA disponible para imprimir.');
        return;
    }

    const documentationHtml = marked.parse(getDocumentationCleanText());
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        showError('No se pudo abrir la ventana de impresión. Verifica tu navegador.');
        return;
    }

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Imprimir Documentación IA</title>
<style>
body { background: #0f111a; color: #f0f4ff; font-family: Arial, sans-serif; padding: 24px; }
.markdown-body h1, .markdown-body h2, .markdown-body h3 { color: #9d4edd; }
.markdown-body p, .markdown-body li, .markdown-body td { color: #e6ebff; }
.markdown-body pre { background: #111429; color: #e0aaff; padding: 12px; border-radius: 8px; }
.audit-bar-wrapper { margin: 20px 0; }
.audit-bar-label { display: flex; justify-content: space-between; font-weight: 700; }
.audit-bar-bg { background: #111429; border-radius: 8px; padding: 6px; }
.audit-bar-fill { background: linear-gradient(90deg, #5e6ad2, #9d4edd); height: 16px; border-radius: 8px; }
</style>
</head>
<body>
<div class="markdown-body">${documentationHtml}</div>
</body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}

// Convertidor de Esquemas
async function convertSchema() {
    if (!currentResults || !currentResults.schema) {
        showError('Primero debes analizar un archivo para tener un esquema que convertir.');
        return;
    }
    
    const targetFormat = document.getElementById('targetFormat').value;
    const convertBtn = document.getElementById('convertBtn');
    const convertedCodeEl = document.getElementById('convertedCode');
    const placeholderText = document.querySelector('.placeholder-text');
    
    // Mostrar cargando
    convertBtn.disabled = true;
    convertBtn.innerHTML = 'Convirtiendo...';
    
    try {
        const response = await fetch('/convert', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                schema: currentResults.schema,
                targetFormat: targetFormat
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            let code = result.convertedCode || '';
            // Limpiar bloques de código markdown si existen
            code = code.replace(/```[\w]*\n?/g, '').replace(/```/g, '');
            
            convertedCodeEl.textContent = code;
            convertedCodeEl.style.display = 'block';
            if (placeholderText) placeholderText.style.display = 'none';

            updateConverterButtons();
            if (!code.trim()) {
                showError('No se generó un esquema convertido válido para descargar.');
            }
        } else {
            showError('Error en la conversión: ' + result.error);
        }
    } catch (error) {
        showError('Error de conexión: ' + error.message);
    } finally {
        convertBtn.disabled = false;
        convertBtn.innerHTML = 'Transformar Esquema';
    }
}

// Funciones para Diagrama ER
function downloadDiagramPdf() {
    const svgElement = document.querySelector('#mermaidDiagram svg');
    if (!svgElement) {
        showError('No hay diagrama disponible para descargar.');
        return;
    }

    let jsPDF;
    if (window.jsPDF) {
        jsPDF = window.jsPDF;
    } else if (window.jspdf && window.jspdf.jsPDF) {
        jsPDF = window.jspdf.jsPDF;
    } else {
        showError('La librería PDF no está disponible.');
        return;
    }

    try {
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const svgData = new XMLSerializer().serializeToString(svgElement);
        
        // Crear una imagen temporal del SVG
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = function() {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = 210; // A4 width in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            doc.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            doc.save(`diagrama_er_${Date.now()}.pdf`);
        };
        
        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    } catch (error) {
        console.error('Error generando PDF del diagrama:', error);
        showError('Error al generar el PDF del diagrama.');
    }
}

function printDiagram() {
    const svgElement = document.querySelector('#mermaidDiagram svg');
    if (!svgElement) {
        showError('No hay diagrama disponible para imprimir.');
        return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        showError('No se pudo abrir la ventana de impresión.');
        return;
    }

    const svgData = new XMLSerializer().serializeToString(svgElement);
    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Imprimir Diagrama ER</title>
<style>
body { margin: 0; padding: 20px; background: white; }
svg { max-width: 100%; height: auto; }
</style>
</head>
<body>${svgData}</body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}

// Función para Convertidor
function downloadConverted() {
    const convertedCodeEl = document.getElementById('convertedCode');
    if (!convertedCodeEl || !convertedCodeEl.textContent.trim()) {
        showError('No hay código convertido disponible para descargar.');
        return;
    }

    const targetFormat = document.getElementById('targetFormat').value;
    const code = convertedCodeEl.textContent;
    
    // Determinar extensión según el formato
    let extension = 'txt';
    switch (targetFormat) {
        case 'sql': extension = 'sql'; break;
        case 'mariadb': extension = 'sql'; break;
        case 'mongodb': extension = 'js'; break;
        case 'prisma': extension = 'prisma'; break;
        case 'graphql': extension = 'graphql'; break;
        case 'json': extension = 'json'; break;
    }
    
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `esquema_convertido_${Date.now()}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Funciones auxiliares para Esquema Bruto
function getSchemaText() {
    if (!currentResults || !currentResults.schema) return '';
    
    let text = 'ESQUEMA DE BASE DE DATOS\n\n';
    
    // Estadísticas
    const tables = currentResults.schema.tables || [];
    text += `Tablas encontradas: ${tables.length}\n`;
    text += `Relaciones inferidas: ${currentResults.schema.relations ? currentResults.schema.relations.length : 0}\n`;
    text += `Columnas totales: ${tables.reduce((total, table) => total + table.columns.length, 0)}\n\n`;
    
    // Detalles de tablas
    tables.forEach(table => {
        text += `TABLA: ${table.name}\n`;
        text += 'COLUMNAS:\n';
        table.columns.forEach(col => {
            const pk = col.primaryKey ? ' (PK)' : '';
            const nn = !col.nullable ? ' (NOT NULL)' : '';
            const ai = col.autoIncrement ? ' (AUTO)' : '';
            text += `  - ${col.name}: ${col.type}${pk}${nn}${ai}\n`;
        });
        text += '\n';
    });
    
    return text;
}

// Funciones para Esquema Bruto
function downloadSchemaWord() {
    const schemaText = getSchemaText();
    if (!schemaText) {
        showError('No hay esquema disponible para descargar.');
        return;
    }

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Esquema de Base de Datos</title>
</head>
<body><pre>${schemaText}</pre></body>
</html>`;

    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `esquema_bruto_${Date.now()}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function downloadSchemaPdf() {
    const schemaText = getSchemaText();
    if (!schemaText) {
        showError('No hay esquema disponible para descargar.');
        return;
    }

    let jsPDF;
    if (window.jsPDF) {
        jsPDF = window.jsPDF;
    } else if (window.jspdf && window.jspdf.jsPDF) {
        jsPDF = window.jspdf.jsPDF;
    } else {
        showError('La librería PDF no está disponible.');
        return;
    }

    try {
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const margin = 15;
        const pageWidth = doc.internal.pageSize.getWidth() - margin * 2;
        const textLines = doc.splitTextToSize(schemaText, pageWidth);
        doc.setFontSize(10);
        doc.text(textLines, margin, 20);
        doc.save(`esquema_bruto_${Date.now()}.pdf`);
    } catch (error) {
        console.error('Error generando PDF del esquema:', error);
        showError('Error al generar el PDF del esquema.');
    }
}

function printSchema() {
    const schemaText = getSchemaText();
    if (!schemaText) {
        showError('No hay esquema disponible para imprimir.');
        return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        showError('No se pudo abrir la ventana de impresión.');
        return;
    }

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Imprimir Esquema Bruto</title>
<style>
body { font-family: monospace; padding: 20px; background: white; color: black; }
pre { white-space: pre-wrap; }
</style>
</head>
<body><pre>${schemaText}</pre></body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}


function printAnomalies() {
    const anomaliesContainer = document.getElementById('anomaliesContainer');
    if (!anomaliesContainer || !anomaliesContainer.innerHTML.trim()) {
        showError('No hay anomalías para imprimir.');
        return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        showError('No se pudo abrir la ventana de impresión.');
        return;
    }

    const content = anomaliesContainer.cloneNode(true);
    // Asegurar que los estilos se mantengan
    const styles = document.querySelector('style').innerHTML;
    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Reporte de Anomalías</title>
<style>
    body { background: #0f111a; color: #f0f4ff; font-family: 'Outfit', sans-serif; padding: 20px; }
    .anomalies-summary { background: rgba(255,255,255,0.05); padding: 16px; border-radius: 12px; margin-bottom: 20px; }
    .summary-stats { display: flex; gap: 20px; }
    .summary-stat { display: flex; flex-direction: column; }
    .stat-label { font-size: 0.8rem; color: #9ba1b6; }
    .stat-value { font-size: 1.8rem; font-weight: 700; }
    .warning { color: #ffaa44; }
    .success { color: #4caf50; }
    .anomaly-card { background: rgba(0,0,0,0.3); border-radius: 16px; padding: 16px; margin-bottom: 16px; border-left: 4px solid #ff5252; }
    .anomaly-card.clean { border-left-color: #4caf50; }
    .anomaly-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .badge-issue { background: #ff5252; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; }
    .badge-clean { background: #4caf50; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; }
    .anomaly-issues { margin: 0; padding-left: 20px; }
    .anomaly-issues li { margin-bottom: 8px; }
    .clean-message { color: #a5d6a7; margin: 0; }
    ${styles}
</style>
</head>
<body>
    ${content.outerHTML}
</body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}

async function downloadAnomaliesPdf() {
    const anomaliesContainer = document.getElementById('anomaliesContainer');
    if (!anomaliesContainer || !anomaliesContainer.innerHTML.trim()) {
        showError('No hay contenido de anomalías para exportar a PDF.');
        return;
    }

    // Mostrar un indicador de carga si fuera necesario
    const originalBtn = document.getElementById('downloadAnomaliesPdfBtn');
    const originalContent = originalBtn.innerHTML;
    originalBtn.disabled = true;
    originalBtn.innerHTML = 'Generando PDF...';

    try {
        // Clonar el contenedor para no afectar la vista original
        const cloneContainer = anomaliesContainer.cloneNode(true);
        
        // Estilos para el clon
        cloneContainer.style.position = 'fixed';
        cloneContainer.style.left = '-9999px';
        cloneContainer.style.top = '0';
        cloneContainer.style.width = '800px'; // Ancho fijo para consistencia
        cloneContainer.style.backgroundColor = '#ffffff';
        cloneContainer.style.color = '#000000';
        cloneContainer.style.padding = '40px';
        cloneContainer.style.zIndex = '-1';
        
        document.body.appendChild(cloneContainer);

        // Estilos específicos para el PDF
        const style = document.createElement('style');
        style.textContent = `
            .schema-stats { display: flex; gap: 20px; margin-bottom: 24px; }
            .stat-card { background: #f0f4ff; padding: 16px; border-radius: 12px; text-align: center; flex: 1; border: 1px solid #d0d7ff; }
            .stat-card h4 { margin: 0 0 8px 0; font-size: 0.9rem; color: #333; }
            .stat-card p { font-size: 1.8rem; font-weight: 700; margin: 0; color: #5e6ad2; }
            .anomaly-card { background: #f9f9ff; border-radius: 16px; padding: 20px; margin-bottom: 20px; border-left: 6px solid #ff5252; border-top: 1px solid #eee; border-right: 1px solid #eee; border-bottom: 1px solid #eee; }
            .anomaly-card.clean { border-left-color: #4caf50; }
            .anomaly-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
            .anomaly-header h3 { margin: 0; color: #1a1a1a; }
            .badge-issue { background: #ff5252; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: bold; }
            .badge-clean { background: #4caf50; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: bold; }
            .anomaly-description { font-size: 0.95rem; color: #444; margin-bottom: 16px; line-height: 1.4; }
            .anomaly-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .anomaly-table th, .anomaly-table td { padding: 10px 12px; border-bottom: 1px solid #e0e0e0; text-align: left; }
            .anomaly-table th { background: #f0f2f5; font-weight: 600; color: #333; }
            .anomaly-table td { color: #555; }
            .clean-message { background: #e8f5e9; padding: 15px; border-radius: 8px; color: #2e7d32; border: 1px solid #c8e6c9; }
        `;
        cloneContainer.prepend(style);

        // Usar html2canvas para generar la imagen
        const canvas = await html2canvas(cloneContainer, { 
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });
        
        const imgData = canvas.toDataURL('image/png');
        
        // Detectar jsPDF de forma robusta
        let jsPDF;
        if (window.jsPDF) {
            jsPDF = window.jsPDF;
        } else if (window.jspdf && window.jspdf.jsPDF) {
            jsPDF = window.jspdf.jsPDF;
        } else {
            throw new Error('La librería jsPDF no está cargada correctamente.');
        }

        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 190; // Margen de 10mm a cada lado
        const pageHeight = 287; // Margen de 5mm arriba/abajo
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        let heightLeft = imgHeight;
        let position = 10; // Margen superior inicial

        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= (pageHeight - 10);

        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }
        
        pdf.save(`reporte_anomalias_${Date.now()}.pdf`);
        
        // Limpiar
        document.body.removeChild(cloneContainer);

    } catch (error) {
        console.error('Error generando PDF de anomalías:', error);
        showError('Error al generar el PDF: ' + error.message);
    } finally {
        originalBtn.disabled = false;
        originalBtn.innerHTML = originalContent;
    }
}