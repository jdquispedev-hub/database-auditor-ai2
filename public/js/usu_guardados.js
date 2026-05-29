const SUPABASE_URL = 'https://anzravhguhsdfnjfsjcm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_sIB2jrePXiRBfBidFDFRjA_JeYe5cfP';
let supabaseClient;
try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (e) {
    console.error("Error al inicializar Supabase Client:", e);
    // Cliente mock seguro para evitar caídas catastróficas
    supabaseClient = {
        from: () => ({
            select: () => ({
                eq: () => ({
                    order: () => Promise.resolve({ data: [], error: null })
                }),
                order: () => Promise.resolve({ data: [], error: null })
            })
        })
    };
}
const userId = sessionStorage.getItem('ds_user') || 'demo_user';

const isUuid = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

function limpiarMarkdownFences(text) {
    if (!text) return '';
    let clean = text.trim();
    const markdownMatch = clean.match(/```(?:markdown|html)?\s?([\s\S]*?)```/i);
    if (markdownMatch && markdownMatch[1]) {
        clean = markdownMatch[1];
    }
    return clean.trim();
}

async function abrirModalVisualizador(doc) {
    let contenido = doc.contenido || {};
    if (typeof contenido === 'string') {
        try {
            contenido = JSON.parse(contenido);
        } catch (e) {
            console.error("Error al parsear contenido:", e);
            contenido = {};
        }
    }

    const docName = doc.nombre;
    const docId = doc.id;
    const fileLink = contenido.pdfUrl || contenido.pdfBase64 || '';
    const documentationTextRaw = contenido.documentation || '';
    const documentationText = limpiarMarkdownFences(documentationTextRaw);

    // Inyectar estilos para el toolbar de Quill en Modo Oscuro si no existen
    if (!document.getElementById('quill-dark-theme-styles')) {
        const style = document.createElement('style');
        style.id = 'quill-dark-theme-styles';
        style.innerHTML = `
            .ql-toolbar.ql-snow {
                background: #1e1e2e !important;
                border: 1px solid rgba(255, 255, 255, 0.15) !important;
                border-top-left-radius: 12px;
                border-top-right-radius: 12px;
                padding: 10px !important;
            }
            .ql-toolbar.ql-snow .ql-stroke {
                stroke: #e5e7eb !important;
            }
            .ql-toolbar.ql-snow .ql-fill {
                fill: #e5e7eb !important;
            }
            .ql-toolbar.ql-snow .ql-picker {
                color: #e5e7eb !important;
            }
            .ql-toolbar.ql-snow .ql-picker-options {
                background-color: #1e1e2e !important;
                border: 1px solid rgba(255, 255, 255, 0.15) !important;
            }
            .ql-container.ql-snow {
                background: #1e1e2e !important;
                border: 1px solid rgba(255, 255, 255, 0.15) !important;
                border-top: none !important;
                border-bottom-left-radius: 12px;
                border-bottom-right-radius: 12px;
                color: #f3f4f6 !important;
                font-family: 'Outfit', sans-serif !important;
                font-size: 0.95rem;
                height: 480px;
            }
            .ql-editor {
                min-height: 400px;
                line-height: 1.7;
            }
            .ql-editor h1, .ql-editor h2, .ql-editor h3, .ql-editor h4 {
                color: #a78bfa !important;
                font-weight: 700;
                margin-top: 20px;
                margin-bottom: 10px;
            }
            .ql-editor p {
                margin-bottom: 12px;
            }
        `;
        document.head.appendChild(style);
    }

    const modalBody = document.getElementById('modalBody');

    // Función para renderizar la vista de sólo lectura (PDF limpio a pantalla completa sin barra lateral)
    function renderVistaLectura() {
        // Siempre limpiar el fragmento # de la URL base y añadir parámetros frescos + cache-buster
        const fileLinkBase = fileLink ? fileLink.split('#')[0] : '';
        const cacheBuster = Date.now();
        const fileLinkClean = fileLinkBase ? `${fileLinkBase}#toolbar=1&navpanes=0&view=FitH&t=${cacheBuster}` : '';
        
        modalBody.innerHTML = `
            <div class="pdf-modal-view" style="color: #fff; font-family: 'Outfit', sans-serif;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px; flex-wrap: wrap; gap: 10px;">
                    <h3 style="font-size: 1.4rem; color: #a78bfa; margin: 0;">📄 ${escapeHtml(docName)}</h3>
                    <div style="display: flex; gap: 10px;">
                        <button id="btnEditarContenido" class="action-btn" style="display: inline-flex; align-items: center; background: #10b981; color: #fff; padding: 10px 18px; border-radius: 30px; font-weight: 600; font-size: 0.85rem; border: none; cursor: pointer; transition: transform 0.2s;">
                            ✏️ Editar Contenido
                        </button>
                        <a href="${fileLinkBase}" target="_blank" download="${docName}.pdf" class="action-btn" style="text-decoration: none; display: inline-flex; align-items: center; background: linear-gradient(135deg, #a78bfa, #5e6ad2); color: #fff; padding: 10px 18px; border-radius: 30px; font-weight: 600; font-size: 0.85rem; box-shadow: 0 4px 15px rgba(94, 106, 210, 0.4); border: none; cursor: pointer; transition: transform 0.2s;">
                            📥 Descargar PDF
                        </a>
                    </div>
                </div>
                <p style="color: #9ca3af; margin-bottom: 15px; font-size: 0.9rem;">
                    Este documento cuenta con un PDF almacenado de forma segura en Supabase Storage.
                </p>
                
                <!-- Visor de PDF Integrado con visualización completa sin panel de miniaturas -->
                <div style="border-radius: 12px; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.15); background: #1e1e2e; margin-bottom: 15px; box-shadow: inset 0 2px 8px rgba(0,0,0,0.5);">
                    <iframe id="pdfViewerIframe" src="${fileLinkClean}" style="width: 100%; height: 550px; border: none; display: block;" onload="this.style.opacity=1" onerror="document.getElementById('pdfViewerIframe').src=this.src"></iframe>
                </div>
            </div>
        `;

        document.getElementById('btnEditarContenido')?.addEventListener('click', renderVistaEdicion);
    }

    // Función para renderizar el editor WYSIWYG con Quill.js (igual que Word)
    function renderVistaEdicion() {
        modalBody.innerHTML = `
            <div class="edit-modal-view" style="color: #fff; font-family: 'Outfit', sans-serif;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
                    <h3 style="font-size: 1.4rem; color: #a78bfa; margin: 0;">✏️ Editar Documentación: ${escapeHtml(docName)}</h3>
                    <div style="display: flex; gap: 10px;">
                        <button id="btnGuardarEdicion" class="action-btn" style="display: inline-flex; align-items: center; background: #10b981; color: #fff; padding: 10px 18px; border-radius: 30px; font-weight: 600; font-size: 0.85rem; border: none; cursor: pointer; transition: transform 0.2s;">
                            💾 Guardar Cambios
                        </button>
                        <button id="btnCancelarEdicion" class="action-btn" style="display: inline-flex; align-items: center; background: #6b7280; color: #fff; padding: 10px 18px; border-radius: 30px; font-weight: 600; font-size: 0.85rem; border: none; cursor: pointer; transition: transform 0.2s;">
                            ❌ Cancelar
                        </button>
                    </div>
                </div>
                <p style="color: #9ca3af; margin-bottom: 15px; font-size: 0.9rem;">
                    Edita el contenido del reporte a continuación. Puedes presionar el botón de <b>Tijeras (✂️)</b> en la barra de herramientas para insertar un <b>Salto de Página Manual</b> donde desees forzar una nueva página en el PDF.
                </p>
                <div id="editorQuill" style="height: 400px; margin-bottom: 20px;"></div>
            </div>
        `;

        // Configurar opciones de barra de herramientas con botón personalizado 'pagebreak'
        const toolbarOptions = [
            [{ header: [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            [{ color: [] }, { background: [] }],
            ['pagebreak'], // Botón personalizado para saltos de página
            ['clean']
        ];

        // Definir icono SVG de tijeras y corte para el salto de página
        const pagebreakIcon = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none" style="vertical-align: middle;"><line x1="3" y1="12" x2="21" y2="12" stroke-dasharray="4 4"></line><path d="M7 8l5-5 5 5M17 16l-5 5-5-5"></path></svg>`;

        // Inicializar el editor Quill
        const quill = new window.Quill('#editorQuill', {
            modules: {
                toolbar: {
                    container: toolbarOptions,
                    handlers: {
                        pagebreak: function() {
                            const range = this.quill.getSelection();
                            if (range) {
                                // Insertar el contenedor de salto de página que será interpretado por html2pdf.js
                                const pageBreakHtml = `<div class="html2pdf__page-break" style="page-break-after: always; border-bottom: 2px dashed #a78bfa; margin: 20px 0; padding: 6px 0; text-align: center; color: #a78bfa; font-size: 0.85rem; font-family: 'Outfit', sans-serif; font-weight: 600; user-select: none;">✂️ [Salto de Página Manual] ✂️</div>`;
                                this.quill.clipboard.dangerouslyPasteHTML(range.index, pageBreakHtml);
                            }
                        }
                    }
                }
            },
            theme: 'snow'
        });

        // Configurar el icono DESPUÉS de que Quill termine de renderizar el toolbar
        setTimeout(() => {
            const pagebreakBtn = document.querySelector('.ql-pagebreak');
            if (pagebreakBtn) {
                pagebreakBtn.innerHTML = pagebreakIcon;
                pagebreakBtn.title = "Insertar Salto de Página Manual en el PDF";
                pagebreakBtn.style.display = 'flex';
                pagebreakBtn.style.alignItems = 'center';
                pagebreakBtn.style.justifyContent = 'center';
                pagebreakBtn.style.width = '28px';
                pagebreakBtn.style.height = '28px';
            }
        }, 50);

        // Cargar el contenido de forma robusta. Si es HTML lo carga directo; si es Markdown lo compila primero a HTML
        let docHtml = '';
        if (documentationText.trim().startsWith('<') || documentationText.trim().includes('</p>') || documentationText.trim().includes('</h1>')) {
            docHtml = documentationText;
        } else {
            docHtml = window.marked.parse(documentationText);
        }
        quill.clipboard.dangerouslyPasteHTML(docHtml);

        document.getElementById('btnCancelarEdicion')?.addEventListener('click', renderVistaLectura);
        document.getElementById('btnGuardarEdicion')?.addEventListener('click', async () => {
            const nuevoHtml = quill.root.innerHTML;
            
            const btnGuardar = document.getElementById('btnGuardarEdicion');
            btnGuardar.disabled = true;
            btnGuardar.innerText = '⚡ Regenerando PDF...';

            try {
                // 1. Crear contenedor temporal fuera de pantalla para evitar parpadeos y que sea visible a html2canvas
                const wrapper = document.createElement('div');
                wrapper.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;';
                
                const hiddenDiv = document.createElement('div');
                hiddenDiv.id = 'tempDocumentationContent';
                hiddenDiv.style.cssText = 'width:210mm;background:#ffffff;padding:15mm 20mm;box-sizing:border-box;color:#1f2937;';
                hiddenDiv.innerHTML = nuevoHtml;
                
                wrapper.appendChild(hiddenDiv);
                document.body.appendChild(wrapper);

                // 2. Dar formato impecable al elemento clonado tal como lo hace usu_generar.js
                hiddenDiv.querySelectorAll('*').forEach(el => {
                    el.style.backgroundColor = 'transparent';
                    
                    // Si es la etiqueta de salto de página manual, la ocultamos por completo en el PDF impreso
                    if (el.classList.contains('html2pdf__page-break')) {
                        el.style.borderBottom = 'none';
                        el.style.color = 'transparent';
                        el.style.fontSize = '0px';
                        el.style.height = '0px';
                        el.style.margin = '0px';
                        el.style.padding = '0px';
                        el.style.lineHeight = '0px';
                        return;
                    }

                    if (el.tagName === 'H1' || el.tagName === 'H2' || el.tagName === 'H3' || el.tagName === 'H4') {
                        el.style.color = '#1e3a8a';
                        el.style.borderBottom = '2px solid #e5e7eb';
                        el.style.paddingBottom = '6px';
                        el.style.marginTop = '28px';
                        el.style.marginBottom = '16px';
                        el.style.fontWeight = '700';
                        el.style.pageBreakAfter = 'avoid';
                    } else if (el.tagName === 'P') {
                        el.style.color = '#374151';
                        el.style.lineHeight = '1.7';
                        el.style.marginBottom = '16px';
                    } else if (el.tagName === 'TABLE') {
                        el.style.width = '100%';
                        el.style.borderCollapse = 'collapse';
                        el.style.marginBottom = '20px';
                        el.style.pageBreakInside = 'avoid';
                    } else if (el.tagName === 'TR') {
                        el.style.pageBreakInside = 'avoid';
                    } else if (el.tagName === 'TH') {
                        el.style.color = '#111827';
                        el.style.backgroundColor = '#e5e7eb';
                        el.style.border = '2px solid #374151';
                        el.style.fontWeight = '700';
                        el.style.padding = '10px';
                        el.style.fontSize = '0.9rem';
                    } else if (el.tagName === 'TD') {
                        el.style.color = '#111827';
                        el.style.border = '1.5px solid #6b7280';
                        el.style.padding = '10px';
                        el.style.fontSize = '0.85rem';
                    } else if (el.tagName === 'A') {
                        el.style.color = '#2563eb';
                    } else if (el.tagName === 'PRE' || el.tagName === 'CODE') {
                        el.style.backgroundColor = '#f8fafc';
                        el.style.color = '#0f172a';
                        el.style.border = '1px solid #e2e8f0';
                        el.style.padding = '12px';
                        el.style.borderRadius = '6px';
                        el.style.fontSize = '0.85rem';
                        el.style.whiteSpace = 'pre-wrap';
                        el.style.wordBreak = 'break-all';
                        el.style.pageBreakInside = 'avoid';
                    } else if (el.tagName === 'LI') {
                        el.style.color = '#374151';
                        el.style.marginBottom = '8px';
                        el.style.lineHeight = '1.6';
                    } else {
                        el.style.color = '#374151';
                    }
                });

                // 3. Configurar opciones de html2pdf
                const opt = {
                    margin:       [10, 10, 10, 10],
                    filename:     `${docName}.pdf`,
                    image:        { type: 'jpeg', quality: 0.98 },
                    html2canvas:  { scale: 2, useCORS: true, logging: false },
                    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
                    pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
                };

                // 4. Generar nuevo PDF Blob
                const pdfBlob = await window.html2pdf().set(opt).from(hiddenDiv).output('blob');
                document.body.removeChild(wrapper);

                // 5. Eliminar el PDF anterior de Storage si existe (evita acumulación de archivos huérfanos)
                const urlAnterior = contenido.pdfUrl || '';
                if (urlAnterior) {
                    try {
                        // Extraer el path relativo desde la URL pública de Supabase
                        const storagePrefix = '/storage/v1/object/public/documentos_pdf/';
                        const idxPrefix = urlAnterior.indexOf(storagePrefix);
                        if (idxPrefix !== -1) {
                            const pathAnterior = decodeURIComponent(urlAnterior.substring(idxPrefix + storagePrefix.length).split('?')[0].split('#')[0]);
                            await supabaseClient.storage.from('documentos_pdf').remove([pathAnterior]);
                        }
                    } catch (delErr) {
                        console.warn('No se pudo eliminar el PDF anterior:', delErr);
                    }
                }

                // 6. Subir el nuevo PDF a Storage con un path fijo por documento (sobreescribe el anterior)
                const nuevoFilePath = `user_${doc.usuario_id || userId}/${docId}_documentacion.pdf`;
                const { data: uploadData, error: uploadError } = await supabaseClient.storage
                    .from('documentos_pdf')
                    .upload(nuevoFilePath, pdfBlob, {
                        contentType: 'application/pdf',
                        upsert: true
                    });

                if (uploadError) throw uploadError;

                // 7. Obtener URL pública
                const { data: publicUrlData } = supabaseClient.storage
                    .from('documentos_pdf')
                    .getPublicUrl(nuevoFilePath);

                const nuevaPdfUrl = publicUrlData.publicUrl;

                // 7. Actualizar el contenido en la base de datos
                const nuevoContenido = {
                    ...contenido,
                    documentation: nuevoHtml, // Guardamos la documentación ya formateada como HTML limpio de Quill
                    pdfUrl: nuevaPdfUrl
                };

                const { error: updateError } = await supabaseClient
                    .from('documentos')
                    .update({
                        contenido: nuevoContenido,
                        fecha_mod: new Date().toISOString()
                    })
                    .eq('id', docId);

                if (updateError) throw updateError;

                // 8. Actualizar las variables locales para la recarga
                contenido = nuevoContenido;
                doc.contenido = nuevoContenido;

                alert('¡Cambios guardados y PDF regenerado con éxito!');
                renderTodo(); // Recargar la lista principal en segundo plano
                
                // Esperar un momento para que Supabase Storage propague el nuevo archivo
                // antes de recargar el visor (evita pantalla en blanco)
                setTimeout(() => {
                    abrirModalVisualizador(doc);
                }, 1500);

            } catch (err) {
                console.error("Error al guardar edición:", err);
                alert("Error al guardar cambios: " + err.message);
                btnGuardar.disabled = false;
                btnGuardar.innerText = '💾 Guardar Cambios';
            }
        });
    }

    renderVistaLectura();
    document.getElementById('docModal').style.display = 'flex';
}

function obtenerDocumentosSimulados() {
    return [
        {
            id: 'sim_1',
            nombre: 'farmaciaDB_auditoria_final',
            acceso: 'Personal',
            fecha_mod: new Date().toISOString(),
            contenido: {
                documentation: '# Auditoría de FarmaciaDB\nAnálisis heurístico completado con 100% de normalización.',
                pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
            }
        },
        {
            id: 'sim_2',
            nombre: 'tienda_ventas_nosql_doc',
            acceso: 'Personal',
            fecha_mod: new Date(Date.now() - 86400000).toISOString(),
            contenido: {
                documentation: '# Análisis NoSQL de Ventas\nEstructuras de colecciones indexadas de forma óptima.',
                pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
            }
        }
    ];
}

function obtenerPapeleraSimulada() {
    return [
        {
            id: 'trash_sim_1',
            nombre: 'borrador_esquema_antiguo',
            acceso: 'Personal',
            fecha_eliminacion: new Date(Date.now() - 172800000).toISOString(),
            contenido: { documentation: 'Borrador antiguo' }
        }
    ];
}

function escapeHtml(str) { if (!str) return ''; return str.replace(/[&<>]/g, m => m==='&'?'&amp;':m==='<'?'&lt;':'&gt;'); }

const timeoutPromise = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms));

async function cargarDocumentos() {
    if (!isUuid(userId)) {
        console.warn("userId no es un UUID válido. Cargando documentos simulados.");
        return obtenerDocumentosSimulados();
    }

    let data = [];
    try {
        const fetchPromise = supabaseClient.from('documentos').select('*').eq('usuario_id', userId).order('created_at', { ascending: false });
        const result = await Promise.race([fetchPromise, timeoutPromise(5000)]);
        if (result.error) console.error("Error al cargar documentos:", result.error);
        data = result.data || [];
    } catch (e) {
        console.warn("Carga de documentos de Supabase excedió tiempo límite o falló.");
    }
    
    return data;
}

async function cargarPapelera() {
    if (!isUuid(userId)) {
        console.warn("userId no es un UUID válido. Cargando papelera simulada.");
        return obtenerPapeleraSimulada();
    }

    let data = [];
    try {
        const fetchPromise = supabaseClient.from('papelera').select('*').eq('usuario_id', userId);
        const result = await Promise.race([fetchPromise, timeoutPromise(5000)]);
        if (result.error) console.error("Error al cargar papelera:", result.error);
        data = result.data || [];
    } catch (e) {
        console.warn("Carga de papelera de Supabase excedió tiempo límite o falló.");
    }
    
    return data;
}

async function moverAPapelera(id, nombre, acceso, contenido) {
    if (!isUuid(userId)) {
        alert("Operación no permitida en modo de demostración.");
        return;
    }
    await supabaseClient.from('papelera').insert([{ usuario_id: userId, nombre, acceso, fecha_eliminacion: new Date().toISOString(), contenido }]);
    await supabaseClient.from('documentos').delete().eq('id', id);
}

async function restaurarDocumento(papId, nombre, acceso, contenido) {
    if (!isUuid(userId)) {
        alert("Operación no permitida en modo de demostración.");
        return;
    }
    await supabaseClient.from('documentos').insert([{ usuario_id: userId, nombre, acceso, fecha_mod: new Date().toISOString(), contenido }]);
    await supabaseClient.from('papelera').delete().eq('id', papId);
}
async function eliminarPermanente(papId) { await supabaseClient.from('papelera').delete().eq('id', papId); }
async function limpiarPapelera() {
    const items = await cargarPapelera(); const ahora = new Date();
    for (const item of items) {
        const dias = (ahora - new Date(item.fecha_eliminacion)) / (86400000);
        if (dias >= 15) await eliminarPermanente(item.id);
    }
}

let activeDocsList = [];
let trashDocsList = [];

async function renderDocumentosActivos() {
    activeDocsList = await cargarDocumentos();
    const container = document.getElementById('documentosContainer');
    if (activeDocsList.length === 0) { 
        container.innerHTML = `<div class="seccion-tabla"><h2>📄 Documentos activos</h2><div class="empty-message">No hay documentos guardados.</div></div>`; 
        return; 
    }
    let html = `<div class="seccion-tabla"><h2>📄 Documentos activos</h2><table class="doc-table"><thead><tr><th>Nombre</th><th>Acceso</th><th>Fecha modificación</th><th>Acciones</th></tr></thead><tbody>`;
    activeDocsList.forEach((doc, idx) => {
        let fechaModStr = 'No disponible';
        if (doc.fecha_mod) {
            const dateObj = new Date(doc.fecha_mod);
            if (!isNaN(dateObj.getTime())) {
                fechaModStr = dateObj.toLocaleDateString();
            }
        }
        html += `<tr><td>${escapeHtml(doc.nombre)}</td><td>${escapeHtml(doc.acceso)}</td><td>${fechaModStr}</td><td class="action-buttons"><button class="view-doc" data-idx="${idx}">Ver</button><button class="edit-doc" data-idx="${idx}">Editar</button><button class="share-doc" data-idx="${idx}">Compartir</button><button class="delete-doc" data-idx="${idx}">Eliminar</button></td></tr>`;
    });
    html += `</tbody></table></div>`;
    container.innerHTML = html;

    document.querySelectorAll('.view-doc').forEach(btn => btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        const doc = activeDocsList[idx];
        abrirModalVisualizador(doc);
    }));

    document.querySelectorAll('.edit-doc').forEach(btn => btn.addEventListener('click', async () => {
        const idx = parseInt(btn.dataset.idx);
        const doc = activeDocsList[idx];
        const nuevo = prompt('Nuevo nombre:', doc.nombre);
        if (nuevo) {
            await supabase.from('documentos').update({ nombre: nuevo.trim() }).eq('id', doc.id);
            renderTodo();
        }
    }));

    document.querySelectorAll('.share-doc').forEach(btn => btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        const doc = activeDocsList[idx];
        mostrarModalCompartir(doc);
    }));

    document.querySelectorAll('.delete-doc').forEach(btn => btn.addEventListener('click', async () => {
        const idx = parseInt(btn.dataset.idx);
        const doc = activeDocsList[idx];
        if (confirm(`¿Mover "${doc.nombre}" a la papelera?`)) {
            await moverAPapelera(doc.id, doc.nombre, doc.acceso, doc.contenido);
            renderTodo();
        }
    }));
}

