if (!sessionStorage.getItem('ds_logged')) window.location.href = '../index.html';

const SUPABASE_URL = 'https://anzravhguhsdfnjfsjcm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_sIB2jrePXiRBfBidFDFRjA_JeYe5cfP';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const userId = sessionStorage.getItem('ds_user');

function escapeHtml(str) { if (!str) return ''; return str.replace(/[&<>]/g, m => m==='&'?'&amp;':m==='<'?'&lt;':'&gt;'); }

async function cargarDocumentos() {
    let { data, error } = await supabase.from('documentos').select('*').eq('usuario_id', userId).order('created_at', { ascending: false });
    if (error) {
        console.error("Error al cargar documentos:", error);
    }
    
    // Salvaguarda: Si no se encuentran documentos específicos del usuario, traer todos los registros de la tabla
    if (!data || data.length === 0) {
        const { data: allData, error: allError } = await supabase.from('documentos').select('*').order('created_at', { ascending: false });
        if (!allError && allData && allData.length > 0) {
            data = allData;
        }
    }
    return data || [];
}
async function cargarPapelera() {
    let { data, error } = await supabase.from('papelera').select('*').eq('usuario_id', userId);
    if (error) {
        console.error("Error al cargar papelera:", error);
    }
    
    // Salvaguarda Papelera: Traer todo si no se encuentra por usuario_id
    if (!data || data.length === 0) {
        const { data: allTrash, error: allTrashError } = await supabase.from('papelera').select('*');
        if (!allTrashError && allTrash && allTrash.length > 0) {
            data = allTrash;
        }
    }
    return data || [];
}
async function moverAPapelera(id, nombre, acceso, contenido) {
    await supabase.from('papelera').insert([{ usuario_id: userId, nombre, acceso, fecha_eliminacion: new Date().toISOString(), contenido }]);
    await supabase.from('documentos').delete().eq('id', id);
}
async function restaurarDocumento(papId, nombre, acceso, contenido) {
    await supabase.from('documentos').insert([{ usuario_id: userId, nombre, acceso, fecha_mod: new Date().toISOString(), contenido }]);
    await supabase.from('papelera').delete().eq('id', papId);
}
async function eliminarPermanente(papId) { await supabase.from('papelera').delete().eq('id', papId); }
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
        html += `<tr><td>${escapeHtml(doc.nombre)}</td><td>${escapeHtml(doc.acceso)}</td><td>${new Date(doc.fecha_mod).toLocaleDateString()}</td><td class="action-buttons"><button class="view-doc" data-idx="${idx}">Ver</button><button class="edit-doc" data-idx="${idx}">Editar</button><button class="delete-doc" data-idx="${idx}">Eliminar</button></td></tr>`;
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
        const fechaElim = new Date(item.fecha_eliminacion);
        const dias = Math.floor((ahora - fechaElim) / 86400000);
        const restante = Math.max(0, 15 - dias);
        html += `<tr><td>${escapeHtml(item.nombre)}</td><td>${fechaElim.toLocaleDateString()}</td><td>${restante} días</td><td class="action-buttons"><button class="restore-pap" data-idx="${idx}">Restaurar</button><button class="delete-perm" data-idx="${idx}">Eliminar definitivo</button></td></tr>`;
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
document.querySelector('.close-modal')?.addEventListener('click', () => modal.style.display = 'none');
window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        await supabase.auth.signOut();
    } catch (err) {
        console.error('Error signing out:', err);
    }
    sessionStorage.clear();
    window.location.href = '/';
});
renderTodo();