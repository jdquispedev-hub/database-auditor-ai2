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
        const { data, error } = await supabase
            .from('documentos')
            .select('*')
            .eq('usuario_id', userId)
            .order('created_at', { ascending: true });
        if (error) console.error(error);
        return data || [];
    }

    async function renderDashboard() {
        const docs = await cargarDocumentos();
        const totalDocs = docs.length;

        // Calcular antigüedad en días (desde el documento más antiguo hasta hoy)
        let antiguedad = 0;
        if (docs.length > 0) {
            const fechas = docs.map(d => new Date(d.created_at));
            const masAntiguo = new Date(Math.min(...fechas));
            const hoy = new Date();
            antiguedad = Math.floor((hoy - masAntiguo) / (1000 * 60 * 60 * 24));
        }

        // Preparar datos para el gráfico (por mes)
        const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const counts = new Array(12).fill(0);
        docs.forEach(doc => {
            const mes = new Date(doc.created_at).getMonth();
            counts[mes]++;
        });

        const html = `
            <div class="cards-grid">
                <div class="stat-card">
                    <h3>Número de documentos</h3>
                    <div class="stat-number">${totalDocs}</div>
                    <span class="ingresar-link" data-view="guardados">Ingresar >></span>
                </div>
                <div class="stat-card">
                    <h3>Espacios de trabajo</h3>
                    <div class="stat-number">2</div>
                    <span class="ingresar-link">Ingresar >></span>
                </div>
                <div class="stat-card">
                    <h3>Antigüedad (días)</h3>
                    <div class="stat-number">${antiguedad}</div>
                    <span class="ingresar-link">Ingresar >></span>
                </div>
            </div>
            <div class="chart-container">
                <h3>Actividad mensual - Documentos creados</h3>
                <canvas id="activityChart"></canvas>
            </div>
        `;
        document.getElementById('dynamicView').innerHTML = html;

        // Dibujar gráfico
        const ctx = document.getElementById('activityChart')?.getContext('2d');
        if (ctx && typeof Chart !== 'undefined') {
            if (chartInstance) chartInstance.destroy();
            chartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: meses,
                    datasets: [{
                        label: 'Documentos',
                        data: counts,
                        backgroundColor: 'rgba(167, 139, 250, 0.7)',
                        borderColor: '#a78bfa',
                        borderWidth: 1,
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: '#2d3a5e' },
                            ticks: { stepSize: 1, color: '#cbd5e1' }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { color: '#cbd5e1' }
                        }
                    },
                    plugins: {
                        legend: { labels: { color: '#eef2ff' } }
                    }
                }
            });
        }

        // Evento para el enlace "Ingresar >>" que lleva a documentos guardados
        document.querySelectorAll('.ingresar-link[data-view="guardados"]').forEach(el => {
            el.addEventListener('click', () => {
                window.location.href = 'documentos-guardados.html';
            });
        });
    }

    // Cerrar sesión
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await supabase.auth.signOut();
        sessionStorage.clear();
        window.location.href = '../index.html';
    });

    renderDashboard();