async function renderPapelera() {
    await limpiarPapelera();
    trashDocsList = await cargarPapelera();
    const container = document.getElementById('papeleraContainer');
    if (trashDocsList.length === 0) { 
        container.innerHTML = `<div class="seccion-tabla"><h2>🗑️ Papelera</h2><div class="empty-message">Papelera vacía.</div></div>`; 
        return; 
    }
    const ahora = new Date();
    let html = `<div class="seccion-tabla"><h2>🗑️ Papelera (eliminación tras 15 días)</h2><table class="doc-table"><thead><tr><th>Nombre</th><th>Eliminado el</th><th>Tiempo restante</th><th>Acciones</th></tr></thead><tbody>`;
    trashDocsList.forEach((item, idx) => {
        let fechaElimStr = 'No disponible';
        let restanteStr = '15 días';
        if (item.fecha_eliminacion) {
            const fechaElim = new Date(item.fecha_eliminacion);
            if (!isNaN(fechaElim.getTime())) {
                fechaElimStr = fechaElim.toLocaleDateString();
                const dias = Math.floor((ahora - fechaElim) / 86400000);
                restanteStr = `${Math.max(0, 15 - dias)} días`;
            }
        }
        html += `<tr><td>${escapeHtml(item.nombre)}</td><td>${fechaElimStr}</td><td>${restanteStr}</td><td class="action-buttons"><button class="restore-pap" data-idx="${idx}">Restaurar</button><button class="delete-perm" data-idx="${idx}">Eliminar definitivo</button></td></tr>`;
    });
    html += `</tbody></table></div>`;
    container.innerHTML = html;

    document.querySelectorAll('.restore-pap').forEach(btn => btn.addEventListener('click', async () => {
        const idx = parseInt(btn.dataset.idx);
        const item = trashDocsList[idx];
        await restaurarDocumento(item.id, item.nombre, item.acceso, item.contenido);
        renderTodo();
    }));

    document.querySelectorAll('.delete-perm').forEach(btn => btn.addEventListener('click', async () => {
        const idx = parseInt(btn.dataset.idx);
        const item = trashDocsList[idx];
        if (confirm(`¿Eliminar "${item.nombre}" permanentemente?`)) {
            await eliminarPermanente(item.id);
            renderTodo();
        }
    }));
}

