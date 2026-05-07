// Verificar sesión
if (!sessionStorage.getItem('ds_logged')) {
    window.location.href = '../index.html';
}

const SUPABASE_URL = 'https://anzravhguhsdfnjfsjcm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_sIB2jrePXiRBfBidFDFRjA_JeYe5cfP';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const userId = sessionStorage.getItem('ds_user');
let chartInstance = null;

async function cargarDocumentos() {
    const { data, error } = await supabase.from('documentos').select('*').eq('usuario_id', userId);
    if (error) console.error(error);
    return data || [];
}

async function actualizarDashboard() {
    const docs = await cargarDocumentos();
    const total = docs.length;
    let antiguedad = 0;
    if (total > 0) {
        const fechas = docs.map(d => new Date(d.created_at));
        const masAntiguo = new Date(Math.min(...fechas));
        antiguedad = Math.floor((new Date() - masAntiguo) / (86400000));
    }
    document.getElementById('totalDocs').innerText = total;
    document.getElementById('antiguedad').innerText = antiguedad;

    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const counts = new Array(12).fill(0);
    docs.forEach(doc => { counts[new Date(doc.created_at).getMonth()]++; });
    const ctx = document.getElementById('actividadChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels: meses, datasets: [{ label: 'Documentos creados', data: counts, borderColor: '#a78bfa', backgroundColor: 'rgba(167,139,250,0.1)', fill: true }] }
    });
    const msgDiv = document.getElementById('mensajeInfo');
    if (total === 0) { msgDiv.style.display = 'block'; msgDiv.innerText = '⚠️ No hay documentos. Genera uno desde "Generar documento".'; }
    else { msgDiv.style.display = 'none'; }
}

document.getElementById('verGuardadosLink').addEventListener('click', () => window.location.href = 'usu_guardados.html');
document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        await supabase.auth.signOut();
    } catch (err) {
        console.error('Error signing out:', err);
    }
    sessionStorage.clear();
    window.location.href = '/';
});
actualizarDashboard();