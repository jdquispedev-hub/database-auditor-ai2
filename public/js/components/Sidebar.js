/**
 * DataScript AI - Shared Sidebar Web Component
 * Standard Web Component for unified navigation and styles.
 */

class AppSidebar extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        const activePage = this.getAttribute('active-page') || 'dashboard';
        
        this.innerHTML = `
            <aside class="sidebar">
                <div class="logo-sidebar">DataScript AI</div>
                
                <a href="usu_panel.html" class="menu-item ${activePage === 'dashboard' ? 'active' : ''}">
                    <svg class="menu-icon-svg" width="20" height="20" viewBox="0 0 24 24">
                        <rect x="3" y="3" width="7" height="9" rx="1"></rect>
                        <rect x="14" y="3" width="7" height="5" rx="1"></rect>
                        <rect x="14" y="12" width="7" height="9" rx="1"></rect>
                        <rect x="3" y="16" width="7" height="5" rx="1"></rect>
                    </svg>
                    Dashboard
                </a>
                
                <a href="usu_generar.html" class="menu-item ${activePage === 'generar' ? 'active' : ''}">
                    <svg class="menu-icon-svg" width="20" height="20" viewBox="0 0 24 24">
                        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path>
                        <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"></path>
                    </svg>
                    Generar documento
                </a>
                
                <a href="usu_guardados.html" class="menu-item ${activePage === 'guardados' ? 'active' : ''}">
                    <svg class="menu-icon-svg" width="20" height="20" viewBox="0 0 24 24">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                    </svg>
                    Documentos guardados
                </a>

                <a href="usu_compartidos.html" class="menu-item ${activePage === 'compartidos' ? 'active' : ''}">
                    <svg class="menu-icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                    Compartidos conmigo
                </a>
                
                <div class="menu-item logout" id="logoutBtn" onclick="logoutSession()">
                    <svg class="menu-icon-svg" width="20" height="20" viewBox="0 0 24 24">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    Cerrar Sesión
                </div>
            </aside>
        `;
    }
}

customElements.define('app-sidebar', AppSidebar);
