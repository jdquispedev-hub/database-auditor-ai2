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
        
        // Manejar de forma robusta si es un objeto o un String JSONB
        let contenido = doc.contenido || {};
        if (typeof contenido === 'string') {
            try {
                contenido = JSON.parse(contenido);
            } catch (e) {
                console.error("Error al parsear contenido JSON string:", e);
                contenido = {};
            }
        }

        let modalHtml = '';
        if (contenido.pdfUrl || contenido.pdfBase64) {
            const fileLink = contenido.pdfUrl || contenido.pdfBase64;
            const isStorage = !!contenido.pdfUrl;
            modalHtml = `
                <div class="pdf-modal-view" style="color: #fff; font-family: 'Outfit', sans-serif;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
                        <h3 style="font-size: 1.4rem; color: #a78bfa; margin: 0;">📄 ${escapeHtml(doc.nombre)}</h3>
                        <a href="${fileLink}" target="_blank" download="${doc.nombre}.pdf" class="action-btn" style="text-decoration: none; display: inline-flex; align-items: center; background: linear-gradient(135deg, #a78bfa, #5e6ad2); color: #fff; padding: 10px 18px; border-radius: 30px; font-weight: 600; font-size: 0.85rem; box-shadow: 0 4px 15px rgba(94, 106, 210, 0.4); border: none; cursor: pointer; transition: transform 0.2s;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right: 6px;">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            Descargar PDF
                        </a>
                    </div>
                    <p style="color: #9ca3af; margin-bottom: 15px; font-size: 0.9rem;">
                        ${isStorage ? 'Este documento cuenta con un PDF almacenado de forma segura en Supabase Storage.' : 'Este documento cuenta con un PDF generado.'}
                    </p>
                    
                    <!-- Visor de PDF Integrado en Tiempo Real -->
                    <div style="border-radius: 12px; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.15); background: #1e1e2e; margin-bottom: 15px; box-shadow: inset 0 2px 8px rgba(0,0,0,0.5);">
                        <iframe src="${fileLink}" style="width: 100%; height: 500px; border: none; display: block;"></iframe>
                    </div>

                    <hr style="border: 1px solid rgba(255,255,255,0.1); margin: 20px 0;">
                    <h4 style="margin-bottom: 8px; color: #a78bfa;">Metadatos del Esquema (JSON):</h4>
                    <pre style="background: rgba(0,0,0,0.4); padding: 12px; border-radius: 8px; overflow: auto; max-height: 150px; color: #9ca3af; font-size: 0.8rem; border: 1px solid rgba(255,255,255,0.1); font-family: monospace;">${JSON.stringify({ ...contenido, pdfBase64: contenido.pdfBase64 ? '[PDF Base64 Content]' : undefined }, null, 2)}</pre>
                </div>
            `;
        } else {
            modalHtml = `<pre style="color: #fff;">${JSON.stringify(contenido, null, 2)}</pre>`;
        }
        document.getElementById('modalBody').innerHTML = modalHtml;
        document.getElementById('docModal').style.display = 'flex';
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