async function renderTodo() {
    document.getElementById('documentosContainer').innerHTML = '<div class="loading">Cargando documentos...</div>';
    document.getElementById('papeleraContainer').innerHTML = '<div class="loading">Cargando papelera...</div>';
    await renderDocumentosActivos();
    await renderPapelera();
}

const modal = document.getElementById('docModal');
document.querySelector('.close-modal')?.addEventListener('click', () => { if (modal) modal.style.display = 'none'; });
window.addEventListener('click', (e) => { if (modal && e.target === modal) modal.style.display = 'none'; });
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    try {
        await supabaseClient.auth.signOut();
    } catch (err) {
        console.error('Error signing out:', err);
    }
    sessionStorage.clear();
    window.location.href = '/';
});

async function mostrarModalCompartir(doc) {
    if (doc.id.startsWith('sim_') || !isUuid(userId)) {
        alert("Esta función requiere estar autenticado con una cuenta real y tener documentos guardados en Supabase.");
        return;
    }
    
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = '<div class="loading">Cargando datos para compartir...</div>';
    document.getElementById('docModal').style.display = 'flex';
    
    try {
        // 1. Obtener todos los perfiles de usuario
        const { data: perfiles, error: perfError } = await supabaseClient
            .from('perfiles')
            .select('id, nombres, apellidos')
            .neq('id', userId); // Excluir al usuario actual
            
        if (perfError) throw perfError;
        
        // 2. Obtener usuarios con acceso actual al documento
        const { data: compartidos, error: compError } = await supabaseClient
            .from('compartidos')
            .select('id, usuario_compartido_id')
            .eq('documento_id', doc.id);
            
        if (compError) throw compError;
        
        // Renderizar la UI del modal de compartir
        let userOptions = perfiles.map(p => `<option value="${p.id}">${escapeHtml(p.nombres)} ${escapeHtml(p.apellidos)}</option>`).join('');
        if (perfiles.length === 0) {
            userOptions = `<option value="">No hay otros usuarios registrados</option>`;
        }
        
        const compartidosConNombre = compartidos.map(c => {
            const perfil = perfiles.find(p => p.id === c.usuario_compartido_id);
            return {
                id: c.id,
                nombreCompleto: perfil ? `${perfil.nombres} ${perfil.apellidos}` : 'Usuario desconocido'
            };
        });
        
        let sharedListHtml = compartidosConNombre.map(c => `
            <div class="shared-user-item">
                <span class="shared-user-name">👤 ${escapeHtml(c.nombreCompleto)}</span>
                <button class="revoke-share-btn" data-share-id="${c.id}">Quitar acceso</button>
            </div>
        `).join('');
        
        if (compartidosConNombre.length === 0) {
            sharedListHtml = '<div class="empty-message" style="padding:15px; font-size:0.85rem;">Este documento aún no ha sido compartido.</div>';
        }
        
        modalBody.innerHTML = `
            <div class="share-modal-container">
                <h3 class="share-modal-title">Compartir Documento</h3>
                <p style="margin-bottom: 20px; font-size: 0.95rem; color: #9ca3af;">
                    Documento: <strong style="color: #f3f4f6;">${escapeHtml(doc.nombre)}</strong>
                </p>
                
                <div class="share-form">
                    <select id="shareUserSelect" class="share-select" ${perfiles.length === 0 ? 'disabled' : ''}>
                        ${userOptions}
                    </select>
                    <button id="btnConcederAcceso" class="share-submit-btn" ${perfiles.length === 0 ? 'disabled' : ''}>
                        Conceder Acceso
                    </button>
                </div>
                
                <h4 class="shared-list-title">Usuarios con acceso:</h4>
                <div class="shared-users-list">
                    ${sharedListHtml}
                </div>
            </div>
        `;
        
        document.getElementById('btnConcederAcceso')?.addEventListener('click', async () => {
            const selectEl = document.getElementById('shareUserSelect');
            const targetUserId = selectEl.value;
            if (!targetUserId) return;
            
            const btn = document.getElementById('btnConcederAcceso');
            btn.disabled = true;
            btn.innerText = 'Compartiendo...';
            
            try {
                const { error } = await supabaseClient.from('compartidos').insert([
                    {
                        documento_id: doc.id,
                        usuario_compartido_id: targetUserId
                    }
                ]);
                if (error) {
                    if (error.code === '23505') {
                        alert('Este documento ya está compartido con ese usuario.');
                    } else {
                        throw error;
                    }
                } else {
                    mostrarModalCompartir(doc);
                }
            } catch (err) {
                console.error(err);
                alert('Error al compartir: ' + err.message);
            } finally {
                btn.disabled = false;
                btn.innerText = 'Conceder Acceso';
            }
        });
        
        document.querySelectorAll('.revoke-share-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const shareId = btn.dataset.shareId;
                if (!shareId) return;
                
                btn.disabled = true;
                btn.innerText = 'Quitando...';
                
                try {
                    const { error } = await supabaseClient.from('compartidos').delete().eq('id', shareId);
                    if (error) throw error;
                    mostrarModalCompartir(doc);
                } catch (err) {
                    console.error(err);
                    alert('Error al revocar acceso: ' + err.message);
                    btn.disabled = false;
                    btn.innerText = 'Quitar acceso';
                }
            });
        });
        
    } catch (err) {
        console.error("Error al cargar modal de compartir:", err);
        modalBody.innerHTML = `<div class="empty-message" style="color: #f87171;">⚠️ Error al cargar: ${escapeHtml(err.message)}</div>`;
    }
}

renderTodo();