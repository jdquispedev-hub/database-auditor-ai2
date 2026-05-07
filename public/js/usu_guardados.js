if (!sessionStorage.getItem('ds_logged')) window.location.href = '../index.html';

const SUPABASE_URL = 'https://anzravhguhsdfnjfsjcm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_sIB2jrePXiRBfBidFDFRjA_JeYe5cfP';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const userId = sessionStorage.getItem('ds_user');

function escapeHtml(str) { if (!str) return ''; return str.replace(/[&<>]/g, m => m==='&'?'&amp;':m==='<'?'&lt;':'&gt;'); }

async function cargarDocumentos() {
    const { data, error } = await supabase.from('documentos').select('*').eq('usuario_id', userId).order('created_at', { ascending: false });
    if (error) console.error(error);
    return data || [];
}
async function cargarPapelera() {
    const { data, error } = await supabase.from('papelera').select('*').eq('usuario_id', userId);
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

async function renderDocumentosActivos() {
    const docs = await cargarDocumentos();
    const container = document.getElementById('documentosContainer');
    if (docs.length === 0) { container.innerHTML = `<div class="seccion-tabla"><h2>📄 Documentos activos</h2><div class="empty-message">No hay documentos guardados.</div></div>`; return; }
    let html = `<div class="seccion-tabla"><h2>📄 Documentos activos</h2><table class="doc-table"><thead><tr><th>Nombre</th><th>Acceso</th><th>Fecha modificación</th><th>Acciones</th></tr></thead><tbody>`;
    for (const doc of docs) {
        html += `<tr><td>${escapeHtml(doc.nombre)}</td><td>${escapeHtml(doc.acceso)}</td><td>${new Date(doc.fecha_mod).toLocaleDateString()}</td><td class="action-buttons"><button class="view-doc" data-contenido='${JSON.stringify(doc.contenido)}'>Ver</button><button class="edit-doc" data-id="${doc.id}" data-nombre="${escapeHtml(doc.nombre)}">Editar</button><button class="delete-doc" data-id="${doc.id}" data-nombre="${escapeHtml(doc.nombre)}" data-acceso="${escapeHtml(doc.acceso)}" data-contenido='${JSON.stringify(doc.contenido)}'>Eliminar</button></td></tr>`;
    }
    html += `</tbody></table></div>`;
    container.innerHTML = html;
    document.querySelectorAll('.view-doc').forEach(btn => btn.addEventListener('click', () => { document.getElementById('modalBody').innerHTML = `<pre>${JSON.stringify(JSON.parse(btn.dataset.contenido), null, 2)}</pre>`; document.getElementById('docModal').style.display = 'flex'; }));
    document.querySelectorAll('.edit-doc').forEach(btn => btn.addEventListener('click', async () => { const nuevo = prompt('Nuevo nombre:', btn.dataset.nombre); if (nuevo) await supabase.from('documentos').update({ nombre: nuevo.trim() }).eq('id', btn.dataset.id); renderTodo(); }));
    document.querySelectorAll('.delete-doc').forEach(btn => btn.addEventListener('click', async () => { if (confirm('Mover a papelera?')) await moverAPapelera(btn.dataset.id, btn.dataset.nombre, btn.dataset.acceso, JSON.parse(btn.dataset.contenido)); renderTodo(); }));
}

async function renderPapelera() {
    await limpiarPapelera();
    const items = await cargarPapelera();
    const container = document.getElementById('papeleraContainer');
    if (items.length === 0) { container.innerHTML = `<div class="seccion-tabla"><h2>🗑️ Papelera</h2><div class="empty-message">Papelera vacía.</div></div>`; return; }
    const ahora = new Date();
    let html = `<div class="seccion-tabla"><h2>🗑️ Papelera (eliminación tras 15 días)</h2><table class="doc-table"><thead><tr><th>Nombre</th><th>Eliminado el</th><th>Tiempo restante</th><th>Acciones</th></tr></thead><tbody>`;
    for (const item of items) {
        const fechaElim = new Date(item.fecha_eliminacion);
        const dias = Math.floor((ahora - fechaElim) / 86400000);
        const restante = Math.max(0, 15 - dias);
        html += `<tr><td>${escapeHtml(item.nombre)}</td><td>${fechaElim.toLocaleDateString()}</td><td>${restante} días</td><td class="action-buttons"><button class="restore-pap" data-id="${item.id}" data-nombre="${escapeHtml(item.nombre)}" data-acceso="${escapeHtml(item.acceso)}" data-contenido='${JSON.stringify(item.contenido)}'>Restaurar</button><button class="delete-perm" data-id="${item.id}">Eliminar definitivo</button></td></tr>`;
    }
    html += `</tbody></table></div>`;
    container.innerHTML = html;
    document.querySelectorAll('.restore-pap').forEach(btn => btn.addEventListener('click', async () => { await restaurarDocumento(btn.dataset.id, btn.dataset.nombre, btn.dataset.acceso, JSON.parse(btn.dataset.contenido)); renderTodo(); }));
    document.querySelectorAll('.delete-perm').forEach(btn => btn.addEventListener('click', async () => { if (confirm('Eliminar permanentemente?')) await eliminarPermanente(btn.dataset.id); renderTodo(); }));
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
document.getElementById('logoutBtn').addEventListener('click', async () => { await supabase.auth.signOut(); sessionStorage.clear(); window.location.href = '../index.html'; });
renderTodo();